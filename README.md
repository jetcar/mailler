# Mailler - Email Management Service

A full-featured email management service with web interface, built with Node.js, PostgreSQL, and OpenID Connect authentication.

## ✨ Features

- 📧 **Send and receive emails** via SMTP/IMAP
- 🔐 **OpenID Connect (OIDC) authentication** - Works with OIDC provider, Auth0, Keycloak, Okta, Google, etc.
- 🗄️ **PostgreSQL database** for persistent message storage
- 🚀 **Automatic database migrations** - Similar to EF Core, no psql/createdb needed!
- 🌐 **Modern React web interface** with responsive design
- 🔒 **AES-256 encrypted credential storage** for email passwords
- 📱 **Full email management** - compose, read, sync, search
- 🐳 **Docker support** for easy deployment
- ✅ **Comprehensive tests** including real email send/receive tests

## 📁 Project Structure

```
mailler/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── config/       # Database, OIDC, Passport config
│   │   ├── models/       # Sequelize models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Email & encryption services
│   │   ├── middleware/   # Auth & error handling
│   │   ├── utils/        # Migration runner (auto-migrate)
│   │   └── app.js        # Main application
│   ├── tests/            # Integration & real email tests
│   ├── migrate.js        # Standalone migration script
│   └── package.json
├── frontend/             # React web UI
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API client
│   │   └── App.jsx
│   └── package.json
├── database/             # SQL migrations (auto-applied)
├── docker-compose.yml    # Docker orchestration
├── setup.sh              # Automated setup script (Bash)
└── setup.ps1             # Automated setup script (PowerShell)
```

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Install all dependencies
- Create .env configuration files
- Automatically create database and apply migrations (no psql needed!)
- Guide you through the remaining steps

### Option 2: Manual Setup

#### 1. Prerequisites

- Node.js 16+
- PostgreSQL 13+
- OIDC provider account (Auth0, Keycloak, Okta, Google, or another standards-compliant provider)

#### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

#### 3. Database Setup

**Automatic migrations (similar to EF Core):**

The application automatically creates the database and applies migrations on startup!
No PostgreSQL client tools (psql, createdb) required.

```bash
# Option 1: Run migrations now
cd backend
npm run migrate

# Option 2: Migrations run automatically when you start the app
npm run dev  # Database is created and migrations applied automatically!
```

#### 4. Frontend Setup

```bash
cd frontend
npm install
```

#### 5. Start Development Servers

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Visit **http://localhost:5173/mailler**

### Option 3: Docker Compose

Run the full stack with Docker Compose:

```bash
# 1. Generate SSL certificate
bash ./generate-cert.sh

# 2. Create Docker/test environment file
cp .env.example .env.test
# Edit .env.test with your credentials

# 3. Start everything
docker-compose up --build
```

Access at: **https://localhost/mailler**

**Features:**
- ✅ Hot reload for frontend and backend
- ✅ Persistent node_modules (no re-downloads)
- ✅ HTTPS with HAProxy
- ✅ Auto database migrations
- ✅ All services in one command

### Option 4: Production Docker Deployment

```bash
# Create deployment environment file
cp .env.example .env.test
# Edit .env.test or change docker-compose.yml to point at a different env_file

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## ⚙️ Configuration

### Configuration Files

Use the configuration file that matches how you run the app:

- `backend/.env` for local backend development
- `frontend/.env.local` for optional Vite overrides during local frontend development
- `.env.test` in the repository root for `docker-compose.yml` and the bundled test OIDC provider

### Backend Environment Variables

For local development, create `backend/.env` from `backend/.env.example`:

```bash
cd backend
cp .env.example .env
```

Recommended local backend configuration:

```env
# Database
DATABASE_URL=postgresql://mailler_user:secure_password@localhost:5432/mailler
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mailler
DB_USER=mailler_user
DB_PASSWORD=secure_password

