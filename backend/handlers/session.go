package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"backend/models"
	"backend/utils"
	"backend/websocket"
	"fmt"

	"github.com/gorilla/mux"
	gorillaws "github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func CleanupOldSessions() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	thirtyMinutesAgo := time.Now().Add(-30 * time.Minute)

	result, err := utils.SessionColl.DeleteMany(ctx, bson.M{
		"lastActivity": bson.M{"$lt": thirtyMinutesAgo},
	})

	if err != nil {
		fmt.Printf("[CLEANUP][ERROR] Eski session'lar temizlenemedi: %v\n", err)
	} else {
		fmt.Printf("[CLEANUP][INFO] %d eski session temizlendi\n", result.DeletedCount)
	}
}

func CleanupUserSessions(userID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := utils.SessionColl.Find(ctx, bson.M{
		"userId": userID,
		"status": bson.M{"$in": []string{"active", "waiting_for_agent"}},
	})
	if err != nil {
		return
	}
	defer cursor.Close(ctx)

	var sessions []models.Session
	for cursor.Next(ctx) {
		var session models.Session
		if err := cursor.Decode(&session); err == nil {
			sessions = append(sessions, session)
		}
	}

	if len(sessions) > 1 {
		var latestSession models.Session
		for _, session := range sessions {
			if session.LastActivity.After(latestSession.LastActivity) {
				latestSession = session
			}
		}

		for _, session := range sessions {
			if session.ID != latestSession.ID {
				utils.SessionColl.DeleteOne(ctx, bson.M{"_id": session.ID})
				fmt.Printf("[CLEANUP][INFO] User %s için eski session silindi: %s\n", userID, session.ID.Hex())
			}
		}
	}
}

func StartSessionHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		UserID  string `json:"userId"`
		AgentID string `json:"agentId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.UserID == "" {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	CleanupUserSessions(body.UserID)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existingSession models.Session
	err := utils.SessionColl.FindOne(ctx, bson.M{
		"userId": body.UserID,
		"status": bson.M{"$in": []string{"active", "waiting_for_agent"}},
	}).Decode(&existingSession)

	if err == nil {
		fmt.Printf("[SESSION][INFO] Önceki session bulundu: %s, Agent: %s, Mode: %s\n",
			existingSession.ID.Hex(), existingSession.AssignedAgent, existingSession.Mode)

		if existingSession.Mode == "human" && existingSession.AssignedAgent != "System" {
			agentObjId, _ := primitive.ObjectIDFromHex(existingSession.AssignedAgent)
			var agent models.Agent
			agentErr := utils.AgentColl.FindOne(ctx, bson.M{"_id": agentObjId, "status": "available"}).Decode(&agent)

			if agentErr == nil {
				_, updateErr := utils.SessionColl.UpdateOne(ctx,
					bson.M{"_id": existingSession.ID},
					bson.M{"$set": bson.M{
						"lastActivity": time.Now(),
						"status":       "active",
					}},
				)
				if updateErr != nil {
					fmt.Printf("[SESSION][ERROR] Session güncellenemedi: %v\n", updateErr)
				}

				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]string{
					"sessionId":     existingSession.ID.Hex(),
					"assignedAgent": existingSession.AssignedAgent,
					"mode":          existingSession.Mode,
					"status":        "continued",
				})
				return
			} else {
				fmt.Printf("[SESSION][INFO] Agent %s artık uygun değil, sistem devreye giriyor\n", existingSession.AssignedAgent)
				_, updateErr := utils.SessionColl.UpdateOne(ctx,
					bson.M{"_id": existingSession.ID},
					bson.M{"$set": bson.M{
						"assignedAgent": "System",
						"mode":          "system",
						"status":        "active",
						"lastActivity":  time.Now(),
					}},
				)
				if updateErr != nil {
					fmt.Printf("[SESSION][ERROR] Session sistem transfer edilemedi: %v\n", updateErr)
				}

				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]string{
					"sessionId":     existingSession.ID.Hex(),
					"assignedAgent": "System",
					"mode":          "system",
					"status":        "transferred_to_system",
				})
				return
			}
		} else if existingSession.Mode == "system" {
			_, updateErr := utils.SessionColl.UpdateOne(ctx,
				bson.M{"_id": existingSession.ID},
				bson.M{"$set": bson.M{
					"lastActivity": time.Now(),
					"status":       "active",
				}},
			)
			if updateErr != nil {
				fmt.Printf("[SESSION][ERROR] Sistem session güncellenemedi: %v\n", updateErr)
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"sessionId":     existingSession.ID.Hex(),
				"assignedAgent": existingSession.AssignedAgent,
				"mode":          existingSession.Mode,
				"status":        "continued_system",
			})
			return
		}
	}

	assigned := "System"
	mode := "system"
	status := "active"

	if body.AgentID != "" {
		agentObjId, _ := primitive.ObjectIDFromHex(body.AgentID)
		assigned = body.AgentID
		mode = "human"
		_, err := utils.AgentColl.UpdateOne(ctx, bson.M{"_id": agentObjId}, bson.M{"$set": bson.M{"status": "busy"}})
		if err != nil {
			fmt.Printf("[SESSION][ERROR] Agent status 'busy' yapılamadı: %v\n", err)
		} else {
			fmt.Printf("[SESSION][OK] Agent doğrudan atandı ve status 'busy': %s\n", body.AgentID)
		}
	} else {
		fmt.Printf("[SESSION][INFO] Agent talep edilmedi, sistem modunda başlatılıyor.\n")
	}

	session := models.Session{
		UserID:        body.UserID,
		AssignedAgent: assigned,
		Mode:          mode,
		Status:        status,
		CreatedAt:     time.Now(),
		LastActivity:  time.Now(),
	}
	res, err := utils.SessionColl.InsertOne(ctx, session)
	if err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	session.ID = res.InsertedID.(primitive.ObjectID)
	sessionData := map[string]interface{}{
		"sessionId":     session.ID.Hex(),
		"userId":        session.UserID,
		"assignedAgent": session.AssignedAgent,
		"mode":          session.Mode,
		"status":        session.Status,
		"lastActivity":  session.LastActivity,
	}
	websocket.BroadcastNewSession(sessionData)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"sessionId":     res.InsertedID.(primitive.ObjectID).Hex(),
		"assignedAgent": assigned,
		"mode":          mode,
		"status":        "new",
	})
}

func TransferToAgentHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		SessionID string `json:"sessionId"`
		AgentID   string `json:"agentId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.SessionID == "" || body.AgentID == "" {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	sessionObjId, err := primitive.ObjectIDFromHex(body.SessionID)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	agentObjId, err := primitive.ObjectIDFromHex(body.AgentID)
	if err != nil {
		http.Error(w, "Invalid agent ID", http.StatusBadRequest)
		return
	}

	var agent models.Agent
	err = utils.AgentColl.FindOne(ctx, bson.M{"_id": agentObjId, "status": "available"}).Decode(&agent)
	if err != nil {
		http.Error(w, "Agent not available", http.StatusBadRequest)
		return
	}

	_, err = utils.SessionColl.UpdateOne(ctx,
		bson.M{"_id": sessionObjId},
		bson.M{"$set": bson.M{
			"assignedAgent": body.AgentID,
			"mode":          "human",
			"status":        "active",
			"lastActivity":  time.Now(),
		}},
	)
	if err != nil {
		http.Error(w, "Failed to transfer session", http.StatusInternalServerError)
		return
	}

	_, err = utils.AgentColl.UpdateOne(ctx,
		bson.M{"_id": agentObjId},
		bson.M{"$set": bson.M{"status": "busy"}},
	)
	if err != nil {
		fmt.Printf("[TRANSFER][ERROR] Agent status 'busy' yapılamadı: %v\n", err)
	}

	var sessionData models.Session
	utils.SessionColl.FindOne(ctx, bson.M{"_id": sessionObjId}).Decode(&sessionData)

	userConn := websocket.GetUserConn(sessionData.UserID)
	if userConn != nil {
		userNotification := map[string]interface{}{
			"sender":        "system",
			"mode":          "human",
			"status":        "active",
			"assignedAgent": body.AgentID,
		}
		jsonData, _ := json.Marshal(userNotification)
		userConn.WriteMessage(gorillaws.TextMessage, jsonData)
		fmt.Printf("[TRANSFER] Notified user %s about agent assignment", sessionData.UserID)
	}

	var messages []models.Message
	messageCursor, err := utils.MessageColl.Find(ctx, bson.M{"sessionId": sessionObjId})
	if err == nil {
		defer messageCursor.Close(ctx)
		for messageCursor.Next(ctx) {
			var msg models.Message
			if err := messageCursor.Decode(&msg); err == nil {
				messages = append(messages, msg)
			}
		}
	}

	var user struct {
		ID    primitive.ObjectID `bson:"_id,omitempty"`
		Name  string             `bson:"name"`
		Email string             `bson:"email"`
	}

	utils.MongoDB.Collection("users").FindOne(ctx, bson.M{"email": sessionData.UserID}).Decode(&user)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":   "Session successfully transferred to agent",
		"sessionId": body.SessionID,
		"agentId":   body.AgentID,
		"messages":  messages,
		"userInfo": map[string]interface{}{
			"name":  user.Name,
			"email": user.Email,
		},
	})
}

func GetAgentSessionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	vars := mux.Vars(r)
	agentId := vars["agentId"]
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := utils.SessionColl.Find(ctx, bson.M{
		"assignedAgent": agentId,
		"mode":          "human",
	})
	if err != nil {
		http.Error(w, "Failed to fetch sessions", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	sessions := []map[string]interface{}{}
	for cursor.Next(ctx) {
		var s models.Session
		if err := cursor.Decode(&s); err == nil {
			sessions = append(sessions, map[string]interface{}{
				"sessionId":    s.ID.Hex(),
				"userId":       s.UserID,
				"mode":         s.Mode,
				"status":       s.Status,
				"createdAt":    s.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
				"lastActivity": s.LastActivity.Format("2006-01-02T15:04:05Z07:00"),
			})
		}
	}

	for i := 0; i < len(sessions)-1; i++ {
		for j := i + 1; j < len(sessions); j++ {
			timeIStr := sessions[i]["lastActivity"].(string)
			timeJStr := sessions[j]["lastActivity"].(string)
			if timeIStr < timeJStr {
				sessions[i], sessions[j] = sessions[j], sessions[i]
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sessions": sessions})
}

func GetSessionInfoHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	sessionId := r.URL.Query().Get("sessionId")
	if sessionId == "" {
		w.Header().Set("Content-Type", "application/json")
		http.Error(w, `{"error":"sessionId required"}`, http.StatusBadRequest)
		return
	}
	objId, err := primitive.ObjectIDFromHex(sessionId)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		http.Error(w, `{"error":"Invalid sessionId"}`, http.StatusBadRequest)
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var session models.Session
	err = utils.SessionColl.FindOne(ctx, bson.M{"_id": objId}).Decode(&session)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		http.Error(w, `{"error":"Session not found"}`, http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mode":          session.Mode,
		"assignedAgent": session.AssignedAgent,
	})
}

func EndSessionHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		SessionID string `json:"sessionId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.SessionID == "" {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	sessionObjId, err := primitive.ObjectIDFromHex(body.SessionID)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	var session models.Session
	err = utils.SessionColl.FindOne(ctx, bson.M{"_id": sessionObjId}).Decode(&session)
	if err != nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	_, err = utils.SessionColl.UpdateOne(ctx,
		bson.M{"_id": sessionObjId},
		bson.M{"$set": bson.M{
			"status":       "completed",
			"lastActivity": time.Now(),
		}},
	)
	if err != nil {
		http.Error(w, "Failed to end session", http.StatusInternalServerError)
		return
	}

	if session.AssignedAgent != "System" && session.AssignedAgent != "" {
		agentObjId, _ := primitive.ObjectIDFromHex(session.AssignedAgent)
		utils.AgentColl.UpdateOne(ctx, bson.M{"_id": agentObjId}, bson.M{"$set": bson.M{"status": "available"}})
	}

	websocket.NotifySessionEnded(body.SessionID)

	websocket.BroadcastSessionEnd(body.SessionID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Session ended successfully",
	})
}

func GetUserActiveSessionHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "userId required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var session models.Session
	err := utils.SessionColl.FindOne(ctx, bson.M{
		"userId": userID,
		"status": bson.M{"$in": []string{"active", "waiting_for_agent"}},
	}).Decode(&session)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"hasActiveSession": false,
			"session":          nil,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"hasActiveSession": true,
		"session": map[string]interface{}{
			"sessionId":     session.ID.Hex(),
			"mode":          session.Mode,
			"status":        session.Status,
			"assignedAgent": session.AssignedAgent,
			"createdAt":     session.CreatedAt,
			"lastActivity":  session.LastActivity,
		},
	})
}

func GetUserSessionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	vars := mux.Vars(r)
	userID := vars["userId"]

	if userID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	status := r.URL.Query().Get("status")

	filter := bson.M{
		"userId": userID,
	}

	if status != "" {
		filter["status"] = status
	} else {
		thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
		filter["lastActivity"] = bson.M{"$gte": thirtyDaysAgo}
	}

	cursor, err := utils.SessionColl.Find(ctx, filter)
	if err != nil {
		http.Error(w, "Failed to fetch sessions", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var sessions []map[string]interface{}
	for cursor.Next(ctx) {
		var session models.Session
		if err := cursor.Decode(&session); err == nil {
			var lastMessage string
			messageCursor, err := utils.MessageColl.Find(ctx, bson.M{
				"sessionId": session.ID,
			})

			if err == nil {
				var messages []models.Message
				for messageCursor.Next(ctx) {
					var message models.Message
					if err := messageCursor.Decode(&message); err == nil {
						messages = append(messages, message)
					}
				}
				messageCursor.Close(ctx)

				if len(messages) > 0 {
					var latestMessage models.Message
					for _, msg := range messages {
						if msg.Timestamp.After(latestMessage.Timestamp) {
							latestMessage = msg
						}
					}
					lastMessage = latestMessage.Text
				}
			}

			sessions = append(sessions, map[string]interface{}{
				"sessionId":     session.ID.Hex(),
				"userId":        session.UserID,
				"mode":          session.Mode,
				"status":        session.Status,
				"assignedAgent": session.AssignedAgent,
				"createdAt":     session.CreatedAt,
				"lastActivity":  session.LastActivity,
				"lastMessage":   lastMessage,
			})
		}
	}

	for i := 0; i < len(sessions)-1; i++ {
		for j := i + 1; j < len(sessions); j++ {
			timeI := sessions[i]["lastActivity"].(time.Time)
			timeJ := sessions[j]["lastActivity"].(time.Time)
			if timeI.Before(timeJ) {
				sessions[i], sessions[j] = sessions[j], sessions[i]
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sessions": sessions,
	})
}
