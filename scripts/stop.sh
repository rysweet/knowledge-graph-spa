#!/bin/bash

# COBOL Knowledge Graph SPA - Stop Script
echo "🛑 Stopping COBOL Knowledge Graph SPA..."

# Kill all related processes
echo "Stopping React development server..."
pkill -f "react-scripts start" 2>/dev/null || true

echo "Stopping Node.js backend server..."
pkill -f "node.*server.js" 2>/dev/null || true

echo "Stopping npm processes..."
pkill -f "npm run" 2>/dev/null || true

# Force kill processes on specific ports
echo "Freeing ports 3001 and 3002..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

# Verify ports are free
echo "Verifying ports are free..."
if lsof -i:3001 >/dev/null 2>&1; then
    echo "⚠️  Port 3001 still in use"
else
    echo "✅ Port 3001 is free"
fi

if lsof -i:3002 >/dev/null 2>&1; then
    echo "⚠️  Port 3002 still in use"
else
    echo "✅ Port 3002 is free"
fi

echo "🛑 COBOL Knowledge Graph SPA stopped"