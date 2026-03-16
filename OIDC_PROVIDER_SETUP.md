# OIDC Provider OIDC Setup Guide

This guide shows you how to configure Mailler with OIDC provider as your OpenID Connect provider.

## What is OIDC provider?

OIDC Provider is a modern authentication and identity provider that supports OpenID Connect (OIDC) and OAuth 2.0 protocols.

## Setup Steps

### 1. Create a OIDC Provider Account

1. Go to https://your-oidc-provider.example.com
2. Sign up for a new account or log in if you already have one

### 2. Create an OAuth Application

1. Navigate to your OIDC provider dashboard
2. Click on **Applications** or **OAuth Apps**
3. Click **Create New Application** or **Add Application**
4. Fill in the application details:

   **Application Name:** `Mailler`
   
   **Application Type:** Web Application / Regular Web Application
   
   **Redirect URI (Callback URL):**
   ```
   http://localhost:3000/auth/callback
   ```
   
   **Post Logout Redirect URI:**
   ```
   http://localhost:5173
   ```
   
   **Allowed CORS Origins (if available):**
   ```
   http://localhost:5173
   ```

5. Click **Create** or **Save**

### 3. Get Your Credentials

After creating the application, you should see:

- **Client ID** - A unique identifier for your application
- **Client Secret** - A secret key (keep this secure!)

Copy both of these values.

### 4. Configure Your Mailler Backend

Edit `backend/.env` and update the OIDC settings:

```env
# OpenID Connect - OIDC provider
OIDC_ISSUER=https://your-oidc-provider.example.com
OIDC_CLIENT_ID=your_client_id
OIDC_CLIENT_SECRET=your_client_secret
OIDC_CALLBACK_URL=http://localhost:3000/auth/callback
OIDC_SCOPE=openid profile email
```

### 5. Generate Session Secrets

Generate secure random keys for session management:

**Using Node.js:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command twice to generate two different keys, then add to `.env`:

```env
SESSION_SECRET=generated_32_char_hex_string_1
ENCRYPTION_KEY=generated_32_char_hex_string_2
```

### 6. Start Your Application

```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 7. Test the Login

1. Open http://localhost:5173
2. Click **"Login with OpenID Connect"**
3. You should be redirected to OIDC provider
4. Log in with your OIDC provider credentials
5. You should be redirected back to Mailler and logged in!

## Production Configuration

When deploying to production, update the URLs in your OIDC provider application settings:

### Update in OIDC Provider Dashboard:

**Redirect URI:**
```
https://yourdomain.com/auth/callback
```

**Post Logout Redirect URI:**
```
https://yourdomain.com
```

**Allowed CORS Origins:**
```
https://yourdomain.com
```

### Update in Your Production `.env`:

```env
OIDC_ISSUER=https://your-oidc-provider.example.com
OIDC_CLIENT_ID=your_client_id
OIDC_CLIENT_SECRET=your_client_secret
OIDC_CALLBACK_URL=https://yourdomain.com/auth/callback
OIDC_SCOPE=openid profile email
FRONTEND_URL=https://yourdomain.com
```

## Troubleshooting

### "Redirect URI Mismatch" Error

**Problem:** After clicking login, you see an error about redirect URI.

**Solution:**
1. Check that the redirect URI in OIDC provider matches exactly: `http://localhost:3000/auth/callback`
2. Make sure there are no trailing slashes
3. Verify the protocol (http vs https)

### "Invalid Client" Error

**Problem:** Authentication fails with "invalid client" message.

**Solution:**
1. Double-check your Client ID and Client Secret in `.env`
2. Make sure there are no extra spaces or quotes
3. Regenerate credentials in OIDC provider if needed

### User Not Logging In

**Problem:** Redirected back but not logged in.

**Solution:**
1. Check backend logs for errors
2. Verify `SESSION_SECRET` is set in `.env`
3. Clear browser cookies and try again
4. Check that OIDC_ISSUER is correct

### CORS Errors

**Problem:** Browser console shows CORS errors.

**Solution:**
1. Add `http://localhost:5173` to allowed CORS origins in OIDC provider
2. Verify `FRONTEND_URL=http://localhost:5173` in backend `.env`
3. Restart both backend and frontend servers

## Security Best Practices

### Development
- ✅ Use different credentials for dev and production
- ✅ Never commit `.env` files to git
- ✅ Use strong, random session secrets

### Production
- ✅ Use HTTPS for all URLs
- ✅ Set `NODE_ENV=production`
- ✅ Enable secure cookies (`secure: true` in session config)
- ✅ Rotate credentials periodically
- ✅ Monitor authentication logs
- ✅ Use environment-specific OIDC applications

## Testing Your Setup

Once configured, verify everything works:

1. ✅ Can access login page
2. ✅ Clicking "Login" redirects to OIDC provider
3. ✅ After login, redirected back to app
4. ✅ User profile is displayed
5. ✅ Can access protected pages (Settings, Inbox)
6. ✅ Logout works correctly

## Advanced Configuration

### Custom Scopes

If you need additional user information, you can request more scopes:

```env
OIDC_SCOPE=openid profile email address phone
```

Available scopes depend on your OIDC provider configuration.

### User Attributes Mapping

The application automatically maps these OIDC attributes:

- `sub` → User ID (unique identifier)
- `email` → User email address
- `name` or `displayName` → User display name

These are stored in the `users` table in PostgreSQL.

## Support

If you encounter issues:

1. Check OIDC provider documentation: https://example.com/oidc-docs
2. Review backend logs: `cd backend && npm run dev`
3. Check browser console for errors
4. Verify all environment variables are set correctly

## Complete Example `.env`

Here's a complete example with OIDC provider OIDC configuration:

```env
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/mailler
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mailler
DB_USER=postgres
DB_PASSWORD=your_password

# Database Migrations
AUTO_MIGRATE=true

# OpenID Connect - OIDC provider
OIDC_ISSUER=https://your-oidc-provider.example.com
OIDC_CLIENT_ID=abc123xyz789
OIDC_CLIENT_SECRET=secret_abc123xyz789def456
OIDC_CALLBACK_URL=http://localhost:3000/auth/callback
OIDC_SCOPE=openid profile email

# Session & Security
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
ENCRYPTION_KEY=p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
SESSION_COOKIE_DOMAIN=localhost

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

**Note:** Replace the example values with your actual credentials from OIDC provider.

Happy authenticating! 🎉
