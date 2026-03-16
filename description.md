# Mail Sending and Receiving Service

## Description
This is a full-featured email management service with a web interface. The functionality includes:
- Sending emails using SMTP.
- Reading and managing emails using IMAP/POP3.
- User authentication via OpenID Connect (OIDC).
- Web-based user interface for email management.
- Persistent storage of messages and settings in PostgreSQL.

The service will be developed using **Node.js** backend with a modern web UI framework.

---

## Architecture

### Backend (Node.js + Express)
- RESTful API for email operations
- OpenID Connect authentication middleware
- Email sending and receiving services
- PostgreSQL database integration

### Frontend (React/Vue)
- Modern, responsive web interface
- Email inbox, compose, and settings views
- OIDC login integration
- Real-time email notifications

### Database (PostgreSQL)
- User settings and preferences
- Email messages and metadata
- Email account configurations
- Session management

---

## Future Development Instructions

### 1. Dependencies
**Backend:**
- `express` - Web framework
- `nodemailer` - Sending emails via SMTP
- `imap-simple` or `node-imap` - Receiving emails
- `pg` or `sequelize` - PostgreSQL client/ORM
- `passport` + `passport-openidconnect` - OIDC authentication
- `express-session` + `connect-pg-simple` - Session management with PostgreSQL
- `winston` - Logging
- `dotenv` - Environment configuration
- `helmet` - Security headers
- `cors` - Cross-origin resource sharing

**Frontend:**
- `react` or `vue` - UI framework
- `axios` - HTTP client
- `react-router-dom` or `vue-router` - Routing
- `react-oidc-context` or similar - OIDC client

### 2. Database Schema
**Users Table:**
- `id` (primary key)
- `oidc_sub` (OIDC subject identifier)
- `email`
- `display_name`
- `created_at`
- `updated_at`

**Email Accounts Table:**
- `id` (primary key)
- `user_id` (foreign key)
- `email_address`
- `imap_host`, `imap_port`, `imap_username`, `imap_password` (encrypted)
- `smtp_host`, `smtp_port`, `smtp_username`, `smtp_password` (encrypted)
- `is_default`
- `created_at`

**Messages Table:**
- `id` (primary key)
- `account_id` (foreign key)
- `message_id` (email message ID)
- `from_address`
- `to_addresses`
- `cc_addresses`
- `subject`
- `body_text`
- `body_html`
- `received_date`
- `is_read`
- `is_starred`
- `folder`
- `raw_headers` (JSONB)
- `created_at`

**Settings Table:**
- `id` (primary key)
- `user_id` (foreign key)
- `key`
- `value` (JSONB)
- `updated_at`

### 3. Project Structure
```
mailler/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   ├── oidc.js
│   │   │   └── passport.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── EmailAccount.js
│   │   │   ├── Message.js
│   │   │   └── Settings.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── messages.js
│   │   │   ├── accounts.js
│   │   │   └── settings.js
│   │   ├── services/
│   │   │   ├── mailer.js
│   │   │   ├── receiver.js
│   │   │   └── encryption.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   └── app.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Inbox.jsx
│   │   │   ├── Compose.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── EmailList.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── auth.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js (or similar)
├── database/
│   └── migrations/
│       ├── 001_create_users.sql
│       ├── 002_create_email_accounts.sql
│       ├── 003_create_messages.sql
│       └── 004_create_settings.sql
├── docker-compose.yml
└── README.md
```

### 4. Configuration
**Environment Variables (.env):**
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mailler
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mailler
DB_USER=mailler_user
DB_PASSWORD=secure_password

# OpenID Connect
OIDC_ISSUER=https://your-oidc-provider.com
OIDC_CLIENT_ID=your_client_id
OIDC_CLIENT_SECRET=your_client_secret
OIDC_CALLBACK_URL=http://localhost:3000/auth/callback
OIDC_SCOPE=openid profile email

# Session
SESSION_SECRET=your_session_secret
SESSION_COOKIE_DOMAIN=localhost

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key
```

### 5. Key Features to Implement

**Authentication:**
- OIDC login flow with redirect
- Protected routes requiring authentication
- Token refresh mechanism
- Logout functionality

**Email Management:**
- List emails with pagination
- Read/unread status
- Star/favorite emails
- Folder navigation (Inbox, Sent, Drafts, Trash)
- Search and filter
- Compose new emails with attachments
- Reply and forward

**Settings:**
- User profile management
- Email account configuration (IMAP/SMTP)
- Display preferences
- Notification settings

**Security:**
- Encrypt sensitive credentials in database
- SQL injection prevention (use parameterized queries)
- XSS protection
- CSRF tokens
- Rate limiting
- Secure session management

### 6. Testing
- **Unit Tests**: Jest/Mocha for backend services
- **Integration Tests**: Test API endpoints with supertest
- **E2E Tests**: Cypress or Playwright for frontend workflows
- **Database Tests**: Test migrations and queries

### 7. Deployment
**Docker Setup:**
- Create Dockerfile for backend
- Create Dockerfile for frontend
- docker-compose.yml with:
  - PostgreSQL service
  - Backend service
  - Frontend service (or serve static build from backend)
  - Nginx reverse proxy (optional)

**CI/CD:**
- Automated testing on pull requests
- Database migration verification
- Build and push Docker images
- Deploy to staging/production

### 8. Improvements
- WebSocket support for real-time email notifications
- Email template system
- Multi-language support (i18n)
- Dark mode
- Email filtering and rules
- Spam detection
- Attachment preview
- Email signatures
- Auto-save drafts
- Contact management

---

## Getting Started

### Development Setup
1. **Clone the repository**
2. **Start PostgreSQL:**
   ```bash
   docker run --name mailler-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
   ```
3. **Run database migrations**
4. **Configure OIDC provider** (e.g., Auth0, Keycloak, Okta)
5. **Start backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
6. **Start frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Example Usage
- Navigate to `http://localhost:5173`
- Click "Login with OpenID Connect"
- After authentication, access your email dashboard
- Configure email accounts in settings
- Send and receive emails through the UI