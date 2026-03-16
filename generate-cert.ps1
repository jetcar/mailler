# Generate Self-Signed SSL Certificate for HAProxy
# PowerShell script for Windows

Write-Host "🔐 Generating Self-Signed SSL Certificate for HAProxy" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Create certs directory if it doesn't exist
$certsDir = ".\certs"
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir | Out-Null
    Write-Host "✅ Created certs directory" -ForegroundColor Green
}

# Certificate details
$certName = "localhost"
$validDays = 365

Write-Host "Generating certificate for: $certName" -ForegroundColor Yellow
Write-Host "Valid for: $validDays days" -ForegroundColor Yellow
Write-Host ""

# Check if OpenSSL is available
try {
    $null = Get-Command openssl -ErrorAction Stop
    $useOpenSSL = $true
}
catch {
    $useOpenSSL = $false
    Write-Host "⚠️  OpenSSL not found, using native Windows method" -ForegroundColor Yellow
}

if ($useOpenSSL) {
    # Using OpenSSL (if available)
    Write-Host "Using OpenSSL to generate certificate..." -ForegroundColor Cyan
    
    # Generate private key
    openssl genrsa -out "$certsDir\localhost.key" 2048 2>$null
    
    # Generate certificate
    $subj = "/C=US/ST=State/L=City/O=Mailler/CN=localhost"
    openssl req -new -x509 -key "$certsDir\localhost.key" -out "$certsDir\localhost.crt" -days $validDays -subj $subj 2>$null
    
    # Combine for HAProxy (PEM format: key + cert)
    Get-Content "$certsDir\localhost.key", "$certsDir\localhost.crt" | Set-Content "$certsDir\localhost.pem"
    
    Write-Host "✅ Certificate generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files created:" -ForegroundColor Yellow
    Write-Host "  - $certsDir\localhost.key" -ForegroundColor White
    Write-Host "  - $certsDir\localhost.crt" -ForegroundColor White
    Write-Host "  - $certsDir\localhost.pem (for HAProxy)" -ForegroundColor Green
    
}
else {
    # Using Windows native certificate generation
    Write-Host "Using Windows native certificate generation..." -ForegroundColor Cyan
    
    # Create self-signed certificate
    $cert = New-SelfSignedCertificate `
        -DnsName "localhost", "127.0.0.1" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -NotAfter (Get-Date).AddDays($validDays) `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -HashAlgorithm SHA256 `
        -KeyUsage DigitalSignature, KeyEncipherment `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1") `
        -FriendlyName "Mailler HAProxy Certificate"
    
    # Export certificate with private key
    $password = ConvertTo-SecureString -String "temp" -Force -AsPlainText
    $pfxPath = "$certsDir\localhost.pfx"
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null
    
    # Convert to PEM format for HAProxy
    # Note: This requires OpenSSL. If not available, manual conversion needed
    if ($useOpenSSL) {
        openssl pkcs12 -in "$pfxPath" -out "$certsDir\localhost.pem" -nodes -password pass:temp 2>$null
        Remove-Item $pfxPath
        Write-Host "✅ Certificate generated and converted to PEM format!" -ForegroundColor Green
    }
    else {
        Write-Host "✅ Certificate generated!" -ForegroundColor Green
        Write-Host "⚠️  Manual conversion to PEM required for HAProxy" -ForegroundColor Yellow
        Write-Host "   Please install OpenSSL and run:" -ForegroundColor Yellow
        Write-Host "   openssl pkcs12 -in $pfxPath -out $certsDir\localhost.pem -nodes -password pass:temp" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Certificate Thumbprint: $($cert.Thumbprint)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "⚠️  Security Note:" -ForegroundColor Yellow
Write-Host "   This is a SELF-SIGNED certificate for DEVELOPMENT only!" -ForegroundColor Yellow
Write-Host "   Browsers will show security warnings." -ForegroundColor Yellow
Write-Host "   For production, use a certificate from a trusted CA (Let's Encrypt, etc.)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start HAProxy with the generated certificate" -ForegroundColor White
Write-Host "2. Access your application at https://localhost" -ForegroundColor White
Write-Host "3. Accept the browser security warning for the self-signed cert" -ForegroundColor White
Write-Host ""
