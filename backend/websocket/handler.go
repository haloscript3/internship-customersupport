package websocket

import (
	"backend/models"
	"backend/utils"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"context"
	"encoding/json"
	"log"
	"time"
	"net/http"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var userConns = make(map[string]*websocket.Conn)
var agentConns = make(map[string]*websocket.Conn)

func keys(m map[string]*websocket.Conn) []string {
	var k []string
	for key := range m {
		k = append(k, key)
	}
	return k
}

func GetUserConn(userID string) *websocket.Conn {
	return userConns[userID]
}
func GetAgentConn(agentID string) *websocket.Conn {
	return agentConns[agentID]
}

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	query := r.URL.Query()
	userID := query.Get("userId")
	agentID := query.Get("agentId")
	if userID != "" {
		userConns[userID] = conn
	}
	if agentID != "" {
		agentConns[agentID] = conn
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		utils.SessionColl.UpdateMany(ctx, bson.M{"assignedAgent": agentID, "mode": "ai"}, bson.M{"$set": bson.M{"mode": "human"}})
		sessions, _ := utils.SessionColl.Find(ctx, bson.M{"assignedAgent": agentID, "mode": "human"})
		for sessions.Next(ctx) {
			var s models.Session
			if err := sessions.Decode(&s); err == nil {
				userConn := GetUserConn(s.UserID)
				if userConn != nil {
					out := map[string]string{
						"sender": "system",
						"mode":   "human",
					}
					jsonData, _ := json.Marshal(out)
					userConn.WriteMessage(websocket.TextMessage, jsonData)
				}
			}
		}
	}
	defer func() {
		if userID != "" {
			delete(userConns, userID)
		}
		if agentID != "" {
			delete(agentConns, agentID)
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			agentObjId, err := primitive.ObjectIDFromHex(agentID)
			if err == nil {
				utils.AgentColl.UpdateOne(ctx, bson.M{"_id": agentObjId}, bson.M{"$set": bson.M{"status": "available"}})
			}
			utils.SessionColl.UpdateMany(ctx, bson.M{"assignedAgent": agentID, "mode": "human"}, bson.M{"$set": bson.M{"mode": "ai"}})
			sessions, _ := utils.SessionColl.Find(ctx, bson.M{"assignedAgent": agentID, "mode": "ai"})
			for sessions.Next(ctx) {
				var s models.Session
				if err := sessions.Decode(&s); err == nil {
					userConn := GetUserConn(s.UserID)
					if userConn != nil {
						out := map[string]string{
							"sender": "system",
							"mode":   "ai",
						}
						jsonData, _ := json.Marshal(out)
						userConn.WriteMessage(websocket.TextMessage, jsonData)
					}
				}
			}
		}
		conn.Close()
	}()
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("WebSocket read error:", err)
			break
		}
		HandleWebSocketMessage(message)
	}
}

func HandleWebSocketMessage(messageData []byte) {
	var incoming struct {
		SessionID string `json:"sessionId"`
		Sender    string `json:"sender"`
		Message   string `json:"message"`
	}

	if err := json.Unmarshal(messageData, &incoming); err != nil {
		log.Println("Invalid message format")
		return
	}

	sessionID, _ := primitive.ObjectIDFromHex(incoming.SessionID)
	var session models.Session
	err := utils.SessionColl.FindOne(context.TODO(), bson.M{"_id": sessionID}).Decode(&session)
	if err != nil {
		log.Println("Session not found:", err)
		return
	}

	msg := models.Message{
		SessionID: sessionID,
		Sender:    incoming.Sender,
		Text:      incoming.Message,
		Timestamp: time.Now(),
	}
	_, err = utils.MessageColl.InsertOne(context.Background(), msg)
	if err != nil {
		log.Println("Failed to save message:", err)
	}

	if session.Mode == "ai" {
		reply, err := utils.AskGemini(incoming.Message)
		if err != nil {
			log.Println("AI error:", err)
			return
		}
		aiMsg := models.Message{
			SessionID: sessionID,
			Sender:    "ai",
			Text:      reply,
			Timestamp: time.Now(),
		}
		_, _ = utils.MessageColl.InsertOne(context.Background(), aiMsg)
		out := map[string]string{
			"sender":  "ai",
			"message": reply,
		}
		jsonData, _ := json.Marshal(out)
		userConn := GetUserConn(session.UserID)
		if userConn != nil {
			userConn.WriteMessage(websocket.TextMessage, jsonData)
		}
	} else {
		out := map[string]string{
			"sender":  incoming.Sender,
			"message": incoming.Message,
		}
		jsonData, _ := json.Marshal(out)
		if incoming.Sender == "user" {
			agentConn := GetAgentConn(session.AssignedAgent)
			if agentConn != nil {
				agentConn.WriteMessage(websocket.TextMessage, jsonData)
			}
		} else {
			userConn := GetUserConn(session.UserID)
			if userConn != nil {
				userConn.WriteMessage(websocket.TextMessage, jsonData)
			} else {
				log.Println("[WS] userConn nil! session.UserID:", session.UserID, "userConns keys:", keys(userConns))
			}
		}
	}
}