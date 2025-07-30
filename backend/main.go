package main

import (
  "fmt"
  "log"
  "net/http"
  "github.com/joho/godotenv"
  "backend/handlers"
  "backend/utils"
  "backend/websocket"
  "github.com/gorilla/mux"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env")
	}
	if err := utils.InitMongo(); err != nil {
		log.Fatalf("Mongo init failed: %v", err)
	}

	router := mux.NewRouter()
	router.HandleFunc("/api/chat", handlers.ChatHandler)
	router.HandleFunc("/api/user/register", handlers.UserRegisterHandler)
	router.HandleFunc("/api/user/login", handlers.UserLoginHandler)
	router.HandleFunc("/api/agent/send", handlers.SendHandler)
	router.HandleFunc("/api/agent/register", handlers.AgentRegisterHandler)
	router.HandleFunc("/api/agent/login", handlers.AgentLoginHandler)
	router.HandleFunc("/api/agent/status", handlers.AgentStatusHandler)
	router.HandleFunc("/api/session/start", handlers.StartSessionHandler)
	router.HandleFunc("/api/session/messages", handlers.SessionMessagesGetHandler)
	router.HandleFunc("/api/session/info", handlers.GetSessionInfoHandler).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/session/agent/{agentId}", handlers.GetAgentSessionsHandler).Methods("GET", "OPTIONS")
	
	// Yeni profesyonel sistem route'ları
	router.HandleFunc("/api/session/transfer", handlers.TransferToAgentHandler).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/agent/takeover", handlers.TakeOverAISessionHandler).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/agent/active-sessions/{agentId}", handlers.GetAgentActiveSessionsHandler).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/sessions/ai", handlers.GetAISessionsHandler).Methods("GET", "OPTIONS")
	
	router.HandleFunc("/ws", websocket.HandleWebSocket)
	fmt.Println("Server is running on http://localhost:8080")

	log.Fatal(http.ListenAndServe(":8080", router))
}

