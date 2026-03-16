#!/bin/bash

echo ""
echo "========================================"
echo "Mailler - Starting with Test OIDC"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker."
    echo ""
    exit 1
fi

echo "📋 Configuration:"
echo "  Environment: .env.test"
echo "  OIDC Provider: Test (Docker container)"
echo "  Test User: test@example.com"
echo ""

echo "🚀 Starting services with test OIDC provider..."
echo ""

# Start docker-compose with test environment
docker-compose --env-file .env.test up -d

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to start services"
    echo ""
    exit 1
fi

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 3

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "========================================"
echo "✅ Services Started Successfully!"
echo "========================================"
echo ""

echo "Access Points:"
echo "  🌐 Frontend:       http://localhost:5173"
echo "  🔧 Backend API:    http://localhost:3000"
echo "  🔐 Test OIDC:      http://localhost:9000"
echo "  🔀 HAProxy Stats:  http://localhost:8404/stats"
echo ""

echo "Quick Actions:"
echo "  🔍 View logs:      docker-compose logs -f"
echo "  🛑 Stop services:  docker-compose --env-file .env.test down"
echo "  🔄 Restart:        docker-compose --env-file .env.test restart"
echo ""

echo "Test Login Flow:"
echo "  1. Open http://localhost:5173 in browser"
echo "  2. Click login/sign in"
echo "  3. You'll be auto-logged in as test@example.com"
echo "  4. No password needed!"
echo ""

echo "Press Ctrl+C to stop following logs."
echo ""

# Follow logs
docker-compose logs -f
