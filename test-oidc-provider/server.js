require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jose = require('node-jose');

const app = express();
const PORT = process.env.PORT || 9000;
const ISSUER = process.env.ISSUER || `http://localhost:${PORT}`;
// Public issuer URL for external clients (browser access through HAProxy)
const PUBLIC_ISSUER = process.env.PUBLIC_ISSUER || ISSUER;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware - skip health checks
app.use((req, res, next) => {
    // Skip logging health check requests
    if (req.originalUrl === '/health' || req.method === 'HEAD') {
        return next();
    }

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    if (Object.keys(req.query).length > 0) {
        console.log('  Query:', JSON.stringify(req.query));
    }
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('  Body:', JSON.stringify(req.body));
    }
    next();
});

// In-memory storage
const authorizationCodes = new Map();
const accessTokens = new Map();

// Hardcoded user from environment
const HARDCODED_USER = {
    sub: process.env.USER_SUB || 'test-user-12345',
    email: process.env.USER_EMAIL || 'test@example.com',
    email_verified: true,
    name: process.env.USER_NAME || 'Test User',
    preferred_username: process.env.USER_PREFERRED_USERNAME || 'testuser',
    given_name: 'Test',
    family_name: 'User',
    updated_at: Math.floor(Date.now() / 1000)
};

// Client configuration
const CLIENT_ID = process.env.CLIENT_ID || 'MailuId';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'local-test-client-secret';

// Generate RSA key pair for JWT signing
let keystore;
let signingKey;

async function initializeKeys() {
    keystore = jose.JWK.createKeyStore();
    signingKey = await keystore.generate('RSA', 2048, { alg: 'RS256', use: 'sig', kid: 'test-key-1' });
    console.log('✅ RSA key pair generated for JWT signing');
}

// Helper: Generate code verifier challenge hash
function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256')
        .update(verifier)
        .digest('base64url');
}

// Helper: Validate code challenge
function validateCodeChallenge(verifier, challenge, method) {
    if (method === 'S256') {
        const computed = generateCodeChallenge(verifier);
        return computed === challenge;
    } else if (method === 'plain') {
        return verifier === challenge;
    }
    return false;
}

// OpenID Connect Discovery endpoint
app.get('/.well-known/openid-configuration', (req, res) => {
    console.log('📋 Discovery endpoint called');

    // Return public URLs for browser access
    const config = {
        issuer: PUBLIC_ISSUER,
        authorization_endpoint: `${PUBLIC_ISSUER}/authorize`,
        token_endpoint: `${PUBLIC_ISSUER}/token`,
        userinfo_endpoint: `${PUBLIC_ISSUER}/userinfo`,
        jwks_uri: `${PUBLIC_ISSUER}/.well-known/jwks.json`,
        response_types_supported: ['code', 'id_token', 'token id_token'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        scopes_supported: ['openid', 'profile', 'email'],
        token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
        claims_supported: ['sub', 'email', 'email_verified', 'name', 'preferred_username', 'given_name', 'family_name'],
        code_challenge_methods_supported: ['S256', 'plain'],
        grant_types_supported: ['authorization_code', 'refresh_token']
    };

    console.log('📤 Returning discovery with PUBLIC_ISSUER:', PUBLIC_ISSUER);
    res.json(config);
});

// JWKS endpoint
app.get('/.well-known/jwks.json', (req, res) => {
    console.log('🔑 JWKS endpoint called');

    const jwks = keystore.toJSON();
    res.json(jwks);
});

// Authorization endpoint
app.get('/authorize', (req, res) => {
    console.log('\n🚀 Authorization request received');
    console.log('Parameters:', JSON.stringify(req.query, null, 2));

    const {
        client_id,
        redirect_uri,
        response_type,
        scope,
        state,
        nonce,
        code_challenge,
        code_challenge_method
    } = req.query;

    // Validate client_id
    if (client_id !== CLIENT_ID) {
        console.error('❌ Invalid client_id:', client_id);
        return res.status(400).send('Invalid client_id');
    }

    // Validate response_type
    if (response_type !== 'code') {
        console.error('❌ Unsupported response_type:', response_type);
        return res.status(400).send('Unsupported response_type');
    }

    // Validate required parameters
    if (!redirect_uri || !scope) {
        console.error('❌ Missing required parameters');
        return res.status(400).send('Missing required parameters');
    }

    // Check if openid scope is present
    if (!scope.includes('openid')) {
        console.error('❌ Missing openid scope');
        return res.status(400).send('openid scope is required');
    }

    console.log('✅ Authorization request validated');
    console.log('  Client:', client_id);
    console.log('  Redirect URI:', redirect_uri);
    console.log('  Scope:', scope);
    console.log('  State:', state);
    console.log('  Nonce:', nonce);
    console.log('  Code Challenge Method:', code_challenge_method);

    // Generate authorization code
    const code = crypto.randomBytes(32).toString('base64url');

    // Store authorization code with associated data
    authorizationCodes.set(code, {
        client_id,
        redirect_uri,
        scope,
        nonce,
        code_challenge,
        code_challenge_method,
        user: HARDCODED_USER,
        expires_at: Date.now() + (parseInt(process.env.CODE_EXPIRATION) || 300) * 1000
    });

    console.log('✅ Authorization code generated:', code.substring(0, 20) + '...');
    console.log('🔄 Auto-approving and redirecting user...\n');

    // Auto-approve and redirect back with code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) {
        redirectUrl.searchParams.set('state', state);
    }

    console.log('🌐 Redirecting to:', redirectUrl.toString());
    res.redirect(redirectUrl.toString());
});

