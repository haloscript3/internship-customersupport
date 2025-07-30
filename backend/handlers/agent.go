package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"backend/utils" 
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
	"github.com/gorilla/mux"
	"backend/models"
)

type Agent struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`
	Email     string             `bson:"email" json:"email"`
	Password  string             `bson:"password,omitempty" json:"-"`
	Status	  string				`bson:"status" json:"status"`
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
		AgentID string `json:"agentId"`
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
	err = utils.SessionColl.FindOne(ctx, bson.M{
		"mode": "system",
		"status": "active",
	}).Decode(&session)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "No system sessions available to take over",
			"available": false,
		})
		return
	}

	_, err = utils.SessionColl.UpdateOne(ctx,
		bson.M{"_id": session.ID},
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
		log.Printf("[TAKEOVER][ERROR] Agent status 'busy' yapılamadı: %v\n", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Successfully took over system session",
		"sessionId": session.ID.Hex(),
		"agentId": body.AgentID,
		"available": true,
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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := utils.SessionColl.Find(ctx, bson.M{
		"assignedAgent": agentId,
		"status": bson.M{"$in": []string{"active", "waiting_for_agent"}},
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
				"sessionId": s.ID.Hex(),
				"userId": s.UserID,
				"mode": s.Mode,
				"status": s.Status,
				"createdAt": s.CreatedAt,
				"lastActivity": s.LastActivity,
			})
		}
	}

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
		"mode": "system",
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
			sessions = append(sessions, map[string]interface{}{
				"sessionId": s.ID.Hex(),
				"userId": s.UserID,
				"createdAt": s.CreatedAt,
				"lastActivity": s.LastActivity,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"sessions": sessions})
}