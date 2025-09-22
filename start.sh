#!/bin/bash

# COBOL Knowledge Graph SPA - Start Script
echo "🚀 Starting COBOL Knowledge Graph SPA..."

# First, clean stop any existing instances
./stop.sh

echo "Starting backend server..."
cd backend
node server.js &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        echo "✅ Backend server is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend server failed to start"
        exit 1
    fi
    sleep 1
done

echo "Starting frontend on port 3002..."
PORT=3002 npm run client &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "Waiting for frontend to start..."
for i in {1..60}; do
    if curl -s http://localhost:3002 >/dev/null 2>&1; then
        echo "✅ Frontend is ready"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Frontend failed to start"
        exit 1
    fi
    sleep 1
done

echo ""
echo "🎉 COBOL Knowledge Graph SPA is running!"
echo "📱 Frontend: http://localhost:3002"
echo "🔌 Backend API: http://localhost:3001"
echo "❤️  Health Check: http://localhost:3001/api/health"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop: ./stop.sh"