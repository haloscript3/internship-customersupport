package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)
type Agent struct{
	ID		primitive.ObjectID `bson:"_id,omitempty"`
	Name		string             `bson:"name"`
	Email		string             `bson:"email"`
	Password	string             `bson:"password"`
	Status		string             `bson:"status"`
	createdAt	time.Time          `bson:"created_at"` 
}

type Session struct {
    ID         primitive.ObjectID  `bson:"_id,omitempty"`
    UserID     *primitive.ObjectID `bson:"userId,omitempty"`
    AgentID    *primitive.ObjectID `bson:"agentId,omitempty"`
    AIFallback bool                `bson:"aiFallback"`
    CreatedAt  time.Time           `bson:"createdAt"`
    UpdatedAt  time.Time           `bson:"updatedAt"`
}

type Message struct {
    ID        primitive.ObjectID `bson:"_id,omitempty"`
    SessionID primitive.ObjectID `bson:"sessionId"`
    Sender    string             `bson:"sender"`  
    Text      string             `bson:"text"`
    Timestamp time.Time          `bson:"timestamp"`
}