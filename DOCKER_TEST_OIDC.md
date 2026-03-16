# Docker Compose with Test OIDC Provider

You can run Mailler with either the test OIDC provider or OIDC provider.

## Option 1: Using Test OIDC Provider (Recommended for Development)

The test OIDC provider is included in docker-compose and will auto-approve all logins with a hardcoded test user.

**Start everything with test OIDC:**

```powershell
# Use the test environment file
docker-compose --env-file .env.test up
```

Or create a `.env.local` file (ignored by git):
```bash
cp .env.test .env.local
docker-compose --env-file .env.local up
```

**Configuration (.env.test):**
- OIDC Provider runs in Docker at `http://test-oidc-provider:9000`
- Backend connects to test provider internally
- Test user: `test@example.com`
- No external authentication required

**Access points:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Test OIDC Provider: http://localhost:9000
- HAProxy: https://localhost

## Option 2: Using OIDC provider (Production-like)

Use the default `.env` file for OIDC provider:

```powershell
docker-compose up
```

**Configuration (.env):**
- OIDC Provider: https://your-oidc-provider.example.com/openidc
- Requires valid OIDC provider credentials
- Real authentication flow

## Switching Between Providers

**Switch to test provider:**
```powershell
docker-compose --env-file .env.test down
docker-compose --env-file .env.test up -d
```

**Switch to OIDC provider:**
```powershell
docker-compose down
docker-compose up -d
```

## Test OIDC Provider Endpoints

When running with `.env.test`, you can access:

- **Discovery:** http://localhost:9000/.well-known/openid-configuration
- **JWKS:** http://localhost:9000/.well-known/jwks.json
- **Health:** http://localhost:9000/health
- **Root:** http://localhost:9000/

## Services in docker-compose.yml

All services (when using .env.test):

1. **postgres** - Database (port 5432)
2. **backend** - Node.js API (port 3000)
3. **frontend** - React app (port 5173)
4. **test-oidc-provider** - Test OIDC (port 9000) - *only used with .env.test*
5. **haproxy** - Reverse proxy (ports 80, 443, 8404)

## Environment Files

| File | Purpose | OIDC Provider | Git Tracked |
|------|---------|---------------|-------------|
| `.env` | Production config | OIDC provider | Yes (template) |
| `.env.test` | Test/dev config | test-oidc-provider | Yes |
| `.env.local` | Local overrides | Your choice | No (gitignored) |

## Quick Start for New Developers

1. **Clone repository**
2. **Start with test provider:**
   ```powershell
   docker-compose --env-file .env.test up -d
   ```
3. **Open browser:** http://localhost:5173
4. **Click login** - You'll be auto-logged in as test@example.com
5. **Start coding!** Changes hot-reload automatically

## Debugging

**View logs:**
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f test-oidc-provider
```

**Check OIDC provider is running:**
```powershell
curl http://localhost:9000/health
```

**Test OIDC discovery:**
```powershell
curl http://localhost:9000/.well-known/openid-configuration
```

## Production Deployment

For production, **never** use the test OIDC provider. Use `.env` with real authentication:

```bash
# Production - use OIDC provider or other real OIDC provider
docker-compose -f docker-compose.yml up -d
```

Make sure to:
- Set strong SESSION_SECRET and ENCRYPTION_KEY
- Use HTTPS only
- Configure proper OIDC credentials
- Remove test-oidc-provider from production docker-compose

## Troubleshooting

**Backend can't connect to test-oidc-provider:**
- Make sure using `.env.test` (not `.env`)
- Check `OIDC_ISSUER=http://test-oidc-provider:9000` (container name, not localhost)
- Verify test-oidc-provider is running: `docker-compose ps`

**Login redirects fail:**
- Check `OIDC_CALLBACK_URL` matches your backend URL
- For Docker: `http://localhost:3000/auth/callback`
- For HAProxy: `https://localhost/webmail/oauth2/authorize`

**Port conflicts:**
- Test OIDC uses port 9000
- Change in docker-compose.yml if needed

## Advanced: Custom Test User

Edit `.env.test` or docker-compose.yml environment variables:

```yaml
test-oidc-provider:
  environment:
    USER_EMAIL: custom@example.com
    USER_NAME: Custom User
    USER_SUB: custom-user-id
```

Restart:
```powershell
docker-compose --env-file .env.test restart test-oidc-provider
```
