#!/bin/bash

echo ""
echo "========================================"
echo "Test OIDC Provider - Quick Start"
echo "========================================"
echo ""

# Navigate to test-oidc-provider directory
cd test-oidc-provider

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
    echo ""
fi

# Display configuration
echo "📋 Configuration:"
echo "  Issuer: http://localhost:9000"
echo "  Client ID: MailuId"
echo "  Client Secret: local-test-client-secret"
echo "  Test User: test@example.com"
echo ""

echo "🚀 Starting Test OIDC Provider..."
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start
