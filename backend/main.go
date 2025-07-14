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
	err := godotenv.Load()
	if err != nil {
		log.Fatal(".env could not be loaded")
	}
	
	utils.InitMongo()
	http.HandleFunc("/api/chat", handlers.ChatHandler)
	http.HandleFunc("/api/user/register", handlers.UserRegisterHandler)
	http.HandleFunc("/api/user/login", handlers.UserLoginHandler)
	http.HandleFunc("/api/agent/send", handlers.SendHandler)
	http.HandleFunc("/api/agent/register", handlers.AgentRegisterHandler)
	http.HandleFunc("/api/agent/login",    handlers.AgentLoginHandler)
	fmt.Println("Server is running on http://localhost:8080")

	log.Fatal(http.ListenAndServe(":8080", nil))
}

