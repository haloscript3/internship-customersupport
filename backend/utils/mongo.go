package utils

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	Client *mongo.Client 
	MongoDB *mongo.Database
	AgentColl  *mongo.Collection
	SessionColl *mongo.Collection
	MessageColl *mongo.Collection
)

func InitMongo() error {
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		return fmt.Errorf("MONGODB_URI is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w",err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		return fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	Client = client
	MongoDB = client.Database("ChatbotAI")
	AgentColl = MongoDB.Collection("agents")
	SessionColl = MongoDB.Collection("sessions")
	MessageColl = MongoDB.Collection("messages")
	
	fmt.Println("✅ Connected to MongoDB")
	return nil
}