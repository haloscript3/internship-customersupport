package handlers

import (
	"backend/utils"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type SendMessage struct {
	Message string `json:"message"`
	UserID  string `json:"userId"`
}

type ChatEntry struct {
	Sender    string    `json:"sender" bson:"sender"`
	Text      string    `json:"text" bson:"text"`
	Timestamp time.Time `json:"timestamp" bson:"timestamp"`
}

type ChatSession struct {
	UserID       string      `bson:"userId"`
	Messages     []ChatEntry `bson:"messages"`
	LastActivity time.Time   `bson:"lastActivity"`
}

func SendHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Yalnızca POST istekleri kabul edilir", http.StatusMethodNotAllowed)
		return
	}

	var payload SendMessage
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Geçersiz istek verisi", http.StatusBadRequest)
		return
	}

	userMsg := ChatEntry{
		Sender:    "user",
		Text:      payload.Message,
		Timestamp: time.Now(),
	}

	botReply, err := utils.AskGemini(payload.Message)
	if err != nil {
		http.Error(w, "Gemini AI'dan yanıt alınamadı", http.StatusInternalServerError)
		return
	}

	botMsg := ChatEntry{
		Sender:    "ai",
		Text:      botReply,
		Timestamp: time.Now(),
	}

	collection := utils.Client.Database("ChatbotAI").Collection("messages")
	session := ChatSession{
		UserID:       payload.UserID,
		Messages:     []ChatEntry{userMsg, botMsg},
		LastActivity: time.Now(),
	}

	insertResult, err := collection.InsertOne(context.TODO(), session)
	if err != nil {
		fmt.Println("MongoDB kayıt hatası:", err)
		http.Error(w, "Veritabanı hatası", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"reply": botReply,
		"id":    insertResult.InsertedID.(interface{}).(string),
	})
}