# OpenID Connect (example for OIDC provider)
OIDC_ISSUER=https://your-oidc-provider.example.com
OIDC_CLIENT_ID=your_client_id_here
OIDC_CLIENT_SECRET=your_client_secret_here
OIDC_CALLBACK_URL=http://localhost:3000/auth/callback
OIDC_SCOPE=openid profile email

# Optional: only set this when the browser must use a different public URL
# than the URL the backend uses for OIDC discovery/token/JWKS calls.
# Example: backend uses http://test-oidc-provider:9000, browser uses https://localhost/test_openidc
# OIDC_PUBLIC_ISSUER=https://your-public-oidc-url

# Session & Security
SESSION_SECRET=your_random_32_character_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key
SESSION_COOKIE_DOMAIN=localhost

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
TRUST_PROXY=false
AUTO_MIGRATE=true
APP_BASE_PATH=/mailler
SMTP_PORTS=25,587,465

# Optional for self-signed HTTPS OIDC providers in development only
ALLOW_INSECURE_OIDC_TLS=false
```

Notes:

- `APP_BASE_PATH` defaults to `/mailler` in both the backend and frontend.
- `OIDC_ISSUER` is the only required issuer setting.
- `OIDC_PUBLIC_ISSUER` is optional and is only needed when the backend reaches the provider on an internal URL but the browser must be redirected to a different public URL.
- Set `TRUST_PROXY=true` when running behind HAProxy or another reverse proxy.
- `AUTO_MIGRATE=true` applies pending SQL migrations on startup.

### Frontend Environment Variables

The frontend works without a `.env.local` for the default local setup, but you can create `frontend/.env.local` to override the defaults:

```env
VITE_APP_BASE_PATH=/mailler
VITE_API_URL=http://localhost:3000/
VITE_ASSET_BASE=/mailler/
VITE_DEBUG_LOGS=false
```

Notes:

- Keep `VITE_APP_BASE_PATH` aligned with the backend `APP_BASE_PATH`.
- `VITE_API_URL` is optional. If omitted, the frontend uses the app base path and expects the backend to be available under the same origin and prefix.
- `VITE_ASSET_BASE` controls the Vite asset base during builds. If omitted, it defaults to the app base path with a trailing slash, such as `/mailler/`.

### Docker Compose / Test OIDC Configuration

`docker-compose.yml` reads `.env.test` from the repository root for PostgreSQL, the backend, and `test-oidc-provider`.

The important values for the bundled local OIDC flow are:

```env
OIDC_ISSUER=http://test-oidc-provider:9000
OIDC_PUBLIC_ISSUER=https://localhost/test_openidc
OIDC_CLIENT_ID=MailuId
OIDC_CLIENT_SECRET=local-test-client-secret
OIDC_CALLBACK_URL=https://localhost/mailler/oauth2/authorize
FRONTEND_URL=https://localhost
TRUST_PROXY=true
SMTP_PORTS=25,587,465

# Variables consumed by test-oidc-provider itself
ISSUER=http://test-oidc-provider:9000
PUBLIC_ISSUER=https://localhost/test_openidc
CLIENT_ID=MailuId
CLIENT_SECRET=local-test-client-secret
```

For the Docker test flow, open `https://localhost/mailler` after the stack is healthy.

### OIDC Provider Setup

#### OIDC Provider (Recommended)