// Token endpoint
app.post('/token', async (req, res) => {
    console.log('\n🔐 Token request received');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const {
        grant_type,
        code,
        redirect_uri,
        client_id,
        client_secret,
        code_verifier
    } = req.body;

    // Validate client credentials
    if (client_id !== CLIENT_ID || client_secret !== CLIENT_SECRET) {
        console.error('❌ Invalid client credentials');
        return res.status(401).json({ error: 'invalid_client' });
    }

    // Validate grant_type
    if (grant_type !== 'authorization_code') {
        console.error('❌ Unsupported grant_type:', grant_type);
        return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    // Get authorization code data
    const authData = authorizationCodes.get(code);

    if (!authData) {
        console.error('❌ Invalid or expired authorization code');
        return res.status(400).json({ error: 'invalid_grant' });
    }

    // Check expiration
    if (Date.now() > authData.expires_at) {
        console.error('❌ Authorization code expired');
        authorizationCodes.delete(code);
        return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code expired' });
    }

    // Validate redirect_uri
    if (redirect_uri !== authData.redirect_uri) {
        console.error('❌ Redirect URI mismatch');
        return res.status(400).json({ error: 'invalid_grant' });
    }

    // Validate PKCE challenge
    if (authData.code_challenge) {
        if (!code_verifier) {
            console.error('❌ Missing code_verifier for PKCE');
            return res.status(400).json({ error: 'invalid_grant', error_description: 'code_verifier required' });
        }

        const isValid = validateCodeChallenge(
            code_verifier,
            authData.code_challenge,
            authData.code_challenge_method || 'plain'
        );

        if (!isValid) {
            console.error('❌ PKCE validation failed');
            return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid code_verifier' });
        }

        console.log('✅ PKCE validation successful');
    }

    // Delete used authorization code
    authorizationCodes.delete(code);

    console.log('✅ Authorization code validated');
    console.log('📝 Generating tokens for user:', authData.user.email);

    // Generate access token
    const accessToken = crypto.randomBytes(32).toString('base64url');
    accessTokens.set(accessToken, {
        user: authData.user,
        scope: authData.scope,
        expires_at: Date.now() + (parseInt(process.env.ACCESS_TOKEN_EXPIRATION) || 3600) * 1000
    });

    // Generate ID token (JWT)
    const now = Math.floor(Date.now() / 1000);
    const idTokenPayload = {
        iss: PUBLIC_ISSUER,  // Use public issuer for browser-accessible endpoints
        sub: authData.user.sub,
        aud: client_id,
        exp: now + (parseInt(process.env.ID_TOKEN_EXPIRATION) || 3600),
        iat: now,
        auth_time: now,
        nonce: authData.nonce, // Include nonce if provided
        email: authData.user.email,
        email_verified: authData.user.email_verified,
        name: authData.user.name,
        preferred_username: authData.user.preferred_username
    };

    // Sign ID token with RSA private key
    const idToken = await new Promise((resolve, reject) => {
        jose.JWS.createSign({ format: 'compact' }, signingKey)
            .update(JSON.stringify(idTokenPayload))
            .final()
            .then(result => resolve(result))
            .catch(reject);
    });

    console.log('✅ Tokens generated successfully');
    console.log('  Access Token:', accessToken.substring(0, 20) + '...');
    console.log('  ID Token (signed with RS256):', idToken.substring(0, 50) + '...');
    console.log('  ID Token Claims:', JSON.stringify(idTokenPayload, null, 2));

    // Return tokens
    res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: parseInt(process.env.ACCESS_TOKEN_EXPIRATION) || 3600,
        id_token: idToken,
        scope: authData.scope
    });

    console.log('✅ Token response sent\n');
});

