# HAProxy Setup Guide with HTTPS

This guide shows you how to set up HAProxy as a reverse proxy with HTTPS for the Mailler application.

## Why HAProxy?

HAProxy provides:
- ✅ **HTTPS termination** - Handle SSL/TLS at the proxy level
- ✅ **Single entry point** - Access backend and frontend through one domain
- ✅ **Custom routing** - Route OIDC callbacks to specific paths
- ✅ **Load balancing** - Scale your application horizontally
- ✅ **Health checks** - Automatic failover

## Architecture

```
Browser (https://localhost)
    ↓
HAProxy (Port 443 - HTTPS)
    ↓
    ├─→ /webmail/*       → Backend (localhost:3000)
    ├─→ /api/*           → Backend (localhost:3000)
    ├─→ /auth/*          → Backend (localhost:3000)
    └─→ /*               → Frontend (localhost:5173)
```

## Prerequisites

- HAProxy installed
- Node.js and npm (for backend/frontend)
- PostgreSQL running
- OpenSSL (for certificate generation)

## Installation

### Windows

**Using Chocolatey:**
```powershell
choco install haproxy
```

**Manual Installation:**
1. Download from: https://www.haproxy.org/download/windows/
2. Extract to `C:\Program Files\HAProxy`
3. Add to PATH

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install haproxy openssl
```

### macOS

```bash
brew install haproxy
```

## Setup Steps

### Step 1: Generate SSL Certificate

**Windows (PowerShell):**
```powershell
.\generate-cert.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x generate-cert.sh
./generate-cert.sh
```

This creates:
- `certs/localhost.key` - Private key
- `certs/localhost.crt` - Certificate
- `certs/localhost.pem` - Combined file for HAProxy

### Step 2: Update HAProxy Configuration

The configuration is already provided in `haproxy.cfg`. Key sections:

**HTTPS Frontend (Port 443):**
```cfg
frontend https_frontend
    bind *:443 ssl crt /path/to/certs/localhost.pem
```

**Routing Rules:**
```cfg
# OIDC callback: /webmail/oauth2/authorize → Backend
acl is_webmail path_beg /webmail

# API routes: /api/* → Backend
acl is_api path_beg /api

# Everything else → Frontend
default_backend mailler_frontend
```

**Update certificate path in haproxy.cfg:**

For **Windows**:
```cfg
bind *:443 ssl crt C:/repo/mailler/certs/localhost.pem
```

For **Linux/Mac**:
```cfg
bind *:443 ssl crt /full/path/to/mailler/certs/localhost.pem
```

### Step 3: Configure Backend (.env)

Update `backend/.env`:

```env
# OIDC Configuration
OIDC_ISSUER=https://your-oidc-provider.example.com/openidc/
OIDC_CLIENT_ID=MailuId
OIDC_CLIENT_SECRET=your_secret_here
OIDC_CALLBACK_URL=https://localhost/webmail/auth/oauth2/authorize
OIDC_SCOPE=openid profile email

# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=https://localhost

# Session Configuration
SESSION_SECRET=your_random_secret_here
SESSION_COOKIE_DOMAIN=localhost
TRUST_PROXY=true  # Important for HAProxy!

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mailler
DB_USER=postgres
DB_PASSWORD=your_password

# Encryption
ENCRYPTION_KEY=your_32_char_key
```

### Step 4: Update OIDC Provider Configuration

In your OIDC provider application settings, update:

**Redirect URI / Callback URL:**
```
https://localhost/webmail/oauth2/authorize
```

**Post Logout Redirect URI:**
```
https://localhost
```

**Allowed CORS Origins:**
```
https://localhost
```

### Step 5: Start the Services

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

**Terminal 3 - HAProxy:**

**Windows:**
```powershell
# Update haproxy.cfg certificate path first!
haproxy -f haproxy.cfg
```

**Linux/Mac:**
```bash
# Update haproxy.cfg certificate path first!
sudo haproxy -f haproxy.cfg
```

Or run in foreground for debugging:
```powershell
haproxy -f haproxy.cfg -d
```

### Step 6: Access the Application

1. Open browser to: **https://localhost**
2. Accept the self-signed certificate warning
3. You should see the Mailler login page!

## Verification

### Test Routing

**Frontend (should work):**
```
https://localhost/
```

**Backend Health Check:**
```
https://localhost/health
```

**API Endpoint:**
```
https://localhost/api/messages
```

**OIDC Login:**
```
https://localhost/auth/login
```

**OIDC Callback:**
```
https://localhost/webmail/oauth2/authorize
```

### Test OIDC Flow

1. Go to https://localhost
2. Click "Login with OpenID Connect"
3. Should redirect to OIDC provider
4. After login, redirects to `https://localhost/webmail/auth/oauth2/authorize`
5. Then redirects back to `https://localhost` logged in!

## Troubleshooting

### HAProxy Won't Start

**Error: Cannot bind socket**
```
Solution: Check if port 443 is already in use
Windows: netstat -ano | findstr :443
Linux: sudo netstat -tlnp | grep :443
```

**Error: SSL certificate not found**
```
Solution: Update the certificate path in haproxy.cfg
Make sure to use absolute path
```

### Certificate Warnings in Browser