1. Go to [OIDC provider](https://your-oidc-provider.example.com)
2. Sign up or log in to your account
3. Create a new **OAuth 2.0 / OpenID Connect** application
4. Configure application settings:
   - **Name**: Mailler
   - **Redirect URI**: `http://localhost:3000/auth/callback` for direct backend development
   - **Redirect URI**: `https://localhost/mailler/oauth2/authorize` for the proxied Docker/HAProxy flow
   - **Allowed CORS Origins**: `http://localhost:5173` for local Vite development
   - **Allowed CORS Origins**: `https://localhost` for the proxied Docker flow
5. Copy the Client ID and Client Secret
6. Update your `backend/.env`:
   ```env
   OIDC_ISSUER=https://your-oidc-provider.example.com
   OIDC_CLIENT_ID=your_client_id
   OIDC_CLIENT_SECRET=your_client_secret
   OIDC_CALLBACK_URL=http://localhost:3000/auth/callback
   OIDC_SCOPE=openid profile email

   # Optional if browser and backend must use different provider URLs
   # OIDC_PUBLIC_ISSUER=https://your-public-oidc-url
   ```

For **production deployment**, update the URLs:
```env
OIDC_CALLBACK_URL=https://yourdomain.com/mailler/oauth2/authorize
FRONTEND_URL=https://yourdomain.com
APP_BASE_PATH=/mailler

# Optional if your backend talks to the provider on an internal/private URL
# but the browser must be redirected to a public URL
# OIDC_PUBLIC_ISSUER=https://your-public-oidc-url
```

#### Auth0 Example

1. Create an Auth0 account at https://auth0.com
2. Create a new **Regular Web Application**
3. Configure settings:
   - **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:5173`
   - **Allowed Web Origins**: `http://localhost:5173`
4. Copy Client ID and Client Secret to your `.env`
5. Set `OIDC_ISSUER` to `https://YOUR-DOMAIN.auth0.com`

#### Google OAuth Example

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/callback`
6. Use the discovery URL: `https://accounts.google.com`

### Email Account Configuration

After logging in, go to **Settings** in the web interface to add email accounts.

#### Gmail Example

For Gmail, you need an **App Password**:

1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use these settings in Mailler:
   - **IMAP Host**: `imap.gmail.com`
   - **IMAP Port**: `993`
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587`
   - **Username**: Your Gmail address
   - **Password**: The generated app password

#### Other Providers

- **Outlook/Office 365**: 
  - IMAP: `outlook.office365.com:993`
  - SMTP: `smtp.office365.com:587`
  
- **Yahoo**:
  - IMAP: `imap.mail.yahoo.com:993`
  - SMTP: `smtp.mail.yahoo.com:587`

## 📡 API Endpoints

### Authentication
- `GET /auth/login` - Initiate OIDC login
- `GET /auth/callback` - OIDC callback handler
- `GET /auth/logout` - Logout current session
- `GET /auth/me` - Get current user info

### Email Accounts
- `GET /api/accounts` - List user's email accounts
- `GET /api/accounts/:id` - Get account details
- `POST /api/accounts` - Add new email account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Remove account

### Messages
- `GET /api/messages` - List messages (with pagination/search)
- `GET /api/messages/:id` - Get message details
- `POST /api/messages/send` - Send new email
- `POST /api/messages/sync` - Sync messages from IMAP
- `PATCH /api/messages/:id` - Update message (mark read/starred)
- `DELETE /api/messages/:id` - Delete message

### Health
- `GET /` - API info
- `GET /health` - Health check endpoint

## 🧪 Testing

### Run Integration Tests

```bash
cd backend
npm test
```

### Run Real Email Tests

The project includes tests that actually send and receive emails. Configure test credentials:

```bash
# Create test environment file
cp .env.example .env.test

# Add test email credentials
TEST_EMAIL_ADDRESS=your-test-email@gmail.com
TEST_IMAP_HOST=imap.gmail.com
TEST_IMAP_PORT=993
TEST_IMAP_USERNAME=your-test-email@gmail.com
TEST_IMAP_PASSWORD=your-app-password
TEST_SMTP_HOST=smtp.gmail.com
TEST_SMTP_PORT=587
TEST_SMTP_USERNAME=your-test-email@gmail.com
TEST_SMTP_PASSWORD=your-app-password
```

Run real email tests:
```bash
npm test tests/real-email.test.js
```

These tests will:
1. ✅ Send a real email via SMTP
2. ✅ Receive emails via IMAP
3. ✅ Sync emails to database
4. ✅ Complete a full send/receive cycle

Check your inbox to verify the test emails!

## 🔒 Security

- **AES-256-CBC encryption** for email credentials in database
- **OIDC authentication** - no password management
- **HTTPS recommended** for production deployment
- **Secure session management** with httpOnly cookies
- **SQL injection protection** via Sequelize parameterized queries
- **CORS configuration** for frontend/backend separation
- **Helmet.js** for security headers

### Production Deployment Checklist

- [ ] Use HTTPS (SSL/TLS certificates)
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `SESSION_SECRET` (32+ characters)
- [ ] Generate strong `ENCRYPTION_KEY` (exactly 32 characters)
- [ ] Configure production OIDC callback URLs
- [ ] Set up database backups
- [ ] Configure proper CORS origins
- [ ] Use environment variables for all secrets
- [ ] Enable database connection pooling
- [ ] Set up logging and monitoring
- [ ] Configure rate limiting (optional)

## 🎯 Usage

### First Time Setup

1. **Login**: Click "Login with OpenID Connect"
2. **Add Email Account**: Go to Settings → Add Account
3. **Sync Messages**: Click "Sync" button in inbox
4. **Compose Email**: Click "Compose" button
5. **Read Messages**: Click any message in the inbox

### Features

- **Inbox Management**: Read, mark as read/starred, search messages
- **Compose**: Send emails with CC support
- **Multiple Accounts**: Add and manage multiple email accounts
- **Auto-sync**: Manually trigger IMAP sync anytime
- **Secure**: All credentials encrypted in database

## 📚 Development

### Adding Database Migrations

1. Create SQL file in `database/migrations/`
2. Number it sequentially (e.g., `005_add_attachments.sql`)
3. Apply automatically:
   ```bash
   # Option 1: Run migration script
   cd backend && npm run migrate
   
   # Option 2: Just restart the app - migrations auto-apply!
   npm run dev
   ```

### Available npm Scripts

**Backend:**
```bash
npm start          # Start production server
npm run dev        # Start development server with auto-reload
npm run migrate    # Run database migrations
npm test           # Run tests
```

**Frontend:**
```bash
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Project Guidelines

- Backend uses **Express.js** with **Sequelize ORM**
- Frontend uses **React** with functional components and hooks
- All email passwords encrypted before database storage
- OIDC handles all user authentication
- Follow RESTful API conventions

## Documentation

This README is the single source of truth for setup, configuration, local development, Docker usage, testing, and troubleshooting.

## 🛠️ Troubleshooting

### Can't Login

- Check OIDC configuration in `.env`
- Verify callback URL matches OIDC provider settings
- Check browser console for errors
- Verify the provider callback and logout URLs exactly match the values shown in this README

### Can't Send Emails

- Verify SMTP credentials in Settings
- For Gmail, ensure you're using an App Password, not regular password
- Check SMTP port (587 for STARTTLS, 465 for SSL)

### Can't Receive Emails

- Verify IMAP credentials in Settings
- Check IMAP port (usually 993 for SSL)
- Ensure IMAP is enabled on your email provider
- Check firewall/network restrictions

### Database Connection Failed

- Ensure PostgreSQL is running: `pg_isready`
- Verify database exists: `psql -l | grep mailler`
- Check DATABASE_URL in `.env`

## 📈 Roadmap

Current features are complete and working! Future enhancements could include:

- [ ] WebSocket support for real-time email notifications
- [ ] Email threading and conversations
- [ ] Advanced search with filters
- [ ] Attachment upload and download
- [ ] Email templates
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Email rules and automation
- [ ] Spam detection
- [ ] Contact management
- [ ] Calendar integration
- [ ] automation rules
- [ ] AI agent for emails manipulations
- [ ] email encrypt/decrypt using passi app user keys

## License

ISC

## Support

For issues and questions, please open an issue in the repository.
