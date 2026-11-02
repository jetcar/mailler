const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { after, before, test } = require('node:test');
const jwt = require('jsonwebtoken');

const port = 19091;
const issuer = `http://127.0.0.1:${port}`;
process.env.PORT = String(port);
process.env.ISSUER = issuer;

const { app, initializeKeys } = require('./server');

let server;
let originalConsoleLog;
let originalConsoleError;
const logMessages = [];

before(async () => {
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = (...args) => logMessages.push(args.join(' '));
    console.error = (...args) => logMessages.push(args.join(' '));
    await initializeKeys();
    server = await new Promise((resolve) => {
        const listener = app.listen(port, () => resolve(listener));
    });
});

after(async () => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
});

test('authorization code flow signs a verifiable ID token without logging secrets', async () => {
    const redirectUri = 'http://127.0.0.1:19999/callback';
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    const nonce = crypto.randomBytes(16).toString('base64url');
    const state = crypto.randomBytes(16).toString('base64url');
    const authorizationUrl = new URL(`${issuer}/authorize`);
    authorizationUrl.search = new URLSearchParams({
        client_id: 'MailuId',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile email',
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: 'S256'
    });

    const authorizationResponse = await fetch(authorizationUrl, { redirect: 'manual' });
    assert.equal(authorizationResponse.status, 302);
    const callbackUrl = new URL(authorizationResponse.headers.get('location'));
    assert.equal(callbackUrl.searchParams.get('state'), state);
    const code = callbackUrl.searchParams.get('code');
    assert.ok(code);

    const tokenResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: 'MailuId',
            client_secret: 'local-test-client-secret',
            code_verifier: verifier
        })
    });
    assert.equal(tokenResponse.status, 200);
    const tokens = await tokenResponse.json();

    const jwksResponse = await fetch(`${issuer}/.well-known/jwks.json`);
    const jwks = await jwksResponse.json();
    assert.equal(jwks.keys[0].kid, 'test-key-1');
    const publicKey = crypto.createPublicKey({ key: jwks.keys[0], format: 'jwk' });
    const claims = jwt.verify(tokens.id_token, publicKey, {
        algorithms: ['RS256'],
        issuer,
        audience: 'MailuId'
    });
    assert.equal(claims.nonce, nonce);

    const logs = logMessages.join('\n');
    for (const secret of [code, verifier, challenge, state, nonce, tokens.access_token, tokens.id_token, 'local-test-client-secret']) {
        assert.equal(logs.includes(secret), false, `logs contain secret: ${secret}`);
    }
});

test('rejects parameter pollution', async () => {
    const response = await fetch(
        `${issuer}/authorize?client_id[]=MailuId&redirect_uri=x&response_type=code&scope=openid`,
        { redirect: 'manual' }
    );

    assert.equal(response.status, 400);
});

test('rejects missing and incorrect PKCE verifiers without logging them', async () => {
    const redirectUri = 'http://127.0.0.1:19999/callback';
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    const authorizationUrl = new URL(`${issuer}/authorize`);
    authorizationUrl.search = new URLSearchParams({
        client_id: 'MailuId',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid',
        code_challenge: challenge,
        code_challenge_method: 'S256'
    });
    const authorizationResponse = await fetch(authorizationUrl, { redirect: 'manual' });
    const code = new URL(authorizationResponse.headers.get('location')).searchParams.get('code');
    const tokenBody = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: 'MailuId',
        client_secret: 'local-test-client-secret'
    };

    const missingVerifierResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenBody)
    });
    assert.equal(missingVerifierResponse.status, 400);
    assert.equal((await missingVerifierResponse.json()).error, 'invalid_grant');

    const wrongVerifier = crypto.randomBytes(32).toString('base64url');
    const wrongVerifierResponse = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ ...tokenBody, code_verifier: wrongVerifier })
    });
    assert.equal(wrongVerifierResponse.status, 400);
    assert.equal((await wrongVerifierResponse.json()).error, 'invalid_grant');

    const logs = logMessages.join('\n');
    for (const secret of [code, verifier, challenge, wrongVerifier, 'local-test-client-secret']) {
        assert.equal(logs.includes(secret), false, `logs contain secret: ${secret}`);
    }
});
