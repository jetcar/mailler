# Email Testing Guide

This guide will help you test email sending and receiving functionality in Mailler.

## 🚀 Quick Start Testing

### Option 1: Using the Web Interface (Recommended)

This is the easiest way to test email functionality.

#### Step 1: Start the Application

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

#### Step 2: Configure OIDC (First Time Only)

If you haven't configured OIDC yet, you can use a quick test setup:

**Using OIDC provider (Recommended):**
1. Go to https://your-oidc-provider.example.com and sign up/login
2. Create a new OAuth 2.0 / OpenID Connect application
3. Configure:
   - Name: Mailler
   - Redirect URI: `http://localhost:3000/auth/callback`
   - Post Logout Redirect URI: `http://localhost:5173`
   - Copy Client ID and Client Secret
4. Update `backend/.env`:
   ```env
   OIDC_ISSUER=https://your-oidc-provider.example.com
   OIDC_CLIENT_ID=your_client_id
   OIDC_CLIENT_SECRET=your_client_secret
   OIDC_CALLBACK_URL=http://localhost:3000/auth/callback
   ```

**Alternative - Using Auth0 (Free tier):**
1. Sign up at https://auth0.com
2. Create a new "Regular Web Application"
3. In Settings:
   - Note your Domain (like `your-tenant.auth0.com`)
   - Copy Client ID and Client Secret
   - Set Allowed Callback URLs: `http://localhost:3000/auth/callback`
   - Set Allowed Logout URLs: `http://localhost:5173`
   - Set Allowed Web Origins: `http://localhost:5173`
4. Update `backend/.env`:
   ```env
   OIDC_ISSUER=https://your-tenant.auth0.com
   OIDC_CLIENT_ID=your_client_id
   OIDC_CLIENT_SECRET=your_client_secret
   ```

#### Step 3: Login and Add Email Account

1. Open http://localhost:5173
2. Click "Login with OpenID Connect"
3. After login, click "Settings"
4. Click "Add Email Account"

#### Step 4: Configure Email Account

**For Gmail (Easiest for testing):**

1. **Enable 2-Factor Authentication** on your Google account (if not already enabled)
2. **Create an App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select App: "Mail"
   - Select Device: "Other" (enter "Mailler")
   - Click "Generate"
   - Copy the 16-character password (like "abcd efgh ijkl mnop")

3. **Enter in Mailler Settings:**
   ```
   Email Address: your-email@gmail.com
   IMAP Host: imap.gmail.com
   IMAP Port: 993
   IMAP Username: your-email@gmail.com
   IMAP Password: [paste the app password]
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP Username: your-email@gmail.com
   SMTP Password: [paste the app password]
   ```

4. Click "Save Account"

#### Step 5: Test Email Receiving

1. Go to "Inbox" page
2. Click "Sync" button
3. Your emails should appear!

#### Step 6: Test Email Sending

1. Click "Compose" button
2. Fill in:
   - **To:** your-email@gmail.com (send to yourself for testing)
   - **Subject:** Test Email from Mailler
   - **Body:** This is a test!
3. Click "Send"
4. Check your Gmail inbox - you should receive the email!

---

## 🧪 Option 2: Running Automated Tests

### Test Configuration

Create a `.env.test` file in the backend directory:

```env
# Copy your regular .env and add these test-specific variables:

# Test Email Credentials (use Gmail with App Password)
TEST_EMAIL_ADDRESS=your-email@gmail.com
TEST_IMAP_HOST=imap.gmail.com
TEST_IMAP_PORT=993
TEST_IMAP_USERNAME=your-email@gmail.com
TEST_IMAP_PASSWORD=your-app-password-here
TEST_SMTP_HOST=smtp.gmail.com
TEST_SMTP_PORT=587
TEST_SMTP_USERNAME=your-email@gmail.com
TEST_SMTP_PASSWORD=your-app-password-here
```

### Run Tests

```powershell
cd backend

# Run all tests (including real email tests)
npm test

# Run only real email tests
npm test -- real-email.test.js
```

**Expected output:**
```
Real Email Send/Receive Tests
  ✓ Send real email via SMTP (2500ms)
  ✓ Receive emails via IMAP (3200ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

---

## 📧 Email Provider Setup Guides

### Gmail Setup (Most Common)

**Prerequisites:**
- Gmail account
- 2-Factor Authentication enabled

**Steps:**
1. Enable 2FA: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use these settings:

```
IMAP Settings:
  Host: imap.gmail.com
  Port: 993
  Security: SSL/TLS
  
SMTP Settings:
  Host: smtp.gmail.com
  Port: 587
  Security: STARTTLS
  
Credentials:
  Username: your-email@gmail.com
  Password: [16-char app password]
```

**Troubleshooting:**
- ✅ Make sure 2FA is enabled
- ✅ Use App Password, not regular password
- ✅ Remove spaces from app password
- ✅ Enable "Less secure app access" if needed (deprecated)

### Outlook/Office 365 Setup

**Settings:**
```
IMAP Settings:
  Host: outlook.office365.com
  Port: 993
  Security: SSL/TLS
  
SMTP Settings:
  Host: smtp.office365.com
  Port: 587
  Security: STARTTLS
  
Credentials:
  Username: your-email@outlook.com
  Password: [your account password]
```

**Note:** Some Outlook accounts may require OAuth2 (not supported yet in current version)

### Yahoo Mail Setup

**Prerequisites:**
- Yahoo account
- App Password generated

**Steps:**
1. Go to Yahoo Account Security
2. Generate an App Password for "Mail"
3. Use these settings:

```
IMAP Settings:
  Host: imap.mail.yahoo.com
  Port: 993
  Security: SSL/TLS
  
