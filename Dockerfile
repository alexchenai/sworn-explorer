FROM golang:1-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY main.go .
RUN CGO_ENABLED=0 go build -o server .

FROM alpine:3.21
WORKDIR /app
COPY --from=builder /build/server .
COPY static/ ./static/
CMD ["./server"]
