#!/bin/bash

# COBOL Knowledge Graph SPA Status Check

echo "🔍 COBOL Knowledge Graph SPA Status Check"
echo "========================================"

# Check Neo4j
echo -n "Neo4j Database: "
if curl -f http://localhost:7989 &> /dev/null; then
    echo "✅ Running (http://localhost:7989)"
else
    echo "❌ Not accessible"
fi

# Check Backend API
echo -n "Backend API: "
if curl -f http://localhost:3001/api/health &> /dev/null; then
    echo "✅ Running (http://localhost:3001)"

    # Test graph data
    echo -n "  Graph Data: "
    GRAPH_RESPONSE=$(curl -s http://localhost:3001/api/stats)
    if echo "$GRAPH_RESPONSE" | grep -q "nodeCount"; then
        NODE_COUNT=$(echo "$GRAPH_RESPONSE" | grep -o '"nodeCount":[0-9]*' | cut -d: -f2)
        REL_COUNT=$(echo "$GRAPH_RESPONSE" | grep -o '"relCount":[0-9]*' | cut -d: -f2)
        echo "✅ $NODE_COUNT nodes, $REL_COUNT relationships"
    else
        echo "❌ No data available"
    fi
else
    echo "❌ Not running"
fi

# Check Frontend
echo -n "Frontend React App: "
if curl -f http://localhost:3000 &> /dev/null; then
    echo "✅ Running (http://localhost:3000)"
else
    echo "❌ Not running"
fi

echo ""
echo "🎯 Quick Test Commands:"
echo "  Backend Health: curl http://localhost:3001/api/health"
echo "  Graph Stats:    curl http://localhost:3001/api/stats"
echo "  Frontend:       open http://localhost:3000"
echo ""
echo "🚀 To start the SPA: ./start.sh"