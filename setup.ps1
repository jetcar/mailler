# Mailler Setup Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "🚀 Mailler Setup Script" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host ""

# Check for required tools
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

try {
    $null = Get-Command node -ErrorAction Stop
    $null = Get-Command npm -ErrorAction Stop
    Write-Host "✅ Prerequisites check passed" -ForegroundColor Green
}
catch {
    Write-Host "❌ Node.js and npm are required but not installed. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Backend setup
Write-Host "📦 Setting up backend..." -ForegroundColor Yellow
Set-Location backend

if (-not (Test-Path .env)) {
    Write-Host "Creating .env file from template..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit backend\.env with your actual configuration!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Required settings:" -ForegroundColor Yellow
    Write-Host "  - Database credentials (DB_USER, DB_PASSWORD, DB_NAME)"
    Write-Host "  - OIDC provider details (OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET)"
    Write-Host "  - SESSION_SECRET and ENCRYPTION_KEY"
    Write-Host ""
}

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
npm install

Write-Host "✅ Backend setup complete" -ForegroundColor Green
Write-Host ""

# Frontend setup
Write-Host "📦 Setting up frontend..." -ForegroundColor Yellow
Set-Location ..\frontend

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
npm install

Write-Host "✅ Frontend setup complete" -ForegroundColor Green
Write-Host ""

# Database setup
Write-Host "🗄️  Database Migration" -ForegroundColor Yellow
Write-Host ""
Write-Host "The application will automatically:" -ForegroundColor Cyan
Write-Host "  ✅ Create the database if it doesn't exist"
Write-Host "  ✅ Apply all pending migrations on startup"
Write-Host ""
Write-Host "This works similar to Entity Framework Core in .NET!" -ForegroundColor Green
Write-Host ""
Write-Host "You can also run migrations manually:" -ForegroundColor Cyan
Write-Host "  cd backend; npm run migrate"
Write-Host ""

$runMigrations = Read-Host "Do you want to run database migrations now? [y/N]"
if ($runMigrations -eq 'y' -or $runMigrations -eq 'Y') {
    Set-Location ..\backend
    Write-Host "Running migrations..." -ForegroundColor Cyan
    npm run migrate
    Write-Host ""
}

Set-Location ..

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure OIDC provider (Auth0, Keycloak, etc.)"
Write-Host "2. Update backend\.env with your OIDC credentials and database settings"
Write-Host "3. Generate secure SESSION_SECRET and ENCRYPTION_KEY:"
Write-Host "   node -e ""console.log(require('crypto').randomBytes(32).toString('hex'))"""
Write-Host "4. Start the services:"
Write-Host "   cd backend; npm run dev    # Migrations run automatically on startup!"
Write-Host "   cd frontend; npm run dev"
Write-Host "5. Visit http://localhost:5173"
Write-Host ""
Write-Host "For Docker deployment:" -ForegroundColor Yellow
Write-Host "   docker-compose up -d"
Write-Host ""
Write-Host "💡 The application uses automatic migrations - no psql/createdb needed!" -ForegroundColor Cyan
Write-Host ""