SMTP Settings:
  Host: smtp.mail.yahoo.com
  Port: 587
  Security: STARTTLS
  
Credentials:
  Username: your-email@yahoo.com
  Password: [app password]
```

### Custom Email Server

For self-hosted or other email servers:

```
IMAP Settings:
  Host: mail.yourdomain.com
  Port: 993 (or your server's IMAP port)
  Security: SSL/TLS
  
SMTP Settings:
  Host: mail.yourdomain.com
  Port: 587 (or 465 for SSL, 25 for unencrypted)
  Security: STARTTLS or SSL/TLS
  
Credentials:
  Username: [your email or username]
  Password: [your password]
```

---

## 🔍 Testing Scenarios

### Test 1: Send Email to Yourself

**Why:** Quickest way to verify sending works

**Steps:**
1. Compose email
2. Set recipient to your own email
3. Send
4. Check your inbox (may take a few seconds)

**Expected:** Email appears in your inbox

### Test 2: Sync Existing Emails

**Why:** Verify IMAP receiving works

**Steps:**
1. Make sure you have some emails in your account
2. Click "Sync" in Mailler
3. Wait for sync to complete

**Expected:** Your emails appear in Mailler inbox

### Test 3: Send and Receive Loop

**Why:** End-to-end test

**Steps:**
1. Send email to yourself with unique subject
2. Wait 10-30 seconds
3. Click "Sync"
4. Find the email you just sent

**Expected:** See your sent email in the inbox

### Test 4: Multiple Recipients

**Why:** Test CC functionality

**Steps:**
1. Compose email
2. Add main recipient
3. Add CC recipients
4. Send

**Expected:** All recipients receive the email

---

## 🐛 Troubleshooting

### Error: "Authentication failed"

**Possible causes:**
- Wrong username/password
- Not using App Password (for Gmail)
- 2FA not enabled (for Gmail)
- Account security blocking access

**Solutions:**
1. Double-check credentials
2. Generate new App Password
3. Enable 2FA on your account
4. Check email provider's security settings

### Error: "Connection timeout"

**Possible causes:**
- Wrong host or port
- Firewall blocking connection
- SSL/TLS issues

**Solutions:**
1. Verify host and port are correct
2. Check firewall settings
3. Try different ports (993 vs 143 for IMAP, 587 vs 465 vs 25 for SMTP)

### Error: "Self-signed certificate"

**Possible causes:**
- Server using self-signed SSL certificate

**Solutions:**
1. For testing, you might need to disable SSL verification (not recommended for production)
2. Contact your email server admin

### Emails Not Syncing

**Possible causes:**
- Wrong IMAP settings
- Connection issues
- No emails in folder

**Solutions:**
1. Check IMAP credentials
2. Verify internet connection
3. Check if emails exist in your inbox
4. Try "Sync" button again

### Email Sending Fails

**Possible causes:**
- Wrong SMTP settings
- Authentication failure
- Recipient address invalid

**Solutions:**
1. Check SMTP credentials
2. Verify recipient email is valid
3. Check spam folder if recipient doesn't receive
4. Look at backend logs for error details

---

## 📊 Monitoring and Logs

### Backend Logs

Watch backend terminal for detailed logs:

```
📤 Sending email...
✅ Email sent successfully! Message ID: <xyz@gmail.com>

📥 Fetching emails from IMAP...
✅ Synced 25 messages from IMAP
```

### Database Check

You can verify emails are stored:

```powershell
# Connect to PostgreSQL
psql -U postgres -d mailler

# Check messages
SELECT id, from_address, subject, is_read FROM messages;

# Check accounts
SELECT id, email_address, imap_host, smtp_host FROM email_accounts;
```

---

## 🎯 Quick Testing Checklist

- [ ] PostgreSQL is running
- [ ] Backend started (`npm run dev`)
- [ ] Frontend started (`npm run dev`)
- [ ] OIDC configured and working
- [ ] Logged in to Mailer
- [ ] Email account added in Settings
- [ ] **Send Test:** Composed and sent email to yourself
- [ ] **Receive Test:** Clicked Sync and see emails
- [ ] Verified email appears in database
- [ ] Checked backend logs for errors

---

## 🚀 Production Testing

Before deploying to production:

### 1. Test with Real Email Provider

Don't use personal Gmail. Set up:
- Business email account
- Or dedicated testing account
- Proper authentication (OAuth2 where possible)

### 2. Test Rate Limits

- Send multiple emails rapidly
- Sync large mailboxes
- Monitor for rate limit errors

### 3. Test Security

- Verify credentials are encrypted in database
- Test OIDC login/logout flow
- Check HTTPS is enforced in production

### 4. Performance Testing

- Sync mailbox with 1000+ emails
- Test concurrent users
- Monitor database performance

---

## 📚 Additional Resources

- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Outlook IMAP Settings](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353)
- [Yahoo App Passwords](https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html)
- [IMAP Protocol Docs](https://tools.ietf.org/html/rfc3501)
- [SMTP Protocol Docs](https://tools.ietf.org/html/rfc5321)

---

## 💡 Tips

1. **Start with Gmail** - It's the most reliable for testing
2. **Use App Passwords** - Never use your actual password
3. **Test locally first** - Before deploying to production
4. **Check spam folders** - Sometimes test emails end up there
5. **Monitor logs** - Backend logs show exactly what's happening
6. **Use descriptive subjects** - Makes finding test emails easier
7. **Clean up test emails** - Delete test messages after testing

---

Happy Testing! 🎉

If you encounter issues not covered here, check the backend logs or open an issue on the repository.
