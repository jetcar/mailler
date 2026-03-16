# Mailler - Quick Start Guide

## For Developers (Test Mode with Auto-Login)

**Super Quick Start:**

```powershell
# Windows
.\start-test.ps1

# Linux/Mac
chmod +x start-test.sh
./start-test.sh
```

This starts all services with the test OIDC provider. Login is automatic - just click login and you're in as `test@example.com`!

**Manual Start:**

```powershell
docker-compose --env-file .env.test up -d
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000  
- Test OIDC: http://localhost:9000
- HAProxy: https://localhost

**Stop:**
```powershell
docker-compose --env-file .env.test down
```

## For Production/Testing with OIDC provider

```powershell
# Start with real OIDC
docker-compose up -d

# Access via HAProxy
# https://localhost
```

## What's the Difference?

| Mode | OIDC Provider | Login | Best For |
|------|---------------|-------|----------|
| **Test** (.env.test) | Local container (auto-approve) | Automatic | Development, Testing UI/features |
| **Production** (.env) | OIDC provider | Real auth | Production, Security testing |

## Documentation

- [Docker Test OIDC Setup](DOCKER_TEST_OIDC.md) - Complete Docker configuration guide
- [Test OIDC Provider](test-oidc-provider/README.md) - Standalone test provider docs
- [Quick Start](QUICKSTART.md) - Original quickstart guide
- [Docker Setup](DOCKER_SETUP.md) - Docker configuration details

## Common Tasks

**View logs:**
```powershell
docker-compose logs -f backend
docker-compose logs -f test-oidc-provider
```

**Rebuild after code changes:**
```powershell
docker-compose --env-file .env.test up -d --build
```

**Reset database:**
```powershell
docker-compose down -v
docker-compose --env-file .env.test up -d
```

**Switch between modes:**
```powershell
# To test mode
docker-compose down
docker-compose --env-file .env.test up -d

# To production mode  
docker-compose --env-file .env.test down
docker-compose up -d
```
