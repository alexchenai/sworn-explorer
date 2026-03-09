# Stage 1: Build Next.js static export
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Build Go binary
FROM golang:1-alpine AS backend
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY main.go .
RUN CGO_ENABLED=0 go build -o server .

# Stage 3: Final image
FROM alpine:3.21
WORKDIR /app
COPY --from=backend /build/server .
COPY --from=frontend /frontend/out ./static/
CMD ["./server"]
