# Quick Start with Test OIDC Provider
# This script starts all services using the test OIDC provider

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Mailler - Starting with Test OIDC" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker ps | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop.`n" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Environment: .env.test" -ForegroundColor White
Write-Host "  OIDC Provider: Test (Docker container)" -ForegroundColor White
Write-Host "  Test User: test@example.com`n" -ForegroundColor White

Write-Host "🚀 Starting services with test OIDC provider..." -ForegroundColor Green
Write-Host ""

# Start docker-compose with test environment
docker-compose --env-file .env.test up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Failed to start services`n" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check service status
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker-compose ps

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ Services Started Successfully!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Access Points:" -ForegroundColor Yellow
Write-Host "  🌐 Frontend:       http://localhost:5173" -ForegroundColor White
Write-Host "  🔧 Backend API:    http://localhost:3000" -ForegroundColor White
Write-Host "  🔐 Test OIDC:      http://localhost:9000" -ForegroundColor White
Write-Host "  🔀 HAProxy Stats:  http://localhost:8404/stats" -ForegroundColor White
Write-Host ""

Write-Host "Quick Actions:" -ForegroundColor Yellow
Write-Host "  🔍 View logs:      docker-compose logs -f" -ForegroundColor White
Write-Host "  🛑 Stop services:  docker-compose --env-file .env.test down" -ForegroundColor White
Write-Host "  🔄 Restart:        docker-compose --env-file .env.test restart" -ForegroundColor White
Write-Host ""

Write-Host "Test Login Flow:" -ForegroundColor Yellow
Write-Host "  1. Open http://localhost:5173 in browser" -ForegroundColor White
Write-Host "  2. Click login/sign in" -ForegroundColor White
Write-Host "  3. You'll be auto-logged in as test@example.com" -ForegroundColor White
Write-Host "  4. No password needed!" -ForegroundColor White
Write-Host ""

Write-Host "Press Ctrl+C to stop following logs, or close this window.`n" -ForegroundColor Gray

# Follow logs
docker-compose logs -f
