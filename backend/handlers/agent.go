package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"backend/models"
	"backend/utils"
	"backend/websocket"

	"github.com/gorilla/mux"
	gorillaws "github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type Agent struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`
	Email     string             `bson:"email" json:"email"`
	Password  string             `bson:"password,omitempty" json:"-"`
	Status    string             `bson:"status" json:"status"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type AgentStatusUpdate struct {
	AgentID string `json:"agentId"`
	Status  string `json:"status"`
}

func AgentStatusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	type requestBody struct {
		AgentID string `json:"agentId"`
		Status  string `json:"status"`
	}

	var req requestBody
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil ||
		req.AgentID == "" || req.Status == "" {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	agentID, err := primitive.ObjectIDFromHex(req.AgentID)
	if err != nil {
		http.Error(w, "Invalid agent ID", http.StatusBadRequest)
		return
	}

	filter := bson.M{"_id": agentID}
	update := bson.M{"$set": bson.M{"status": req.Status}}

	_, err = utils.AgentColl.UpdateOne(ctx, filter, update)
	if err != nil {
		http.Error(w, "Failed to update agent status", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Agent status updated"))
}

func AgentRegisterHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Yalnızca POST desteklenir", http.StatusMethodNotAllowed)
		return
	}

	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Geçersiz JSON", http.StatusBadRequest)
		return
	}

	coll := utils.MongoDB.Collection("agents")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := coll.FindOne(ctx, bson.M{"email": input.Email}).Err(); err == nil {
		http.Error(w, "Bu e-posta zaten kayıtlı", http.StatusConflict)
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Sunucu hatası", http.StatusInternalServerError)
		return
	}

	newAgent := Agent{
		Name:      input.Name,
		Email:     input.Email,
		Password:  string(hashed),
		CreatedAt: time.Now(),
	}
	res, err := coll.InsertOne(ctx, newAgent)
	if err != nil {
		http.Error(w, "Kayıt sırasında hata", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      res.InsertedID,
		"message": "Agent başarıyla kaydedildi",
	})
}

func AgentLoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Yalnızca POST desteklenir", http.StatusMethodNotAllowed)
		return
	}

	var creds struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Geçersiz JSON", http.StatusBadRequest)
		return
	}

	coll := utils.MongoDB.Collection("agents")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var agent Agent
	if err := coll.FindOne(ctx, bson.M{"email": creds.Email}).Decode(&agent); err != nil {
		http.Error(w, "Geçersiz kimlik bilgileri", http.StatusUnauthorized)
		return
	}

	log.Println("[AGENT LOGIN] Agent", agent.ID.Hex(), "login öncesi status:", agent.Status)

	if bcrypt.CompareHashAndPassword([]byte(agent.Password), []byte(creds.Password)) != nil {
		http.Error(w, "Geçersiz kimlik bilgileri", http.StatusUnauthorized)
		return
	}

	update := bson.M{"$set": bson.M{"status": "available"}}
	_, err := coll.UpdateOne(ctx, bson.M{"_id": agent.ID}, update)
	if err != nil {
		log.Println("[AGENT LOGIN][ERROR] Status güncellenemedi:", err)
	} else {
		log.Println("[AGENT LOGIN][OK] Agent", agent.ID.Hex(), "status set to available (login sonrası)")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Agent girişi başarılı",
		"agentId": agent.ID.Hex(),
	})
}

func TakeOverAISessionHandler(w http.ResponseWriter, r *http.Request) {
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
		AgentID   string `json:"agentId"`
		SessionID string `json:"sessionId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.AgentID == "" {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

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

	var session models.Session

	if body.SessionID != "" {
		sessionObjID, err := primitive.ObjectIDFromHex(body.SessionID)
		if err != nil {
			http.Error(w, "Invalid session ID", http.StatusBadRequest)
			return
		}

		err = utils.SessionColl.FindOne(ctx, bson.M{
			"_id":    sessionObjID,
			"mode":   "system",
			"status": "active",
		}).Decode(&session)

		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message":   "Specified session not found or not available",
				"available": false,
			})
			return
		}
	} else {

		err = utils.SessionColl.FindOne(ctx, bson.M{
			"mode":   "system",
			"status": "active",
		}).Decode(&session)

		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message":   "No system sessions available to take over",
				"available": false,
			})
			return
		}
	}

	updateResult, err := utils.SessionColl.UpdateOne(ctx,
		bson.M{"_id": session.ID},
		bson.M{"$set": bson.M{
			"assignedAgent": body.AgentID,
			"mode":          "human",
			"status":        "active",
			"lastActivity":  time.Now(),
		}},
	)
	if err != nil {
		log.Printf("[TAKEOVER][ERROR] Failed to update session: %v", err)
		http.Error(w, "Failed to transfer session", http.StatusInternalServerError)
		return
	}
	log.Printf("[TAKEOVER][SUCCESS] Session updated - matched: %d, modified: %d", updateResult.MatchedCount, updateResult.ModifiedCount)

	var updatedSession models.Session
	err = utils.SessionColl.FindOne(ctx, bson.M{"_id": session.ID}).Decode(&updatedSession)
	if err != nil {
		log.Printf("[TAKEOVER][ERROR] Failed to verify session update: %v", err)
	} else {
		log.Printf("[TAKEOVER][VERIFY] Session mode is now: %s, agent: %s", updatedSession.Mode, updatedSession.AssignedAgent)
	}

	_, err = utils.AgentColl.UpdateOne(ctx,
		bson.M{"_id": agentObjId},
		bson.M{"$set": bson.M{"status": "busy"}},
	)
	if err != nil {
		log.Printf("[TAKEOVER][ERROR] Agent status 'busy' yapılamadı: %v\n", err)
	}

	sessionUpdate := map[string]interface{}{
		"sessionId":     session.ID.Hex(),
		"userId":        session.UserID,
		"assignedAgent": body.AgentID,
		"mode":          "human",
		"status":        "active",
		"lastActivity":  time.Now(),
		"action":        "takeover",
	}
	websocket.BroadcastSessionUpdate(sessionUpdate)

	userConn := websocket.GetUserConn(session.UserID)
	if userConn != nil {
		userNotification := map[string]interface{}{
			"sender":        "system",
			"mode":          "human",
			"status":        "active",
			"assignedAgent": body.AgentID,
		}
		jsonData, _ := json.Marshal(userNotification)
		userConn.WriteMessage(gorillaws.TextMessage, jsonData)
		log.Printf("[TAKEOVER] Notified user %s about agent takeover", session.UserID)
	}

	agentConn := websocket.GetAgentConn(body.AgentID)
	if agentConn != nil {
		messageCursor, err := utils.MessageColl.Find(ctx, bson.M{"sessionId": session.ID})
		if err == nil {
			defer messageCursor.Close(ctx)
			for messageCursor.Next(ctx) {
				var msg models.Message
				if err := messageCursor.Decode(&msg); err == nil {
					out := map[string]interface{}{
						"sender":  msg.Sender,
						"message": msg.Text,
						"type":    "history",
					}
					jsonData, _ := json.Marshal(out)
					agentConn.WriteMessage(gorillaws.TextMessage, jsonData)
				}
			}
			log.Printf("[WS] Sent message history to agent %s for session %s", body.AgentID, session.ID.Hex())
		}
	}

	var messages []models.Message
	messageCursor, err := utils.MessageColl.Find(ctx, bson.M{"sessionId": session.ID})
	if err == nil {
		defer messageCursor.Close(ctx)
		for messageCursor.Next(ctx) {
			var msg models.Message
			if err := messageCursor.Decode(&msg); err == nil {
				messages = append(messages, msg)
			}
		}
	}

	for i := 0; i < len(messages)-1; i++ {
		for j := i + 1; j < len(messages); j++ {
			if messages[i].Timestamp.After(messages[j].Timestamp) {
				messages[i], messages[j] = messages[j], messages[i]
			}
		}
	}

	var user struct {
		ID    primitive.ObjectID `bson:"_id,omitempty"`
		Name  string             `bson:"name"`
		Email string             `bson:"email"`
	}

	utils.MongoDB.Collection("users").FindOne(ctx, bson.M{"email": session.UserID}).Decode(&user)

	var formattedMessages []map[string]interface{}
	for _, msg := range messages {
		formattedMessages = append(formattedMessages, map[string]interface{}{
			"id":        msg.ID.Hex(),
			"sessionId": msg.SessionID.Hex(),
			"sender":    msg.Sender,
			"text":      msg.Text,
			"timestamp": msg.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":   "Successfully took over system session",
		"sessionId": session.ID.Hex(),
		"agentId":   body.AgentID,
		"available": true,
		"messages":  formattedMessages,
		"userInfo": map[string]interface{}{
			"name":  user.Name,
			"email": user.Email,
		},
	})
}

