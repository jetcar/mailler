# Quick Start Script for Test OIDC Provider
# Run this from the mailler root directory

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test OIDC Provider - Quick Start" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Navigate to test-oidc-provider directory
Set-Location -Path "test-oidc-provider"

# Check if node_modules exists
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed`n" -ForegroundColor Green
}

# Display configuration
Write-Host "📋 Configuration:" -ForegroundColor Cyan
Write-Host "  Issuer: http://localhost:9000" -ForegroundColor White
Write-Host "  Client ID: MailuId" -ForegroundColor White
Write-Host "  Client Secret: local-test-client-secret" -ForegroundColor White
Write-Host "  Test User: test@example.com`n" -ForegroundColor White

Write-Host "🚀 Starting Test OIDC Provider...`n" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

# Start the server
npm start
