# OpenID Connect Security Upgrade

## Overview
Upgraded from `passport-openidconnect` to the official **`openid-client`** library for proper OpenID Connect compliance with full security validation.

## What Changed

### 1. **JWT Signature Validation** ✅
- **Before**: Basic validation only (passport-openidconnect v0.1.1)
- **After**: Full RS256/ES256 signature validation using JWKS from the provider

### 2. **OIDC Discovery** ✅
- Automatically discovers endpoints from `${OIDC_ISSUER}/.well-known/openid-configuration`
- No hardcoded URLs - fully compliant with OpenID Connect Discovery spec

### 3. **Token Validation** ✅
- Issuer validation
- Audience validation
- Expiration checks (`exp` claim)
- Nonce validation (prevents replay attacks)

### 4. **PKCE Support** ✅
- Uses PKCE (Proof Key for Code Exchange) for additional security
- Code verifier/challenge with S256 method
- Protects against authorization code interception

## Security Features

| Feature | passport-openidconnect | openid-client |
|---------|------------------------|----------------|
| JWT Signature Validation | ❌ Basic | ✅ Full JWKS |
| OIDC Discovery | ⚠️ Limited | ✅ Complete |
| PKCE Support | ❌ No | ✅ Yes |
| Issuer Validation | ⚠️ Limited | ✅ Yes |
| Nonce Validation | ❌ No | ✅ Yes |
| Token Expiration | ⚠️ Limited | ✅ Yes |
| Certified Library | ❌ No | ✅ Yes (OpenID Foundation) |

## Technical Details

### Discovery Endpoint
The library fetches OIDC configuration from:
```
https://your-oidc-provider.example.com/openidc/.well-known/openid-configuration
```

This provides:
- `authorization_endpoint`
- `token_endpoint`
- `userinfo_endpoint`
- `jwks_uri` (public keys for signature validation)
- Supported algorithms, scopes, claims, etc.

### ID Token Validation Process
1. Exchange authorization code for tokens
2. Fetch JWKS (public keys) from provider
3. Verify ID token signature using RS256/ES256
4. Validate issuer (`iss` claim)
5. Validate audience (`aud` claim matches client_id)
6. Check token expiration (`exp` claim)
7. Validate nonce (if used)
8. Extract validated claims

### Code Flow
```javascript
// 1. User clicks login -> generates PKCE challenge
const codeVerifier = generators.codeVerifier();
const codeChallenge = generators.codeChallenge(codeVerifier);

// 2. Redirect to OIDC provider with challenge
client.authorizationUrl({
  scope: 'openid profile email',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256'
});

// 3. Provider redirects back with code
// 4. Exchange code for tokens (signature validated automatically)
const tokenSet = await client.callback(redirectUri, params, {
  code_verifier: codeVerifier
});

// 5. Get validated claims
const claims = tokenSet.claims(); // Signature already verified!
```

## Files Modified

1. **backend/package.json**
   - Removed: `passport-openidconnect`
   - Added: `openid-client`, `passport-custom`

2. **backend/src/config/passport.js**
   - Complete rewrite using `openid-client`
   - Added discovery initialization
   - Added PKCE support
   - Full signature validation

3. **backend/src/routes/auth.js**
   - Updated to use new 'oidc' strategy
   - Uses validated claims from ID token

4. **backend/src/app.js**
   - Updated passport import

## How to Apply

### Step 1: Rebuild containers with new dependencies
```powershell
# Stop containers
docker-compose down

# Remove backend container to force rebuild
docker rm mailler-backend-1

# Rebuild and start
docker-compose up -d --build
```

### Step 2: Verify OIDC discovery
Check backend logs for:
```
Discovered OIDC issuer: https://your-oidc-provider.example.com/openidc
Authorization endpoint: https://your-oidc-provider.example.com/openidc/authorize
Token endpoint: https://your-oidc-provider.example.com/openidc/token
JWKS URI: https://your-oidc-provider.example.com/openidc/jwks
✅ OpenID Connect client initialized with signature validation
```

### Step 3: Test authentication
1. Go to https://localhost
2. Click login
3. Check backend logs for "ID Token claims (signature validated)"
4. Verify successful login

## Environment Variables
All OIDC configuration remains in `.env`:
```ini
OIDC_ISSUER=https://your-oidc-provider.example.com/openidc
OIDC_CLIENT_ID=MailuId
OIDC_CLIENT_SECRET=local-test-client-secret
OIDC_CALLBACK_URL=https://localhost/webmail/oauth2/authorize
OIDC_SCOPE=openid profile email
```

## Benefits

✅ **Industry standard** - Uses official OpenID Foundation certified library  
✅ **Prevents token forgery** - Full signature validation via JWKS  
✅ **Prevents replay attacks** - Nonce and state validation  
✅ **Prevents code interception** - PKCE protection  
✅ **Future-proof** - Automatic discovery handles provider changes  
✅ **Better error handling** - Detailed validation error messages  

## References
- [openid-client npm](https://www.npmjs.com/package/openid-client)
- [OpenID Connect Core Spec](https://openid.net/specs/openid-connect-core-1_0.html)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