func AssignSessionToAgentHandler(w http.ResponseWriter, r *http.Request) {
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
		AgentID   string `json:"agentId"`
		SessionID string `json:"sessionId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.AgentID == "" || body.SessionID == "" {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	agentObjId, err := primitive.ObjectIDFromHex(body.AgentID)
	if err != nil {
		http.Error(w, "Invalid agent ID", http.StatusBadRequest)
		return
	}

	sessionObjId, err := primitive.ObjectIDFromHex(body.SessionID)
	if err != nil {
		http.Error(w, "Invalid session ID", http.StatusBadRequest)
		return
	}

	var agent models.Agent
	err = utils.AgentColl.FindOne(ctx, bson.M{"_id": agentObjId, "status": "available"}).Decode(&agent)
	if err != nil {
		http.Error(w, "Agent not available", http.StatusBadRequest)
		return
	}

	var session models.Session
	err = utils.SessionColl.FindOne(ctx, bson.M{"_id": sessionObjId, "status": "active"}).Decode(&session)
	if err != nil {
		http.Error(w, "Session not found or not active", http.StatusBadRequest)
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
		http.Error(w, "Failed to assign session", http.StatusInternalServerError)
		return
	}

	_, err = utils.AgentColl.UpdateOne(ctx,
		bson.M{"_id": agentObjId},
		bson.M{"$set": bson.M{"status": "busy"}},
	)
	if err != nil {
		log.Printf("[ASSIGN][ERROR] Agent status 'busy' yapılamadı: %v\n", err)
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

	for i := 0; i < len(messages)-1; i++ {
		for j := i + 1; j < len(messages); j++ {
			if messages[i].Timestamp.After(messages[j].Timestamp) {
				messages[i], messages[j] = messages[j], messages[i]
			}
		}
	}

	var user struct {
		ID    primitive.ObjectID `bson:"_id,omitempty"`
		Name  string             `bson:"name"`
		Email string             `bson:"email"`
	}

	utils.MongoDB.Collection("users").FindOne(ctx, bson.M{"email": session.UserID}).Decode(&user)

	agentConn := websocket.GetAgentConn(body.AgentID)
	if agentConn != nil {
		for _, msg := range messages {
			out := map[string]interface{}{
				"sender":  msg.Sender,
				"message": msg.Text,
				"type":    "history",
			}
			jsonData, _ := json.Marshal(out)
			agentConn.WriteMessage(gorillaws.TextMessage, jsonData)
		}
		log.Printf("[WS] Sent message history to agent %s for session %s", body.AgentID, body.SessionID)
	}

	var formattedMessages []map[string]interface{}
	for _, msg := range messages {
		formattedMessages = append(formattedMessages, map[string]interface{}{
			"id":        msg.ID.Hex(),
			"sessionId": msg.SessionID.Hex(),
			"sender":    msg.Sender,
			"text":      msg.Text,
			"timestamp": msg.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":   "Successfully assigned session to agent",
		"sessionId": body.SessionID,
		"agentId":   body.AgentID,
		"success":   true,
		"messages":  formattedMessages,
		"userInfo": map[string]interface{}{
			"name":  user.Name,
			"email": user.Email,
		},
	})
}

func GetAgentActiveSessionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	vars := mux.Vars(r)
	agentId := vars["agentId"]

	log.Printf("[AGENT] Getting active sessions for agent: %s", agentId)

	CleanupOldSessions()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := utils.SessionColl.Find(ctx, bson.M{
		"$or": []bson.M{
			{"assignedAgent": agentId, "status": bson.M{"$in": []string{"active", "waiting_for_agent"}}},
			{"assignedAgent": "System", "mode": "system", "status": "active"},
		},
	})
	if err != nil {
		log.Printf("[AGENT][ERROR] Failed to fetch sessions: %v", err)
		http.Error(w, "Failed to fetch sessions", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	sessions := []map[string]interface{}{}
	for cursor.Next(ctx) {
		var s models.Session
		if err := cursor.Decode(&s); err == nil {

			var user struct {
				ID    primitive.ObjectID `bson:"_id,omitempty"`
				Name  string             `bson:"name"`
				Email string             `bson:"email"`
			}
			log.Printf("[AGENT] Looking up user with email: %s", s.UserID)

			err = utils.MongoDB.Collection("users").FindOne(ctx, bson.M{"email": s.UserID}).Decode(&user)
			if err != nil {
				log.Printf("[AGENT][ERROR] Failed to find user by email: %s, error: %v", s.UserID, err)
			} else {
				log.Printf("[AGENT][SUCCESS] Found user: %s (%s)", user.Name, user.Email)
			}

			sessionData := map[string]interface{}{
				"sessionId":    s.ID.Hex(),
				"userId":       s.UserID,
				"mode":         s.Mode,
				"status":       s.Status,
				"createdAt":    s.CreatedAt,
				"lastActivity": s.LastActivity,
			}

			if err == nil {
				sessionData["userName"] = user.Name
				sessionData["userEmail"] = user.Email
			} else {
				sessionData["userName"] = "Bilinmeyen Kullanıcı"
				sessionData["userEmail"] = "N/A"
			}

			sessions = append(sessions, sessionData)
			log.Printf("[AGENT] Found session: %s for user: %s (%s), mode: %s", s.ID.Hex(), user.Name, s.UserID, s.Mode)
		}
	}

	log.Printf("[AGENT] Total active sessions for agent %s: %d", agentId, len(sessions))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sessions": sessions})
}

func GetAISessionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET,OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := utils.SessionColl.Find(ctx, bson.M{
		"mode":   "system",
		"status": "active",
	})
	if err != nil {
		http.Error(w, "Failed to fetch system sessions", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	sessions := []map[string]interface{}{}
	for cursor.Next(ctx) {
		var s models.Session
		if err := cursor.Decode(&s); err == nil {

			var user struct {
				ID    primitive.ObjectID `bson:"_id,omitempty"`
				Name  string             `bson:"name"`
				Email string             `bson:"email"`
			}
			log.Printf("[AI] Looking up user with email: %s", s.UserID)

			err = utils.MongoDB.Collection("users").FindOne(ctx, bson.M{"email": s.UserID}).Decode(&user)
			if err != nil {
				log.Printf("[AI][ERROR] Failed to find user by email: %s, error: %v", s.UserID, err)
			} else {
				log.Printf("[AI][SUCCESS] Found user: %s (%s)", user.Name, user.Email)
			}

			sessionData := map[string]interface{}{
				"sessionId":    s.ID.Hex(),
				"userId":       s.UserID,
				"createdAt":    s.CreatedAt,
				"lastActivity": s.LastActivity,
			}

			if err == nil {
				sessionData["userName"] = user.Name
				sessionData["userEmail"] = user.Email
			} else {
				sessionData["userName"] = "Bilinmeyen Kullanıcı"
				sessionData["userEmail"] = "N/A"
			}

			sessions = append(sessions, sessionData)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sessions": sessions})
}
