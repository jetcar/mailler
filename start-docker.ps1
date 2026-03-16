# Quick Start Script for Docker Compose Setup
# PowerShell edition

Write-Host "🐳 Mailler Docker Compose Quick Start" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    $null = docker ps 2>&1
}
catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item .env.docker .env
    Write-Host "✅ .env file created" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Edit .env file with your OIDC credentials!" -ForegroundColor Yellow
    Write-Host "   Required:" -ForegroundColor Yellow
    Write-Host "   - OIDC_CLIENT_ID" -ForegroundColor White
    Write-Host "   - OIDC_CLIENT_SECRET" -ForegroundColor White
    Write-Host "   - SESSION_SECRET (run: node -e ""console.log(require('crypto').randomBytes(32).toString('hex'))"")" -ForegroundColor White
    Write-Host "   - ENCRYPTION_KEY (run: node -e ""console.log(require('crypto').randomBytes(32).toString('hex'))"")" -ForegroundColor White
    Write-Host ""
    
    $continue = Read-Host "Press Enter when you've updated .env, or 'skip' to continue anyway"
    if ($continue -eq 'skip') {
        Write-Host "⚠️  Continuing without updating .env - OIDC login will not work!" -ForegroundColor Yellow
    }
}

# Check if SSL certificate exists
if (-not (Test-Path "certs/localhost.pem")) {
    Write-Host ""
    Write-Host "🔐 Generating SSL certificate..." -ForegroundColor Yellow
    & .\generate-cert.ps1
    Write-Host ""
}

# Start Docker Compose
Write-Host ""
Write-Host "🚀 Starting Docker Compose..." -ForegroundColor Cyan
Write-Host ""

$build = Read-Host "Build images? (recommended for first run) [Y/n]"
if ($build -eq '' -or $build -eq 'y' -or $build -eq 'Y') {
    Write-Host "Building and starting services..." -ForegroundColor Yellow
    docker-compose up --build
}
else {
    Write-Host "Starting services..." -ForegroundColor Yellow
    docker-compose up
}
