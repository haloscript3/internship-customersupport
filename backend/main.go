package main

import (
  "fmt"
  "log"
  "net/http"
  "github.com/joho/godotenv"
  "backend/handlers"
  "backend/utils"

)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env")
	}
	if err := utils.InitMongo(); err != nil {
		log.Fatalf("Mongo init failed: %v", err)
	}
	
	utils.InitMongo()
	http.HandleFunc("/api/chat", handlers.ChatHandler)
	http.HandleFunc("/api/user/register", handlers.UserRegisterHandler)
	http.HandleFunc("/api/user/login", handlers.UserLoginHandler)
	http.HandleFunc("/api/agent/send", handlers.SendHandler)
	http.HandleFunc("/api/agent/register", handlers.AgentRegisterHandler)
	http.HandleFunc("/api/agent/login",    handlers.AgentLoginHandler)
	http.HandleFunc("/api/agent/status",handlers.AgentStatusHandler.Method("POST"))
	http.HandleFunc("/api/session/start", handlers.StartSessionHandler.Method("POST"))
	fmt.Println("Server is running on http://localhost:8080")

	log.Fatal(http.ListenAndServe(":8080", nil))
}

