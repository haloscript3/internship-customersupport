FROM golang:1.24.3

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN go build -o /app/server . && chmod +x /app/server

EXPOSE 8080

CMD ["/app/server"]
