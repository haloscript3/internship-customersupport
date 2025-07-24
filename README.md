# AI-Powered Customer Support Chatbot

A modern, real-time customer support application that seamlessly combines AI assistance with human agent support. The system intelligently routes customers to available agents or provides AI-powered responses when agents are unavailable.

##  Features

### Core Functionality
- **Hybrid Support System**: Automatic routing between AI (Gemini) and human agents
- **Real-time Communication**: WebSocket-based instant messaging
- **Session Management**: Persistent chat sessions with message history
- **Agent Status Management**: Real-time agent availability tracking
- **User Authentication**: Separate login systems for customers and agents

### Technical Highlights
- **Go Backend**: High-performance REST API with WebSocket support
- **React Frontend**: Modern, responsive user interface
- **MongoDB**: Scalable document database for message and session storage
- **Google Gemini AI**: Advanced AI-powered customer responses
- **CORS Support**: Cross-origin resource sharing for web applications

## Architecture

### Backend (Go)
```
backend/
├── handlers/
│   ├── agent.go          # Agent registration, login, status management
│   ├── chat.go           # AI chat functionality
│   ├── middleware.go     # CORS middleware
│   ├── send.go           # Message sending and session handling
│   ├── session.go        # Session creation and management
│   └── user.go           # User registration and authentication
├── models/
│   └── models.go         # Data structures (Agent, Session, Message)
├── utils/
│   ├── gemini.go         # Google Gemini AI integration
│   └── mongo.go          # MongoDB connection and collections
└── websocket/
    └── handler.go        # WebSocket connection management
```

### Frontend (React)
```
frontend/
├── components/
│   ├── user/
│   │   ├── login.js      # User login interface
│   │   ├── register.js   # User registration
│   │   └── chat.js       # Customer chat interface
│   └── agent/
│       ├── login.js      # Agent login interface
│       ├── register.js   # Agent registration
│       └── chat.js       # Agent chat interface
└── hooks/
    └── useChatWebSocket.js # WebSocket hook for real-time messaging
```

## Technology Stack

### Backend
- **Language**: Go 1.19+
- **Database**: MongoDB
- **AI Service**: Google Gemini API
- **WebSocket**: Gorilla WebSocket
- **HTTP Router**: Gorilla Mux
- **Authentication**: bcrypt password hashing

### Frontend
- **Framework**: React 18+
- **Styling**: Inline styles with modern design
- **State Management**: React Hooks (useState, useEffect)
- **WebSocket**: Native WebSocket API
- **HTTP Client**: Fetch API

##  Prerequisites

- Go 1.19 or higher
- Node.js 16+ and npm
- MongoDB instance (local or cloud)
- Google Gemini API key

##  Installation & Setup

### 1. Environment Variables
Create a `.env` file in the backend directory:
```env
MONGO_URI=YOUR_MONGODB_CLUSTER_KEY
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Backend Setup
```bash
cd backend
go mod init backend
go get go.mongodb.org/mongo-driver/mongo
go get github.com/gorilla/websocket
go get github.com/gorilla/mux
go get golang.org/x/crypto/bcrypt
go run main.go
```

### 3. Frontend Setup
```bash
cd frontend
npm install react react-dom
npm start
```

### 4. Database Collections
The application automatically creates these MongoDB collections:
- `agents` - Agent profiles and status
- `users` - Customer profiles
- `sessions` - Chat sessions
- `messages` - Individual messages

##  Usage Scenario

### Customer Journey
1. **Registration/Login**: Customer creates account or logs in
2. **Session Creation**: System automatically creates a chat session
3. **Agent Assignment**: 
   - If agents are available → Connects to human agent
   - If no agents available → Routes to AI (Gemini)
4. **Real-time Chat**: Customer exchanges messages in real-time
5. **Session Persistence**: Chat history is saved and retrievable

### Agent Workflow
1. **Agent Login**: Agent logs in and status becomes "available"
2. **Session Assignment**: System assigns waiting customers
3. **Real-time Support**: Agent provides live customer support
4. **Status Management**: Agent status updates (available/busy)
5. **Session Handoff**: Multiple sessions can be handled simultaneously

##  API Endpoints

### User Management
- `POST /api/user/register` - User registration
- `POST /api/user/login` - User authentication

### Agent Management
- `POST /api/agent/register` - Agent registration
- `POST /api/agent/login` - Agent authentication
- `POST /api/agent/status` - Update agent status

### Session Management
- `POST /api/session/start` - Create new chat session
- `GET /api/session/agent/{agentId}` - Get agent's sessions
- `GET /api/session/info?sessionId={id}` - Get session details

### Messaging
- `POST /api/session/message` - Send message to session
- `GET /api/session/messages?sessionId={id}` - Get session messages
- `WS /ws?userId={id}&sessionId={id}` - WebSocket connection

##  WebSocket Protocol

### Connection Parameters
- **Users**: `/ws?userId={userId}&sessionId={sessionId}`
- **Agents**: `/ws?agentId={agentId}&sessionId={sessionId}`

### Message Format
```json
{
  "sessionId": "session_object_id",
  "sender": "user|agent|ai",
  "message": "message_content"
}
```

##  Data Models

### Session
```go
type Session struct {
    ID             primitive.ObjectID `bson:"_id,omitempty"`
    UserID         string             `bson:"userId"`
    AssignedAgent  string             `bson:"assignedAgent"`
    Mode           string             `bson:"mode"` // "ai" or "human"
    CreatedAt      time.Time          `bson:"createdAt"`
}
```

### Message
```go
type Message struct {
    ID        primitive.ObjectID `bson:"_id,omitempty"`
    SessionID primitive.ObjectID `bson:"sessionId"`
    Sender    string             `bson:"sender"`
    Text      string             `bson:"text"`
    Timestamp time.Time          `bson:"timestamp"`
}
```

### Agent
```go
type Agent struct {
    ID        primitive.ObjectID `bson:"_id,omitempty"`
    Name      string             `bson:"name"`
    Email     string             `bson:"email"`
    Password  string             `bson:"password"`
    Status    string             `bson:"status"` // "available", "busy", "offline"
    CreatedAt time.Time          `bson:"createdAt"`
}
```

##  System Flow

1. **Customer initiates chat** → System checks for available agents
2. **Agent available** → Creates human session, sets agent to "busy"
3. **No agent available** → Creates AI session with Gemini
4. **Real-time messaging** → WebSocket handles bidirectional communication
5. **Message persistence** → All messages stored in MongoDB
6. **Session completion** → Agent status returns to "available"

## Deployment Considerations

### Production Setup
- Use environment variables for all sensitive data
- Implement proper logging and monitoring
- Set up database indexes for performance
- Configure reverse proxy (nginx) for WebSocket support
- Use SSL/TLS certificates for secure connections

### Scaling Options
- Horizontal scaling with multiple Go instances
- MongoDB replica sets for high availability
- Load balancing for WebSocket connections
- Redis for session management in distributed systems

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

##  License

This project is licensed under the MIT License - see the LICENSE file for details.


**Note**: This application provides a complete customer support solution combining the efficiency of AI with the personal touch of human agents, ensuring customers always receive timely and appropriate assistance.