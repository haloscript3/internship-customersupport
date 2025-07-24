package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"backend/utils"
)

type ChatMessage struct {
	Sender    string    `json:"sender" bson:"sender"`
	Text      string    `json:"text" bson:"text"`
	Timestamp time.Time `json:"timestamp" bson:"timestamp"`
}

type ChatRecord struct {
	Conversation []ChatMessage `bson:"conversation"`
	CreatedAt    time.Time     `bson:"createdAt"`
}

type ChatRequest struct {
	Conversation []struct {
		Sender string `json:"sender"`
		Text   string `json:"text"`
	} `json:"conversation"`
}

func ChatHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	var history []ChatMessage
	for _, m := range req.Conversation {
		history = append(history, ChatMessage{
			Sender:    m.Sender,
			Text:      m.Text,
			Timestamp: time.Now(),
		})
	}

	if len(history) == 0 {
		http.Error(w, "Empty conversation", http.StatusBadRequest)
		return
	}

	var b strings.Builder
	for _, msg := range history {
		switch msg.Sender {
		case "user":
			b.WriteString("User: " + msg.Text + "\n")
		case "agent":
			b.WriteString("Support: " + msg.Text + "\n")
		case "ai":
			b.WriteString("Assistant: " + msg.Text + "\n")
		}
	}
	b.WriteString("Assistant:")

	prompt := b.String()

	aiReply, err := utils.AskGemini(prompt)
	if err != nil {
		http.Error(w, "AI Error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	history = append(history, ChatMessage{
		Sender:    "ai",
		Text:      aiReply,
		Timestamp: time.Now(),
	})

	record := ChatRecord{
		Conversation: history,
		CreatedAt:    time.Now(),
	}
	fmt.Println("[3] MongoDB InsertOne başlıyor")
	coll := utils.MongoDB.Collection("messages")
	if res, err := coll.InsertOne(context.Background(), record); err != nil {
		fmt.Println(" MongoDB error:", err)
	} else {
		fmt.Println("Konuşma kaydedildi:", res.InsertedID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"reply": aiReply,
	})
}