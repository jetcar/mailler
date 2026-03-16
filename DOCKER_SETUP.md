# Docker Compose Setup Guide

Complete guide for running Mailler with Docker Compose, including hot-reload support and persistent node_modules.

## Features

✅ **Hot Reload** - Frontend and backend code changes are reflected immediately  
✅ **Persistent node_modules** - Dependencies are cached in Docker volumes  
✅ **HTTPS with HAProxy** - Self-signed certificate for development  
✅ **Auto Migrations** - Database created and migrated automatically  
✅ **Single Command Setup** - Everything starts with `docker-compose up`  

## Quick Start

### 1. Generate SSL Certificate

**Windows:**
```powershell
.\generate-cert.ps1
```

**Linux/Mac:**
```bash
chmod +x generate-cert.sh
./generate-cert.sh
```

This creates `certs/localhost.pem` for HAProxy.

### 2. Configure Environment

Copy the Docker environment template:
```powershell
cp .env.docker .env
```

Edit `.env` with your credentials:
```env
# OpenID Connect
OIDC_ISSUER=https://your-oidc-provider.example.com/openidc/
OIDC_CLIENT_ID=your_client_id
OIDC_CLIENT_SECRET=your_client_secret
OIDC_CALLBACK_URL=https://localhost/webmail/oauth2/authorize

# Session Secrets (generate secure random strings)
SESSION_SECRET=your_random_32_char_secret
ENCRYPTION_KEY=your_random_32_char_key
```

**Generate secure secrets:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start Everything

**Build and start all services:**
```powershell
docker-compose up --build
```

**Or run in background:**
```powershell
docker-compose up -d --build
```

**View logs:**
```powershell
docker-compose logs -f
```

### 4. Access the Application

Open your browser to: **https://localhost**

Accept the self-signed certificate warning and you're ready!

## How It Works

### Architecture

```
Docker Compose Network
├── PostgreSQL (port 5432)
├── Backend (Node.js - port 3000)
│   ├── Source code mounted from ./backend/src
│   └── node_modules in Docker volume (cached)
├── Frontend (Vite - port 5173)
│   ├── Source code mounted from ./frontend/src
│   └── node_modules in Docker volume (cached)
└── HAProxy (ports 80, 443, 8404)
    └── Routes to backend/frontend
```

### Hot Reload Explained

**Frontend (Vite):**
- Source files (`frontend/src/*`) are mounted as volumes
- Vite watches for changes and hot-reloads automatically
- Changes appear in browser immediately

**Backend (Nodemon):**
- Source files (`backend/src/*`) are mounted as volumes
- Nodemon watches for changes and restarts server
- API changes take effect immediately

**node_modules Strategy:**
- Installed inside container during `docker-compose build`
- Stored in named Docker volumes (`backend_node_modules`, `frontend_node_modules`)
- Persisted between container restarts
- No need to re-download dependencies!

### Volume Mounts

**Backend volumes:**
```yaml
volumes:
  - ./backend/src:/app/src:ro          # Source code (read-only)
  - ./backend/tests:/app/tests:ro      # Tests
  - ./database:/app/database:ro        # Migrations
  - backend_node_modules:/app/node_modules  # Cached dependencies
```

**Frontend volumes:**
```yaml
volumes:
  - ./frontend/src:/app/src            # Source code (read-write for HMR)
  - ./frontend/index.html:/app/index.html
  - frontend_node_modules:/app/node_modules  # Cached dependencies
```

## Development Workflow

### Make Code Changes

**Edit Frontend Files:**
```powershell
# Edit any file in frontend/src
notepad frontend/src/components/Inbox.jsx
```
→ Changes appear in browser immediately (HMR)

**Edit Backend Files:**
```powershell
# Edit any file in backend/src
notepad backend/src/routes/messages.js
```
→ Server restarts automatically (Nodemon)

**Add Dependencies:**

If you add new npm packages, rebuild:
```powershell
# For backend
docker-compose build backend
docker-compose up -d backend

# For frontend
docker-compose build frontend
docker-compose up -d frontend
```

Or rebuild everything:
```powershell
docker-compose up --build
```

### Database Changes

**Add Migration:**
1. Create new SQL file: `database/migrations/005_new_feature.sql`
2. Restart backend: `docker-compose restart backend`
3. Migration runs automatically on startup

**Reset Database:**
```powershell
docker-compose down -v  # Removes all volumes including database
docker-compose up --build
```

### View Logs

**All services:**
```powershell
docker-compose logs -f
```

**Specific service:**
```powershell
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f haproxy
```

### Access Services Directly

While HAProxy routes everything through https://localhost, you can access services directly:

**Backend API:**
```
http://localhost:3000/health
http://localhost:3000/api/messages
```

**Frontend Dev Server:**
```
http://localhost:5173
```

**PostgreSQL:**
```powershell
docker-compose exec postgres psql -U mailler_user -d mailler
```

**HAProxy Stats:**
```
http://localhost:8404/stats
```

## Common Tasks

### Stop All Services

```powershell
docker-compose down
```

### Stop and Remove Volumes (Clean Slate)

```powershell
docker-compose down -v
```

**Warning:** This deletes the database and node_modules caches!

### Restart Single Service

```powershell
docker-compose restart backend
docker-compose restart frontend
```

