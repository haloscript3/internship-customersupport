package main

import (
	"backend/handlers"
	"backend/utils"
	"backend/websocket"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	if err := utils.InitMongo(); err != nil {
		log.Fatalf("Mongo init failed: %v", err)
	}

	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				handlers.CleanupOldSessions()
			}
		}
	}()

	r := mux.NewRouter()

	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

	r.HandleFunc("/api/user/register", handlers.UserRegisterHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/user/login", handlers.UserLoginHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/user/{userId}", handlers.GetUserInfoHandler).Methods("GET", "OPTIONS")

	r.HandleFunc("/api/agent/register", handlers.AgentRegisterHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/agent/login", handlers.AgentLoginHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/agent/status", handlers.AgentStatusHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/agent/active-sessions/{agentId}", handlers.GetAgentActiveSessionsHandler).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/agent/takeover", handlers.TakeOverAISessionHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/agent/assign-session", handlers.AssignSessionToAgentHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/agent/send", handlers.SendHandler).Methods("POST", "OPTIONS")

	r.HandleFunc("/api/session/start", handlers.StartSessionHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/session/info", handlers.GetSessionInfoHandler).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/session/end", handlers.EndSessionHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/session/transfer", handlers.TransferToAgentHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/session/messages", handlers.SessionMessagesGetHandler).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/session/agent/{agentId}", handlers.GetAgentSessionsHandler).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/session/user/active", handlers.GetUserActiveSessionHandler).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/session/user/{userId}", handlers.GetUserSessionsHandler).Methods("GET", "OPTIONS")

	r.HandleFunc("/api/chat", handlers.ChatHandler).Methods("POST", "OPTIONS")

	r.HandleFunc("/api/sessions/ai", handlers.GetAISessionsHandler).Methods("GET", "OPTIONS")

	r.HandleFunc("/ws", websocket.HandleWebSocket)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
