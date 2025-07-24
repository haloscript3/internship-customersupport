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