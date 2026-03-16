# Test OIDC Provider - Verification Script
# This script tests all OIDC endpoints

$ISSUER = "http://localhost:9000"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Testing OIDC Provider Endpoints" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Discovery Endpoint
Write-Host "1️⃣  Testing Discovery Endpoint..." -ForegroundColor Yellow
try {
    $discovery = Invoke-RestMethod -Uri "$ISSUER/.well-known/openid-configuration" -Method Get
    Write-Host "✅ Discovery endpoint works" -ForegroundColor Green
    Write-Host "   Issuer: $($discovery.issuer)" -ForegroundColor Gray
    Write-Host "   Authorization: $($discovery.authorization_endpoint)" -ForegroundColor Gray
    Write-Host "   Token: $($discovery.token_endpoint)`n" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Discovery endpoint failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 2: JWKS Endpoint
Write-Host "2️⃣  Testing JWKS Endpoint..." -ForegroundColor Yellow
try {
    $jwks = Invoke-RestMethod -Uri "$ISSUER/.well-known/jwks.json" -Method Get
    Write-Host "✅ JWKS endpoint works" -ForegroundColor Green
    Write-Host "   Keys found: $($jwks.keys.Count)`n" -ForegroundColor Gray
}
catch {
    Write-Host "❌ JWKS endpoint failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 3: Health Endpoint
Write-Host "3️⃣  Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$ISSUER/health" -Method Get
    Write-Host "✅ Health endpoint works" -ForegroundColor Green
    Write-Host "   Status: $($health.status)`n" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Health endpoint failed: $_`n" -ForegroundColor Red
    exit 1
}

# Test 4: Authorization Flow (manual test required)
Write-Host "4️⃣  Authorization Flow Test" -ForegroundColor Yellow
Write-Host "   To test the full flow, open this URL in your browser:" -ForegroundColor White
$authUrl = "$ISSUER/authorize?client_id=MailuId&redirect_uri=http://localhost:3000/auth/callback&response_type=code&scope=openid%20profile%20email&state=test123&nonce=nonce123&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256"
Write-Host "   $authUrl" -ForegroundColor Cyan
Write-Host "   (You'll be redirected with an authorization code)`n" -ForegroundColor Gray

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ All automated tests passed!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update your Mailler .env file:" -ForegroundColor White
Write-Host "   OIDC_ISSUER=$ISSUER" -ForegroundColor Gray
Write-Host "   OIDC_CLIENT_ID=MailuId" -ForegroundColor Gray
Write-Host "   OIDC_CLIENT_SECRET=local-test-client-secret`n" -ForegroundColor Gray
Write-Host "2. Restart Mailler backend:" -ForegroundColor White
Write-Host "   docker-compose restart backend`n" -ForegroundColor Gray
Write-Host "3. Test login at:" -ForegroundColor White
Write-Host "   http://localhost:3000/auth/login`n" -ForegroundColor Gray