### Rebuild After Package Changes

```powershell
docker-compose up --build backend
```

### Shell Access

**Backend container:**
```powershell
docker-compose exec backend sh
```

**Frontend container:**
```powershell
docker-compose exec frontend sh
```

**PostgreSQL:**
```powershell
docker-compose exec postgres psql -U mailler_user -d mailler
```

### Check Service Status

```powershell
docker-compose ps
```

### Update Dependencies

**Option 1: Inside container**
```powershell
docker-compose exec backend npm install new-package
docker-compose restart backend
```

**Option 2: Locally then rebuild**
```powershell
cd backend
npm install new-package
cd ..
docker-compose up --build backend
```

## Troubleshooting

### Port Already in Use

**Error:** `Bind for 0.0.0.0:443 failed: port is already allocated`

**Solutions:**
1. Stop other services using port 443
2. Change port in `docker-compose.yml`:
   ```yaml
   haproxy:
     ports:
       - "8443:443"  # Use port 8443 instead
   ```

### Frontend Not Hot Reloading

**Check:**
1. Verify volumes are mounted: `docker-compose exec frontend ls -la /app/src`
2. Check Vite dev server is running: `docker-compose logs frontend`
3. Try accessing directly: http://localhost:5173

**Solution:** Rebuild frontend:
```powershell
docker-compose up --build frontend
```

### Backend Not Restarting on Changes

**Check:**
1. Nodemon is running: `docker-compose logs backend`
2. Files are mounted: `docker-compose exec backend ls -la /app/src`

**Solution:**
```powershell
docker-compose restart backend
docker-compose logs -f backend
```

### Database Connection Failed

**Check:**
1. PostgreSQL is healthy: `docker-compose ps`
2. Database exists: `docker-compose exec postgres psql -U mailler_user -l`

**Solution:**
```powershell
docker-compose restart postgres
docker-compose logs postgres
```

### node_modules Issues

**Symptom:** Missing dependencies, build errors

**Solution 1 - Rebuild:**
```powershell
docker-compose build --no-cache backend
docker-compose up backend
```

**Solution 2 - Clear volumes:**
```powershell
docker-compose down
docker volume rm mailler_backend_node_modules
docker-compose up --build
```

### SSL Certificate Issues

**Error:** Certificate not found in HAProxy

**Solution:**
1. Generate certificate: `.\generate-cert.ps1`
2. Check path in `haproxy.cfg`:
   ```cfg
   bind *:443 ssl crt /usr/local/etc/haproxy/certs/localhost.pem
   ```
3. Restart HAProxy: `docker-compose restart haproxy`

## Performance Tips

### Speed Up Builds

**Use BuildKit:**
```powershell
# Windows PowerShell
$env:DOCKER_BUILDKIT=1
docker-compose build

# Linux/Mac
DOCKER_BUILDKIT=1 docker-compose build
```

### Reduce Volume I/O (Windows)

On Windows, Docker Desktop volume performance can be slow.

**Option 1:** Use WSL2 backend
**Option 2:** Run Docker inside WSL2
**Option 3:** Reduce mounted files (already optimized)

### Monitor Resource Usage

```powershell
docker stats
```

## Production Deployment

For production, use a different compose file:

**docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile  # Production Dockerfile
    environment:
      NODE_ENV: production
    # No source volume mounts
    # No nodemon - use `npm start`
```

**Deploy:**
```powershell
docker-compose -f docker-compose.prod.yml up -d --build
```

## VS Code Integration

**Recommended extensions:**
- Docker
- Remote - Containers

**Attach to running container:**
1. Install "Remote - Containers" extension
2. Click Docker icon in sidebar
3. Right-click container → "Attach Visual Studio Code"
4. Edit files directly in container

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `OIDC_ISSUER` | OpenID Connect provider URL | - |
| `OIDC_CLIENT_ID` | OAuth client ID | - |
| `OIDC_CLIENT_SECRET` | OAuth client secret | - |
| `OIDC_CALLBACK_URL` | OAuth callback URL | `https://localhost/webmail/oauth2/authorize` |
| `SESSION_SECRET` | Secret for session encryption | - |
| `ENCRYPTION_KEY` | Secret for email password encryption | - |
| `FRONTEND_URL` | Frontend URL for redirects | `https://localhost` |
| `POSTGRES_USER` | PostgreSQL username | `mailler_user` |
| `POSTGRES_PASSWORD` | PostgreSQL password | - |
| `POSTGRES_DB` | PostgreSQL database name | `mailler` |

## Docker Compose Commands Reference

| Command | Description |
|---------|-------------|
| `docker-compose up` | Start all services |
| `docker-compose up -d` | Start in background (detached) |
| `docker-compose up --build` | Rebuild and start |
| `docker-compose down` | Stop all services |
| `docker-compose down -v` | Stop and remove volumes |
| `docker-compose ps` | List running services |
| `docker-compose logs -f` | Follow logs |
| `docker-compose logs -f backend` | Follow backend logs only |
| `docker-compose restart backend` | Restart backend service |
| `docker-compose exec backend sh` | Shell into backend |
| `docker-compose build` | Rebuild all images |
| `docker-compose build --no-cache` | Rebuild without cache |

---

Happy Dockerizing! 🐳
