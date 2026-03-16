# Mailler Setup Checklist

Use this checklist to track your setup progress.

## Pre-Setup

- [ ] Node.js 16+ installed
- [ ] PostgreSQL installed and running
- [ ] Have an OIDC provider account (Auth0/Google/Keycloak)

## Setup Steps

### 1. Project Verification
- [ ] Run `./verify.sh` - all files present

### 2. Dependencies
- [ ] Run `./setup.sh` OR manually install:
  - [ ] `cd backend && npm install`
  - [ ] `cd frontend && npm install`

### 3. Database
- [ ] PostgreSQL is running
- [ ] Database created: `createdb mailler`
- [ ] Migrations run:
  - [ ] 001_create_users.sql
  - [ ] 002_create_email_accounts.sql
  - [ ] 003_create_messages.sql
  - [ ] 004_create_settings.sql

### 4. OIDC Provider Setup
- [ ] Account created (Auth0/Google/etc.)
- [ ] Application registered
- [ ] Callback URL configured: `http://localhost:3000/auth/callback`
- [ ] Logout URL configured: `http://localhost:5173`
- [ ] Web origins configured: `http://localhost:5173`
- [ ] Client ID obtained
- [ ] Client Secret obtained

### 5. Backend Configuration
- [ ] Copy: `cp backend/.env.example backend/.env`
- [ ] Set `OIDC_ISSUER`
- [ ] Set `OIDC_CLIENT_ID`
- [ ] Set `OIDC_CLIENT_SECRET`
- [ ] Set `OIDC_CALLBACK_URL`
- [ ] Generate and set `SESSION_SECRET` (32+ chars)
- [ ] Generate and set `ENCRYPTION_KEY` (exactly 32 chars)
- [ ] Database URL configured

### 6. Start Services
- [ ] Backend running: `cd backend && npm run dev`
- [ ] Frontend running: `cd frontend && npm run dev`
- [ ] Backend accessible at http://localhost:3000
- [ ] Frontend accessible at http://localhost:5173

## First Use

### 7. Login
- [ ] Visit http://localhost:5173
- [ ] Click "Login with OpenID Connect"
- [ ] Successfully authenticated
- [ ] Redirected back to application

### 8. Configure Email Account
- [ ] Navigate to Settings
- [ ] Click "Add Account"
- [ ] Enter email address
- [ ] Configure IMAP settings:
  - [ ] Host
  - [ ] Port (usually 993)
  - [ ] Username
  - [ ] Password (use app password for Gmail)
- [ ] Configure SMTP settings:
  - [ ] Host
  - [ ] Port (usually 587)
  - [ ] Username
  - [ ] Password
- [ ] Save account
- [ ] Account appears in list

### 9. Test Email Operations
- [ ] Go to Inbox
- [ ] Click "Sync"
- [ ] Emails appear in inbox
- [ ] Click on a message
- [ ] Message displays correctly
- [ ] Click "Compose"
- [ ] Send a test email
- [ ] Email sent successfully
- [ ] Email received (check inbox)

## Testing (Optional)

- [ ] Run integration tests: `cd backend && npm test`
- [ ] Configure test credentials in `.env.test`
- [ ] Run real email tests: `npm test tests/real-email.test.js`
- [ ] All tests passing

## Docker Deployment (Optional)

- [ ] Copy `.env.example` to `.env`
- [ ] Configure OIDC settings in `.env`
- [ ] Run `docker-compose up -d`
- [ ] All containers running
- [ ] Application accessible at http://localhost:5173

## Production Deployment (Optional)

- [ ] HTTPS/SSL configured
- [ ] Set `NODE_ENV=production`
- [ ] Strong secrets generated
- [ ] Production OIDC URLs configured
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] CORS configured for production domain
- [ ] Security headers reviewed

## Troubleshooting

If you encounter issues, check:
- [ ] PostgreSQL is running: `pg_isready`
- [ ] Database exists: `psql -l | grep mailler`
- [ ] Node.js version: `node --version` (should be 16+)
- [ ] Backend logs in terminal
- [ ] Frontend logs in browser console
- [ ] OIDC callback URL matches exactly
- [ ] Email credentials are correct
- [ ] For Gmail: Using app password, not regular password

## Support

- [ ] Read README.md
- [ ] Read QUICKSTART.md
- [ ] Check IMPLEMENTATION.md for technical details
- [ ] Review error messages in console

---

## Quick Commands Reference

```bash
# Verify project
./verify.sh

# Setup
./setup.sh

# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev

# Run tests
cd backend && npm test

# Docker
docker-compose up -d
docker-compose logs -f
docker-compose down

# Database
createdb mailler
psql -d mailler -f database/migrations/001_create_users.sql
psql -d mailler -f database/migrations/002_create_email_accounts.sql
psql -d mailler -f database/migrations/003_create_messages.sql
psql -d mailler -f database/migrations/004_create_settings.sql
```

---

**Once all items are checked, you have a fully functional email management system! 🎉**
