# System Requirements

## Prerequisites

### Backend (Go)
- **Go**: 1.24.3 or higher
- **MongoDB**: 4.4 or higher (local or cloud instance)
- **Google Gemini API**: Active API key

### Frontend (Node.js)
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher (comes with Node.js)

### Optional
- **Docker**: 20.10 or higher (for MongoDB setup)
- **Docker Compose**: 2.0 or higher

## Backend Dependencies

### Core Dependencies
```go
github.com/gorilla/mux v1.8.1        // HTTP router
github.com/gorilla/websocket v1.5.3  // WebSocket support
github.com/joho/godotenv v1.5.1      // Environment variables
go.mongodb.org/mongo-driver v1.17.4  // MongoDB driver
golang.org/x/crypto v0.33.0          // Password hashing
```

### Indirect Dependencies
```go
github.com/golang/snappy v1.0.0
github.com/klauspost/compress v1.16.7
github.com/montanaflynn/stats v0.7.1
github.com/xdg-go/pbkdf2 v1.0.0
github.com/xdg-go/scram v1.1.2
github.com/xdg-go/stringprep v1.0.4
github.com/youmark/pkcs8 v0.2.0
golang.org/x/sync v0.11.0
golang.org/x/text v0.22.0
```

## Frontend Dependencies

### Core Dependencies
```json
{
  "next": "15.3.5",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

### UI Dependencies
```json
{
  "@tailwindcss/forms": "^0.5.10",
  "@tailwindcss/typography": "^0.5.16",
  "autoprefixer": "^10.4.21",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "lucide-react": "^0.535.0",
  "postcss": "^8.5.6",
  "tailwindcss": "^3.4.17"
}
```

## External Services

### MongoDB
- **Version**: 4.4 or higher
- **Connection**: Local or cloud instance
- **Database**: ChatbotAI
- **Collections**: agents, sessions, messages

### Google Gemini AI
- **API Version**: v1beta
- **Model**: gemini-pro
- **Authentication**: API Key
- **Rate Limits**: Check Google AI Studio dashboard

## System Requirements

### Minimum Hardware
- **RAM**: 2GB (4GB recommended)
- **Storage**: 1GB free space
- **CPU**: 2 cores (4 cores recommended)

### Network
- **Backend Port**: 8080 (configurable)
- **Frontend Port**: 3000 (configurable)
- **MongoDB Port**: 27017 (default)
- **WebSocket**: Same as backend port

## Browser Support

### Frontend Compatibility
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### WebSocket Support
All modern browsers support WebSocket connections.

## Development Tools

### Recommended IDEs
- **VS Code**: With Go and JavaScript extensions
- **GoLand**: For Go development
- **WebStorm**: For JavaScript/React development

### Useful Extensions
- **Go**: Official Go extension
- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **MongoDB**: Database management

## Version Check Commands

### Check Go Version
```bash
go version
# Expected: go version go1.24.3 darwin/amd64
```

### Check Node.js Version
```bash
node --version
# Expected: v18.0.0 or higher

npm --version
# Expected: 8.0.0 or higher
```

### Check MongoDB Version
```bash
mongod --version
# Expected: db version v4.4.x or higher
```

### Check Docker Version
```bash
docker --version
# Expected: Docker version 20.10.x or higher

docker-compose --version
# Expected: Docker Compose version 2.x.x
```

## Installation Commands

### macOS (using Homebrew)
```bash
# Install Go
brew install go

# Install Node.js
brew install node

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Install Docker
brew install --cask docker
```

### Ubuntu/Debian
```bash
# Install Go
sudo apt update
sudo apt install golang-go

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Docker
sudo apt-get update
sudo apt-get install docker.io docker-compose
```

### Windows
- **Go**: Download from https://golang.org/dl/
- **Node.js**: Download from https://nodejs.org/
- **MongoDB**: Download from https://www.mongodb.com/try/download/community
- **Docker**: Download Docker Desktop from https://www.docker.com/products/docker-desktop

## Troubleshooting

### Common Version Issues
1. **Go version too old**: Update Go to 1.24.3+
2. **Node.js version too old**: Update Node.js to 18+
3. **MongoDB connection failed**: Check if MongoDB is running
4. **Port already in use**: Change port in .env file

### Performance Issues
1. **Slow build times**: Ensure sufficient RAM (4GB+)
2. **MongoDB slow**: Add indexes to frequently queried fields
3. **WebSocket disconnections**: Check network stability
