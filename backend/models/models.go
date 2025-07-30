package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)
type Agent struct{
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	Name      string             `bson:"name"`
	Email     string             `bson:"email"`
	Password  string             `bson:"password"`
	Status    string             `bson:"status"`
	CreatedAt time.Time          `bson:"created_at"`
}

type Session struct {
    ID             primitive.ObjectID `bson:"_id,omitempty" json:"sessionId"`
    UserID         string             `bson:"userId"          json:"userId"`
    AssignedAgent  string             `bson:"assignedAgent"   json:"assignedAgent"`
    Mode           string             `bson:"mode"            json:"mode"`
    Status         string             `bson:"status"          json:"status"`
    CreatedAt      time.Time          `bson:"createdAt"       json:"createdAt"`
    LastActivity   time.Time          `bson:"lastActivity"    json:"lastActivity"`
}

type Message struct {
    ID        primitive.ObjectID `bson:"_id,omitempty"`
    SessionID primitive.ObjectID `bson:"sessionId"`
    Sender    string             `bson:"sender"`
    Text      string             `bson:"text"`
    Timestamp time.Time          `bson:"timestamp"`
}