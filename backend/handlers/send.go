package handlers

import (
	"backend/utils"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"backend/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
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

func SessionMessageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}
	var payload struct {
		SessionID string `json:"sessionId"`
		Sender   string `json:"sender"`
		Text     string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.SessionID == "" || payload.Sender == "" || payload.Text == "" {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	sessionObjID, err := primitive.ObjectIDFromHex(payload.SessionID)
	if err != nil {
		http.Error(w, "Invalid sessionId", http.StatusBadRequest)
		return
	}
	msg := models.Message{
		SessionID: sessionObjID,
		Sender:    payload.Sender,
		Text:      payload.Text,
		Timestamp: time.Now(),
	}
	_, err = utils.MessageColl.InsertOne(context.Background(), msg)
	if err != nil {
		http.Error(w, "Failed to save message", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Message saved"))
}

func SessionMessagesGetHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	sessionId := r.URL.Query().Get("sessionId")
	if sessionId == "" {
		http.Error(w, "sessionId required", http.StatusBadRequest)
		return
	}
	sessionObjID, err := primitive.ObjectIDFromHex(sessionId)
	if err != nil {
		http.Error(w, "Invalid sessionId", http.StatusBadRequest)
		return
	}
	filter := map[string]interface{}{ "sessionId": sessionObjID }
	cur, err := utils.MessageColl.Find(context.Background(), filter)
	if err != nil {
		http.Error(w, "Failed to fetch messages", http.StatusInternalServerError)
		return
	}
	defer cur.Close(context.Background())
	var messages []models.Message
	for cur.Next(context.Background()) {
		var msg models.Message
		if err := cur.Decode(&msg); err == nil {
			messages = append(messages, msg)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}