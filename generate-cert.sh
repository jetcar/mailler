#!/bin/bash

# Generate Self-Signed SSL Certificate for HAProxy
# Bash script for Linux/Mac

echo "🔐 Generating Self-Signed SSL Certificate for HAProxy"
echo "====================================================="
echo ""

# Create certs directory if it doesn't exist
CERTS_DIR="./certs"
mkdir -p "$CERTS_DIR"
echo "✅ Created certs directory"

# Certificate details
CERT_NAME="localhost"
VALID_DAYS=365

echo "Generating certificate for: $CERT_NAME"
echo "Valid for: $VALID_DAYS days"
echo ""

# Check if OpenSSL is available
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL is required but not installed."
    echo "   Please install OpenSSL and try again."
    exit 1
fi

echo "Using OpenSSL to generate certificate..."

# Generate private key
openssl genrsa -out "$CERTS_DIR/localhost.key" 2048 2>/dev/null

# Generate certificate
openssl req -new -x509 \
    -key "$CERTS_DIR/localhost.key" \
    -out "$CERTS_DIR/localhost.crt" \
    -days $VALID_DAYS \
    -subj "/C=US/ST=State/L=City/O=Mailler/CN=localhost" \
    2>/dev/null

# Combine for HAProxy (PEM format: key + cert)
cat "$CERTS_DIR/localhost.key" "$CERTS_DIR/localhost.crt" > "$CERTS_DIR/localhost.pem"

# Set proper permissions
chmod 600 "$CERTS_DIR/localhost.key"
chmod 644 "$CERTS_DIR/localhost.crt"
chmod 600 "$CERTS_DIR/localhost.pem"

echo "✅ Certificate generated successfully!"
echo ""
echo "Files created:"
echo "  - $CERTS_DIR/localhost.key"
echo "  - $CERTS_DIR/localhost.crt"
echo "  - $CERTS_DIR/localhost.pem (for HAProxy)"
echo ""
echo "⚠️  Security Note:"
echo "   This is a SELF-SIGNED certificate for DEVELOPMENT only!"
echo "   Browsers will show security warnings."
echo "   For production, use a certificate from a trusted CA (Let's Encrypt, etc.)"
echo ""
echo "Next steps:"
echo "1. Start HAProxy with the generated certificate"
echo "2. Access your application at https://localhost"
echo "3. Accept the browser security warning for the self-signed cert"
echo ""