**Expected behavior** - Self-signed certificates always show warnings.

**To bypass:**
- Chrome: Type "thisisunsafe" on warning page
- Firefox: Click "Advanced" → "Accept the Risk and Continue"
- Edge: Click "Advanced" → "Continue to localhost"oauth2/authorize`
2. Backend route is accessible: `https://localhost/webmail
### OIDC Callback Fails

**Check:**
1. Callback URL in OIDC provider matches: `https://localhost/webmail/auth/oauth2/authorize`
2. Backend route is accessible: `https://localhost/webmail/auth/oauth2/authorize`
3. Check backend logs for errors

**Test directly:**
```powershell
curl -k https://localhost/health
```

### Session/Cookie Issues

**Symptoms:** Can't stay logged in, redirected to login repeatedly

**Solutions:**
1. Verify `TRUST_PROXY=true` in backend `.env`
2. Check `SESSION_COOKIE_DOMAIN=localhost` (no port)
3. Clear browser cookies and try again
4. Check HAProxy is setting X-Forwarded-Proto header

### CORS Errors

**Check in backend .env:**
```env
FRONTEND_URL=https://localhost
```

**Not:**
```env
FRONTEND_URL=https://localhost:5173  # Wrong!
```

## Production Deployment

For production, make these changes:

### 1. Use Real Domain

**haproxy.cfg:**
```cfg
frontend https_frontend
    bind *:443 ssl crt /path/to/real-cert.pem
```

**backend/.env:**
```env
OIDC_CALLBACK_URL=https://yourdomain.com/webmail/auth/oauth2/authorize
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
```

### 2. Get Real SSL Certificate

Use Let's Encrypt:
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

Combine for HAProxy:
```bash
sudo cat /etc/letsencrypt/live/yourdomain.com/fullchain.pem \
         /etc/letsencrypt/live/yourdomain.com/privkey.pem \
         > /path/to/haproxy/certs/yourdomain.pem
```

### 3. Build Frontend

Instead of Vite dev server, build and serve static files:

```bash
cd frontend
npm run build
```

Serve with nginx or configure HAProxy to serve static files.

### 4. Use Process Manager

**PM2 for Node.js:**
```bash
npm install -g pm2
cd backend
pm2 start src/app.js --name mailler-backend
pm2 startup
pm2 save
```

**HAProxy as Service:**

**Linux (systemd):**
```bash
sudo systemctl enable haproxy
sudo systemctl start haproxy
```

**Windows:**
Install as Windows service or use NSSM

## Advanced Configuration

### Load Balancing

Run multiple backend instances:

**haproxy.cfg:**
```cfg
backend mailler_backend
    balance roundrobin
    server backend1 localhost:3000 check
    server backend2 localhost:3001 check
    server backend3 localhost:3002 check
```

### HTTP/2 Support

**haproxy.cfg:**
```cfg
frontend https_frontend
    bind *:443 ssl crt /path/to/cert.pem alpn h2,http/1.1
```

### Rate Limiting

**haproxy.cfg:**
```cfg
frontend https_frontend
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny if { sc_http_req_rate(0) gt 100 }
```

### Logging

**Windows:**
```cfg
global
    log 127.0.0.1:514 local0
```

**Linux:**
```cfg
global
    log /dev/log local0
```

## Monitoring

### HAProxy Stats Page

Add to `haproxy.cfg`:

```cfg
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE
```

Access at: http://localhost:8404/stats

### Health Checks

HAProxy automatically checks:
```cfg
option httpchk GET /health
```

Backend must respond to `GET /health` (already implemented).

## Docker Deployment

Create `docker-compose.haproxy.yml`:

```yaml
version: '3.8'

services:
  haproxy:
    image: haproxy:2.8-alpine
    ports:
      - "80:80"
      - "443:443"
      - "8404:8404"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
      - ./certs:/usr/local/etc/haproxy/certs:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

  # ... rest of your services
```

## Security Best Practices

### Development
- ✅ Self-signed cert is OK
- ✅ Use unique SESSION_SECRET
- ✅ Don't commit .env files

### Production
- ✅ Use real SSL certificate (Let's Encrypt)
- ✅ Enable HSTS headers
- ✅ Implement rate limiting
- ✅ Regular security updates
- ✅ Monitor logs
- ✅ Use firewall rules

## Quick Reference

### Start Order
1. PostgreSQL
2. Backend (`npm run dev`)
3. Frontend (`npm run dev`)
4. HAProxy (`haproxy -f haproxy.cfg`)

### Important URLs
- Application: https://localhost
- Backend API: https://localhost/api
- Health Check: https://localhost/health
- HAProxy Stats: http://localhost:8404/stats
- OIDC Callback: https://localhost/webmail/oauth2/authorize

### Log Locations
- **Backend**: Console output
- **Frontend**: Browser console + terminal
- **HAProxy**: Console output (or syslog if configured)

## Support

If you encounter issues:
1. Check HAProxy logs: `haproxy -f haproxy.cfg -d`
2. Test routing: `curl -k https://localhost/health`
3. Verify certificate: `openssl s_client -connect localhost:443`
4. Check backend: `curl http://localhost:3000/health`

---

Happy proxying! 🚀
