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

	assigned := "Gemini"
	mode := "ai"
	if body.AgentID != "" {
		agentObjId, _ := primitive.ObjectIDFromHex(body.AgentID)
		assigned = body.AgentID
		mode = "human"
		_, err := utils.AgentColl.UpdateOne(ctx, bson.M{"_id": agentObjId}, bson.M{"$set": bson.M{"status": "busy"}})
		if err != nil {
			fmt.Println("[SESSION][ERROR] Agent status 'busy' yapılamadı:", err)
		} else {
			fmt.Println("[SESSION][OK] Agent doğrudan atandı ve status 'busy':", body.AgentID)
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
				fmt.Println("[SESSION][ERROR] Agent status 'busy' yapılamadı:", errUpdate)
			} else {
				fmt.Println("[SESSION][OK] Agent atandı ve status 'busy':", agent.ID.Hex())
			}
			assigned = agent.ID.Hex()
			mode = "human"
		} else {
			fmt.Println("[SESSION][WARN] Agent bulunamadı, AI devrede.")
		}
	}

	session := models.Session{
		UserID:        body.UserID,
		AssignedAgent: assigned,
		Mode:           mode,
		CreatedAt:     time.Now(),
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