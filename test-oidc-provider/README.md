# Test OpenID Connect Provider

A lightweight, fully-functional OpenID Connect (OIDC) provider for testing and development purposes. This server implements the complete OIDC protocol with a hardcoded user that auto-approves all authentication requests.

## Features

✅ **Complete OIDC Protocol Support**
- Discovery endpoint (`/.well-known/openid-configuration`)
- Authorization endpoint with PKCE support
- Token endpoint with proper JWT signing (RS256)
- UserInfo endpoint
- JWKS endpoint for public key distribution

✅ **Security Features**
- PKCE (Proof Key for Code Exchange) validation
- State parameter validation
- Nonce parameter validation
- JWT signing with RSA keys
- Authorization code expiration
- Access token expiration

✅ **Auto-Approval**
- Automatically approves all authentication requests
- Returns hardcoded user without login form
- Perfect for automated testing

## Quick Start

### 1. Install Dependencies

```bash
cd test-oidc-provider
npm install
```

### 2. Configure Environment

Edit `.env` file to match your application settings:

```env
PORT=9000
ISSUER=http://localhost:9000
CLIENT_ID=MailuId
CLIENT_SECRET=local-test-client-secret
USER_EMAIL=test@example.com
USER_NAME=Test User
```

### 3. Start the Server

```bash
npm start
```

Or with auto-reload during development:

```bash
npm run dev
```

The server will start on `http://localhost:9000`

### 4. Configure Your Application

Update your Mailler backend `.env` to use the test provider:

```env
OIDC_ISSUER=http://localhost:9000
OIDC_CLIENT_ID=MailuId
OIDC_CLIENT_SECRET=local-test-client-secret
OIDC_CALLBACK_URL=http://localhost:3000/auth/callback
OIDC_SCOPE=openid profile email
```

## Endpoints

### Discovery
`GET /.well-known/openid-configuration`

Returns OpenID Connect configuration metadata.

### JWKS
`GET /.well-known/jwks.json`

Returns JSON Web Key Set for token signature verification.

### Authorization
`GET /authorize`

Query parameters:
- `client_id` - Client identifier
- `redirect_uri` - Callback URL
- `response_type` - Should be "code"
- `scope` - Space-separated scopes (must include "openid")
- `state` - Random state for CSRF protection
- `nonce` - Random nonce for replay protection
- `code_challenge` - PKCE code challenge
- `code_challenge_method` - PKCE method (S256 or plain)

**Automatically approves and redirects** with authorization code.

### Token
`POST /token`

Body parameters (application/x-www-form-urlencoded):
- `grant_type` - Should be "authorization_code"
- `code` - Authorization code from /authorize
- `redirect_uri` - Same URI used in /authorize
- `client_id` - Client identifier
- `client_secret` - Client secret
- `code_verifier` - PKCE code verifier

Returns:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "...",
  "scope": "openid profile email"
}
```

### UserInfo
`GET /userinfo`

Headers:
- `Authorization: Bearer <access_token>`

Returns user claims based on scope.

## Hardcoded User

The provider returns this hardcoded user for all authentications:

```json
{
  "sub": "test-user-12345",
  "email": "test@example.com",
  "email_verified": true,
  "name": "Test User",
  "preferred_username": "testuser",
  "given_name": "Test",
  "family_name": "User"
}
```

You can customize this in the `.env` file.

## Testing the Flow

### 1. Test Discovery

```bash
curl http://localhost:9000/.well-known/openid-configuration
```

### 2. Test Authorization (Browser)

Navigate to:
```
http://localhost:9000/authorize?client_id=MailuId&redirect_uri=http://localhost:3000/auth/callback&response_type=code&scope=openid%20profile%20email&state=test123&nonce=nonce123&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256
```

You'll be automatically redirected back with an authorization code.

### 3. Test Token Exchange

```bash
curl -X POST http://localhost:9000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_CODE_HERE" \
  -d "redirect_uri=http://localhost:3000/auth/callback" \
  -d "client_id=MailuId" \
  -d "client_secret=local-test-client-secret" \
  -d "code_verifier=YOUR_VERIFIER_HERE"
```

### 4. Test UserInfo

```bash
curl http://localhost:9000/userinfo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Integration with Mailler

1. **Start the test OIDC provider:**
   ```bash
   cd test-oidc-provider
   npm start
   ```

2. **Update Mailler backend .env:**
   ```env
   OIDC_ISSUER=http://localhost:9000
   OIDC_CLIENT_ID=MailuId
   OIDC_CLIENT_SECRET=local-test-client-secret
   OIDC_CALLBACK_URL=http://localhost:3000/auth/callback
   ```

3. **Restart Mailler backend:**
   ```bash
   docker-compose restart backend
   ```

4. **Test login:**
   Navigate to `http://localhost:3000/auth/login` and you'll be automatically authenticated as the test user!

## Logging

The server logs all requests and OIDC protocol steps:

```
📋 Discovery endpoint called
🚀 Authorization request received
✅ Authorization code generated
🔐 Token request received
✅ PKCE validation successful
✅ Tokens generated successfully
👤 UserInfo request received
```

## Configuration Options

All settings in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 9000 |
| `ISSUER` | OIDC issuer URL | http://localhost:9000 |
| `CLIENT_ID` | OAuth client ID | MailuId |
| `CLIENT_SECRET` | OAuth client secret | local-test-client-secret |
| `USER_SUB` | User subject (unique ID) | test-user-12345 |
| `USER_EMAIL` | User email address | test@example.com |
| `USER_NAME` | User display name | Test User |
| `USER_PREFERRED_USERNAME` | Username | testuser |
| `CODE_EXPIRATION` | Auth code expiration (seconds) | 300 |
| `ACCESS_TOKEN_EXPIRATION` | Access token expiration (seconds) | 3600 |
| `ID_TOKEN_EXPIRATION` | ID token expiration (seconds) | 3600 |

## Security Notes

⚠️ **FOR TESTING ONLY** ⚠️

This provider is designed for development and testing. It should **NEVER** be used in production because:

- Auto-approves all requests without authentication
- Uses hardcoded credentials
- No user database or session management
- Simplified security model
- In-memory storage (lost on restart)

For production, use a real OIDC provider like:
- Auth0
- Keycloak
- AWS Cognito
- Azure AD
- OIDC provider

## Troubleshooting

### Port Already in Use

Change `PORT` in `.env` to a different port.

### Mailler Can't Connect

Make sure:
1. Test provider is running (`npm start`)
2. `OIDC_ISSUER` in Mailler matches the test provider URL
3. Client ID and secret match in both applications
4. No firewall blocking localhost connections

### Token Validation Fails

The test provider uses RS256 signing. Your application should:
1. Fetch JWKS from `/.well-known/jwks.json`
2. Verify JWT signature using the public key
3. Validate issuer, audience, expiration

The `openid-client` library handles this automatically.

## License

MIT - Free for testing and development
