package handlers

import (
    "context"
    "encoding/json"
    "net/http"
    "time"

    "backend/models"
    "backend/utils"
    "go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"github.com/gorilla/mux"
	"fmt"
)

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
						"status": "active",
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
						"mode": "system",
						"status": "active",
						"lastActivity": time.Now(),
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
					"status": "active",
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
		var agent models.Agent
		err := utils.AgentColl.FindOne(ctx, bson.M{"status": "available"}).Decode(&agent)
		if err == nil {
			_, errUpdate := utils.AgentColl.UpdateOne(ctx,
				bson.M{"_id": agent.ID},
				bson.M{"$set": bson.M{"status": "busy"}},
			)
			if errUpdate != nil {
				fmt.Printf("[SESSION][ERROR] Agent status 'busy' yapılamadı: %v\n", errUpdate)
			} else {
				fmt.Printf("[SESSION][OK] Agent atandı ve status 'busy': %s\n", agent.ID.Hex())
			}
			assigned = agent.ID.Hex()
			mode = "human"
		} else {
			fmt.Printf("[SESSION][WARN] Agent bulunamadı, sistem devrede.\n")
		}
	}

	session := models.Session{
		UserID:        body.UserID,
		AssignedAgent: assigned,
		Mode:           mode,
		Status:         status,
		CreatedAt:     time.Now(),
		LastActivity:  time.Now(),
	}
	res, err := utils.SessionColl.InsertOne(ctx, session)
	if err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

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
			"mode": "human",
			"status": "active",
			"lastActivity": time.Now(),
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Session successfully transferred to agent",
		"sessionId": body.SessionID,
		"agentId": body.AgentID,
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
	cursor, err := utils.SessionColl.Find(ctx, bson.M{"assignedAgent": agentId})
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
				"sessionId": s.ID.Hex(),
				"userId": s.UserID,
				"createdAt": s.CreatedAt,
			})
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
		"mode": session.Mode,
		"assignedAgent": session.AssignedAgent,
	})
}