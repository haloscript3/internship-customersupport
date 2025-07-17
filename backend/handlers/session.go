package handlers

import (
    "context"
    "encoding/json"
    "net/http"
    "time"

    "backend/models"
    "backend/utils"
    "go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

)

func StartSessionHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "POST,OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusOK)
        return
    }
    if r.Method != http.MethodPost {
        http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
        return
    }

    var body struct {
        UserID string `json:"userId"`
    }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.UserID == "" {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    var agent models.Agent
    err := utils.AgentColl.FindOne(ctx, bson.M{"status": "available"}).Decode(&agent)

    assigned := "Gemini"
    mode := "ai"
    if err == nil {
        _, _ = utils.AgentColl.UpdateOne(ctx,
            bson.M{"_id": agent.ID},
            bson.M{"$set": bson.M{"status": "busy"}},
        )
        assigned = agent.ID.Hex()
        mode = "human"
    }

    session := models.Session{
        UserID:        body.UserID,
        AssignedAgent: assigned,
        Mode:           mode,
        CreatedAt:     time.Now(),
    }
    res, err := utils.SessionColl.InsertOne(ctx, session)
    if err != nil {
        http.Error(w, "Failed to create session", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "sessionId":     res.InsertedID.(primitive.ObjectID).Hex(),
        "assignedAgent": assigned,
        "mode":          mode,
    })
}