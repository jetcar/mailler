#!/bin/bash

# Quick Start Script for Docker Compose Setup
# Bash edition

echo "🐳 Mailler Docker Compose Quick Start"
echo "====================================="
echo ""

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp .env.docker .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your OIDC credentials!"
    echo "   Required:"
    echo "   - OIDC_CLIENT_ID"
    echo "   - OIDC_CLIENT_SECRET"
    echo "   - SESSION_SECRET (run: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    echo "   - ENCRYPTION_KEY (run: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    echo ""
    
    read -p "Press Enter when you've updated .env, or type 'skip' to continue anyway: " continue
    if [ "$continue" = "skip" ]; then
        echo "⚠️  Continuing without updating .env - OIDC login will not work!"
    fi
fi

# Check if SSL certificate exists
if [ ! -f "certs/localhost.pem" ]; then
    echo ""
    echo "🔐 Generating SSL certificate..."
    ./generate-cert.sh
    echo ""
fi

# Start Docker Compose
echo ""
echo "🚀 Starting Docker Compose..."
echo ""

read -p "Build images? (recommended for first run) [Y/n]: " build
if [ -z "$build" ] || [ "$build" = "y" ] || [ "$build" = "Y" ]; then
    echo "Building and starting services..."
    docker-compose up --build
else
    echo "Starting services..."
    docker-compose up
fi
