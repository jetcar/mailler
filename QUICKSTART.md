# Quick Start Guide - Mailler

Get Mailler running in 5 minutes!

## Prerequisites

- Node.js 16+ installed
- PostgreSQL running
- An OIDC provider account (we'll use Auth0 free tier)

## Step 1: Get Auth0 Credentials (2 minutes)

1. Go to https://auth0.com and create a free account
2. Click **Create Application** → **Regular Web Applications**
3. Name it "Mailler"
4. Go to **Settings** tab and copy:
   - **Domain** (e.g., `dev-abc123.us.auth0.com`)
   - **Client ID**
   - **Client Secret**
5. Scroll down to **Application URIs** and set:
   - **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:5173`
   - **Allowed Web Origins**: `http://localhost:5173`
6. Click **Save Changes**

## Step 2: Run Setup Script (1 minute)

```bash
cd /mnt/c/repo/mailler
chmod +x setup.sh
./setup.sh
```

When prompted:
- Install dependencies: **Yes**
- Create database: **Yes** (use default values)

## Step 3: Configure Environment (1 minute)

Edit `backend/.env`:

```env
# Update these with your Auth0 credentials:
OIDC_ISSUER=https://YOUR-DOMAIN.auth0.com
OIDC_CLIENT_ID=your_client_id_here
OIDC_CLIENT_SECRET=your_client_secret_here
OIDC_CALLBACK_URL=http://localhost:3000/auth/callback

# Generate a random secret (run: openssl rand -base64 32)
SESSION_SECRET=your_random_32_character_secret

# Generate encryption key (must be exactly 32 characters)
ENCRYPTION_KEY=12345678901234567890123456789012
```

Generate secure keys:
```bash
# Session secret
openssl rand -base64 32

# Encryption key (exactly 32 chars)
openssl rand -base64 24
```

## Step 4: Start Servers (1 minute)

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

## Step 5: Use Mailler! 🎉

1. Open http://localhost:5173
2. Click **Login with OpenID Connect**
3. Authenticate with Auth0
4. Click **Settings** → **Add Account**
5. Configure your email account (Gmail example):
   ```
   Email: your-email@gmail.com
   IMAP Host: imap.gmail.com
   IMAP Port: 993
   IMAP User: your-email@gmail.com
   IMAP Pass: [your Gmail app password]
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP User: your-email@gmail.com
   SMTP Pass: [your Gmail app password]
   ```
6. Go back to **Inbox**
7. Click **Sync** to fetch your emails
8. Click **Compose** to send an email!

## Gmail App Password Setup

Gmail requires an "App Password" instead of your regular password:

1. Go to https://myaccount.google.com
2. Click **Security** → **2-Step Verification** (enable if not already)
3. Scroll to **App passwords** → Click it
4. Select **Mail** and **Other (Custom name)**
5. Enter "Mailler"
6. Copy the 16-character password
7. Use this password in Mailler settings

## Troubleshooting

**Can't login to Mailler:**
- Check Auth0 callback URL is exactly `http://localhost:3000/auth/callback`
- Verify `.env` has correct OIDC credentials

**Can't sync emails:**
- Gmail: Make sure you're using App Password, not regular password
- Check IMAP is enabled on your email provider
- Verify host/port settings

**Database error:**
- Ensure PostgreSQL is running: `pg_isready`
- Verify database exists: `psql -l | grep mailler`

## What's Next?

- Try sending an email to yourself
- Add multiple email accounts
- Run the test suite: `cd backend && npm test`
- Deploy to production using Docker: `docker-compose up -d`

## Support

Check the main README.md for:
- Full API documentation
- Security best practices
- Production deployment guide
- Advanced configuration options

Enjoy your self-hosted email management! 📧
