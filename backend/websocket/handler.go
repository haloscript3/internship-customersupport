package websocket

import (
	"backend/models"
	"backend/utils"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var userConns = make(map[string]*websocket.Conn)
var agentConns = make(map[string]*websocket.Conn)

func cleanupUserSessions(userID string) {
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
				log.Printf("[WS][CLEANUP] User %s için eski session silindi: %s", userID, session.ID.Hex())
			}
		}
	}
}

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
	sessionID := query.Get("sessionId")

	if userID != "" {
		cleanupUserSessions(userID)
	}

	if userID != "" {
		userConns[userID] = conn
		log.Printf("[WS] User connected: %s, Session: %s", userID, sessionID)
		if sessionID != "" {
			sessionObjId, _ := primitive.ObjectIDFromHex(sessionID)
			var session models.Session
			err := utils.SessionColl.FindOne(context.TODO(), bson.M{"_id": sessionObjId}).Decode(&session)
			if err == nil {
				out := map[string]interface{}{
					"sender":        "system",
					"mode":          session.Mode,
					"status":        session.Status,
					"assignedAgent": session.AssignedAgent,
				}
				jsonData, _ := json.Marshal(out)
				conn.WriteMessage(websocket.TextMessage, jsonData)
				log.Printf("[WS] Sent session info to user: %s", userID)
			}
		}
	}

	if agentID != "" {
		agentConns[agentID] = conn
		log.Printf("[WS] Agent connected: %s", agentID)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		sessions, _ := utils.SessionColl.Find(ctx, bson.M{"assignedAgent": agentID, "status": "active"})
		for sessions.Next(ctx) {
			var s models.Session
			if err := sessions.Decode(&s); err == nil {
				userConn := GetUserConn(s.UserID)
				if userConn != nil {
					out := map[string]interface{}{
						"sender":        "system",
						"mode":          "human",
						"status":        "active",
						"assignedAgent": agentID,
					}
					jsonData, _ := json.Marshal(out)
					userConn.WriteMessage(websocket.TextMessage, jsonData)
					log.Printf("[WS] Notified user %s about agent assignment", s.UserID)
				}
			}
		}
	}

	defer func() {
		if userID != "" {
			delete(userConns, userID)
			log.Printf("[WS] User disconnected: %s", userID)
		}
		if agentID != "" {
			delete(agentConns, agentID)
			log.Printf("[WS] Agent disconnected: %s", agentID)
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			agentObjId, err := primitive.ObjectIDFromHex(agentID)
			if err == nil {
				utils.AgentColl.UpdateOne(ctx, bson.M{"_id": agentObjId}, bson.M{"$set": bson.M{"status": "available"}})
			}

			utils.SessionColl.UpdateMany(ctx, bson.M{"assignedAgent": agentID, "mode": "human"}, bson.M{"$set": bson.M{
				"mode":          "system",
				"assignedAgent": "System",
				"status":        "active",
			}})

			sessions, _ := utils.SessionColl.Find(ctx, bson.M{"assignedAgent": "System", "mode": "system"})
			for sessions.Next(ctx) {
				var s models.Session
				if err := sessions.Decode(&s); err == nil {
					userConn := GetUserConn(s.UserID)
					if userConn != nil {
						out := map[string]interface{}{
							"sender":        "system",
							"mode":          "system",
							"status":        "active",
							"assignedAgent": "System",
						}
						jsonData, _ := json.Marshal(out)
						userConn.WriteMessage(websocket.TextMessage, jsonData)
						log.Printf("[WS] Notified user %s about system mode", s.UserID)
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

	log.Printf("[WS] Received message from %s: %s", incoming.Sender, incoming.Message)

	sessionID, _ := primitive.ObjectIDFromHex(incoming.SessionID)
	var session models.Session
	err := utils.SessionColl.FindOne(context.TODO(), bson.M{"_id": sessionID}).Decode(&session)
	if err != nil {
		log.Println("Session not found:", err)
		return
	}

	utils.SessionColl.UpdateOne(context.TODO(), bson.M{"_id": sessionID}, bson.M{"$set": bson.M{"lastActivity": time.Now()}})

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

	if session.Mode == "system" {
		if incoming.Sender == "user" {
			userOut := map[string]string{
				"sender":  "user",
				"message": incoming.Message,
			}
			userJsonData, _ := json.Marshal(userOut)
			userConn := GetUserConn(session.UserID)
			if userConn != nil {
				userConn.WriteMessage(websocket.TextMessage, userJsonData)
				log.Printf("[WS] Echoed user message in system mode: %s", session.UserID)
			} else {
				log.Printf("[WS] User connection not found for echo in system mode: %s", session.UserID)
			}
		}

		log.Printf("[WS] Processing system message for session: %s", sessionID.Hex())
		reply, err := utils.AskGemini(incoming.Message)
		if err != nil {
			log.Println("System error:", err)
			return
		}

		log.Printf("[WS] Gemini reply: %s", reply)

		systemMsg := models.Message{
			SessionID: sessionID,
			Sender:    "system",
			Text:      reply,
			Timestamp: time.Now(),
		}
		_, _ = utils.MessageColl.InsertOne(context.Background(), systemMsg)

		out := map[string]string{
			"sender":  "system",
			"message": reply,
		}
		jsonData, _ := json.Marshal(out)
		userConn := GetUserConn(session.UserID)
		if userConn != nil {
			userConn.WriteMessage(websocket.TextMessage, jsonData)
			log.Printf("[WS] Sent system reply to user: %s", session.UserID)
		} else {
			log.Printf("[WS] User connection not found for: %s", session.UserID)
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
				log.Printf("[WS] Sent user message to agent: %s", session.AssignedAgent)
			} else {
				log.Printf("[WS] Agent connection not found for: %s", session.AssignedAgent)
			}

			userConn := GetUserConn(session.UserID)
			if userConn != nil {
				userConn.WriteMessage(websocket.TextMessage, jsonData)
				log.Printf("[WS] Echoed user message back to user: %s", session.UserID)
			} else {
				log.Printf("[WS] User connection not found for echo: %s", session.UserID)
			}
		} else {
			userConn := GetUserConn(session.UserID)
			if userConn != nil {
				userConn.WriteMessage(websocket.TextMessage, jsonData)
				log.Printf("[WS] Sent agent message to user: %s", session.UserID)
			} else {
				log.Println("[WS] userConn nil! session.UserID:", session.UserID, "userConns keys:", keys(userConns))
			}
		}
	}
}

func NotifySessionEnded(sessionID string) {
	log.Printf("[WS] Notifying session ended: %s", sessionID)

	sessionObjId, err := primitive.ObjectIDFromHex(sessionID)
	if err != nil {
		log.Printf("[WS] Invalid session ID: %s", sessionID)
		return
	}

	var session models.Session
	err = utils.SessionColl.FindOne(context.TODO(), bson.M{"_id": sessionObjId}).Decode(&session)
	if err != nil {
		log.Printf("[WS] Session not found: %s", sessionID)
		return
	}

	userConn := GetUserConn(session.UserID)
	if userConn != nil {
		out := map[string]interface{}{
			"sender": "system",
			"status": "completed",
		}
		jsonData, _ := json.Marshal(out)
		userConn.WriteMessage(websocket.TextMessage, jsonData)
		log.Printf("[WS] Notified user %s about session end", session.UserID)
	}
}
