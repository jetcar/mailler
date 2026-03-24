# Mailler Deployment Contract (Single Image UI+API)

## Goal
Deploy Mailler using one backend image that already contains frontend build assets.

The backend container serves:
- API routes
- auth routes
- frontend static SPA files

No separate frontend container is required.

## 1. Required Inputs
1. BACKEND_IMAGE
- Example: myregistry/mailler-backend:v2.0.0

2. Postgres credentials

3. OIDC values
- issuer, public issuer, client id/secret, callback URL

4. Secrets
- SESSION_SECRET
- ENCRYPTION_KEY

Optional:
- REDIS_URL (required in production)
- certs mount for SMTP TLS

## 2. Required Services
Minimum:
1. backend
2. postgres
3. oidc-provider (external or internal)

Recommended:
4. redis

## 3. Service Naming Rule
Use backend service name backend (or alias backend) because internal/proxy integrations reference backend:3000.

## 4. Port Contract
Required public port:
- 80 or 443 via reverse proxy to backend:3000

Optional exposed ports:
- 3000 (direct API/debug)
- 25, 587, 465 (SMTP)
- 5432 (postgres internal preferred)
- 6379 (redis internal preferred)

## 5. Required Backend Environment Variables
- NODE_ENV
- PORT=3000
- DATABASE_URL
- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASSWORD
- SESSION_SECRET
- ENCRYPTION_KEY
- OIDC_ISSUER
- OIDC_PUBLIC_ISSUER
- OIDC_CLIENT_ID
- OIDC_CLIENT_SECRET
- OIDC_CALLBACK_URL
- OIDC_SCOPE
- FRONTEND_URL
- AUTO_MIGRATE

Recommended:
- REDIS_URL
- TRUST_PROXY
- SMTP_PORTS
- SMTP_CERT_PATH

Dev/test only:
- ALLOW_INSECURE_OIDC_TLS
- ALLOW_INSECURE_IMAP_TLS

## 6. Compose Template

```yaml
services:
  postgres:
    image: postgres:15.5
    container_name: mailler-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-mailler}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-mailler}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - mailler-network

  redis:
    image: redis:7-alpine
    container_name: mailler-redis
    restart: unless-stopped
    networks:
      - mailler-network

  backend:
    image: ${BACKEND_IMAGE:?set BACKEND_IMAGE}
    container_name: mailler-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 3000

      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-mailler}
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${POSTGRES_DB:-mailler}
      DB_USER: ${POSTGRES_USER:-postgres}
      DB_PASSWORD: ${POSTGRES_PASSWORD}

      REDIS_URL: ${REDIS_URL:-redis://redis:6379}

      SESSION_SECRET: ${SESSION_SECRET:?set SESSION_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY:?set ENCRYPTION_KEY}

      OIDC_ISSUER: ${OIDC_ISSUER:?set OIDC_ISSUER}
      OIDC_PUBLIC_ISSUER: ${OIDC_PUBLIC_ISSUER:?set OIDC_PUBLIC_ISSUER}
      OIDC_CLIENT_ID: ${OIDC_CLIENT_ID:?set OIDC_CLIENT_ID}
      OIDC_CLIENT_SECRET: ${OIDC_CLIENT_SECRET:?set OIDC_CLIENT_SECRET}
      OIDC_CALLBACK_URL: ${OIDC_CALLBACK_URL:?set OIDC_CALLBACK_URL}
      OIDC_SCOPE: ${OIDC_SCOPE:-openid profile email}

      FRONTEND_URL: ${FRONTEND_URL:?set FRONTEND_URL}
      TRUST_PROXY: ${TRUST_PROXY:-true}
      AUTO_MIGRATE: ${AUTO_MIGRATE:-true}

      SMTP_PORTS: ${SMTP_PORTS:-25,587,465}
      SMTP_CERT_PATH: ${SMTP_CERT_PATH:-/certs}

      ALLOW_INSECURE_OIDC_TLS: ${ALLOW_INSECURE_OIDC_TLS:-false}
      ALLOW_INSECURE_IMAP_TLS: ${ALLOW_INSECURE_IMAP_TLS:-false}
    ports:
      - "3000:3000"
      - "25:25"
      - "587:587"
      - "465:465"
    volumes:
      - ./certs:/certs:ro
    networks:
      mailler-network:
        aliases:
          - backend

volumes:
  postgres_data:

networks:
  mailler-network:
    driver: bridge
```

## 7. Build And Push
Use build-and-push.bat to build and push only the unified backend image.

Usage:
- build-and-push.bat <registry_or_namespace> [tag]

Result image:
- <registry_or_namespace>/mailler-backend:<tag>

## 8. Verification Checklist
1. backend starts and logs: Serving frontend build from backend
2. migrations complete
3. frontend routes like /inbox return index.html from backend
4. /api and /auth endpoints respond correctly
5. OIDC login roundtrip succeeds
