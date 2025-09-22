#!/bin/bash

# COBOL Knowledge Graph SPA - Status Script
echo "🔍 COBOL Knowledge Graph SPA Status Check"
echo ""

# Check frontend
echo "📱 Frontend (http://localhost:3002):"
if curl -s http://localhost:3002 >/dev/null 2>&1; then
    echo "   ✅ RUNNING"
else
    echo "   ❌ NOT RUNNING"
fi

# Check backend API
echo "🔌 Backend API (http://localhost:3001):"
if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "   ✅ RUNNING"
    # Get health check details
    HEALTH=$(curl -s http://localhost:3001/api/health)
    echo "   📊 $HEALTH"
else
    echo "   ❌ NOT RUNNING"
fi

# Check graph status
echo "🗄️  Knowledge Graph:"
if curl -s http://localhost:3001/api/graph/status >/dev/null 2>&1; then
    STATUS=$(curl -s http://localhost:3001/api/graph/status)
    echo "   ✅ CONNECTED"
    echo "   📊 $STATUS"
else
    echo "   ❌ NOT ACCESSIBLE"
fi

# Check ports
echo "🔗 Port Usage:"
if lsof -i:3001 >/dev/null 2>&1; then
    PID_3001=$(lsof -ti:3001)
    echo "   Port 3001: ✅ USED (PID: $PID_3001)"
else
    echo "   Port 3001: ❌ FREE"
fi

if lsof -i:3002 >/dev/null 2>&1; then
    PID_3002=$(lsof -ti:3002)
    echo "   Port 3002: ✅ USED (PID: $PID_3002)"
else
    echo "   Port 3002: ❌ FREE"
fi

echo ""
echo "🎯 Access URLs:"
echo "   Frontend: http://localhost:3002"
echo "   Backend:  http://localhost:3001/api/health"