// UserInfo endpoint
app.get('/userinfo', (req, res) => {
    console.log('\n👤 UserInfo request received');

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('❌ Missing or invalid Authorization header');
        return res.status(401).json({ error: 'invalid_token' });
    }

    const accessToken = authHeader.substring(7);
    const tokenData = accessTokens.get(accessToken);

    if (!tokenData) {
        console.error('❌ Invalid or expired access token');
        return res.status(401).json({ error: 'invalid_token' });
    }

    // Check expiration
    if (Date.now() > tokenData.expires_at) {
        console.error('❌ Access token expired');
        accessTokens.delete(accessToken);
        return res.status(401).json({ error: 'invalid_token' });
    }

    console.log('✅ Access token validated');
    console.log('📤 Returning user info for:', tokenData.user.email);

    // Return user info based on scope
    const scopes = tokenData.scope.split(' ');
    const userInfo = { sub: tokenData.user.sub };

    if (scopes.includes('email')) {
        userInfo.email = tokenData.user.email;
        userInfo.email_verified = tokenData.user.email_verified;
    }

    if (scopes.includes('profile')) {
        userInfo.name = tokenData.user.name;
        userInfo.preferred_username = tokenData.user.preferred_username;
        userInfo.given_name = tokenData.user.given_name;
        userInfo.family_name = tokenData.user.family_name;
        userInfo.updated_at = tokenData.user.updated_at;
    }

    console.log('UserInfo response:', JSON.stringify(userInfo, null, 2));
    res.json(userInfo);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', issuer: ISSUER });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Test OpenID Connect Provider',
        issuer: ISSUER,
        discovery: `${ISSUER}/.well-known/openid-configuration`,
        hardcoded_user: {
            sub: HARDCODED_USER.sub,
            email: HARDCODED_USER.email,
            name: HARDCODED_USER.name
        }
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'internal_server_error', error_description: err.message });
});

// Initialize and start server
async function start() {
    try {
        await initializeKeys();

        app.listen(PORT, () => {
            console.log('\n==============================================');
            console.log('🚀 Test OIDC Provider running');
            console.log('==============================================');
            console.log(`Issuer: ${ISSUER}`);
            console.log(`Discovery: ${ISSUER}/.well-known/openid-configuration`);
            console.log(`\nClient Credentials:`);
            console.log(`  Client ID: ${CLIENT_ID}`);
            console.log(`  Client Secret: ${CLIENT_SECRET}`);
            console.log(`\nHardcoded User:`);
            console.log(`  Subject: ${HARDCODED_USER.sub}`);
            console.log(`  Email: ${HARDCODED_USER.email}`);
            console.log(`  Name: ${HARDCODED_USER.name}`);
            console.log('==============================================\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
