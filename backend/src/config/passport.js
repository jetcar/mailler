const passport = require('passport');
const CustomStrategy = require('passport-custom').Strategy;
const { Issuer, generators, custom } = require('openid-client');
const { User } = require('../models');
const http = require('http');
const https = require('https');

let client = null;
let issuer = null;

// Custom HTTP options for development (accept self-signed certificates)
const httpOptions = {
  lookup: (options) => {
    // Return appropriate agent based on protocol
    if (options.protocol === 'https:') {
      return {
        ...options,
        agent: new https.Agent({
          rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false
        })
      };
    } else {
      return {
        ...options,
        agent: new http.Agent()
      };
    }
  }
};

// Initialize OpenID Connect client with discovery
async function initializeOIDC() {
  if (!client) {
    try {
      // Configure custom HTTP client for openid-client to accept self-signed certs in dev
      if (process.env.NODE_ENV !== 'production') {
        Issuer[custom.http_options] = (url, options) => {
          const parsedUrl = new URL(url);
          if (parsedUrl.protocol === 'https:') {
            return {
              ...options,
              agent: new https.Agent({
                rejectUnauthorized: false
              })
            };
          }
          return options;
        };
      }

      // Discover OIDC configuration from /.well-known/openid-configuration
      issuer = await Issuer.discover(process.env.OIDC_ISSUER);

      console.log('Discovered OIDC issuer:', issuer.metadata.issuer);
      console.log('Authorization endpoint:', issuer.metadata.authorization_endpoint);
      console.log('Token endpoint:', issuer.metadata.token_endpoint);
      console.log('JWKS URI:', issuer.metadata.jwks_uri);

      // Create client with proper configuration
      client = new issuer.Client({
        client_id: process.env.OIDC_CLIENT_ID,
        client_secret: process.env.OIDC_CLIENT_SECRET,
        redirect_uris: [process.env.OIDC_CALLBACK_URL],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_post',
      });

      // Apply custom HTTP options to client as well
      if (process.env.NODE_ENV !== 'production') {
        client[custom.http_options] = (url, options) => {
          const parsedUrl = new URL(url);
          if (parsedUrl.protocol === 'https:') {
            return {
              ...options,
              agent: new https.Agent({
                rejectUnauthorized: false
              })
            };
          }
          return options;
        };
      }

      console.log('✅ OpenID Connect client initialized with signature validation');
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️  Development mode: Accepting self-signed certificates');
      }
    } catch (error) {
      console.error('❌ Failed to initialize OIDC client:', error.message);
      throw error;
    }
  }
  return client;
}

// Configure Passport with OpenID Connect
// This strategy will be used for both authorization and callback
passport.use('oidc', new CustomStrategy(async (req, done) => {
  try {
    await initializeOIDC();

    // Handle callback from OIDC provider
    if (req.query.code) {
      console.log('\n🔒 Processing OIDC callback with authorization code');
      console.log('Authorization code received:', req.query.code.substring(0, 20) + '...');

      const params = client.callbackParams(req);
      console.log('Callback params:', JSON.stringify(params, null, 2));

      const codeVerifier = req.session.codeVerifier;
      const state = req.session.state;
      const nonce = req.session.nonce;

      console.log('Session state check:');
      console.log('  - codeVerifier:', codeVerifier ? '✓ present' : '✗ MISSING');
      console.log('  - state:', state ? '✓ present' : '✗ MISSING');
      console.log('  - nonce:', nonce ? '✓ present' : '✗ MISSING');

      console.log('\n🔄 Exchanging authorization code for tokens...');
      // Exchange code for tokens with automatic signature validation
      const tokenSet = await client.callback(
        process.env.OIDC_CALLBACK_URL,
        params,
        { code_verifier: codeVerifier, state, nonce }
      );

      console.log('✅ Token exchange successful');
      console.log('Token types received:', Object.keys(tokenSet));
      console.log('Access token:', tokenSet.access_token ? '✓ present' : '✗ missing');
      console.log('ID token:', tokenSet.id_token ? '✓ present' : '✗ missing');
      console.log('Refresh token:', tokenSet.refresh_token ? '✓ present' : '✗ missing');

      // Get validated claims from ID token (signature already verified by openid-client)
      const claims = tokenSet.claims();

      console.log('\n👤 ID Token claims (signature validated):', JSON.stringify(claims, null, 2));

      // Find or create user
      console.log('\n🔍 Looking up user by OIDC sub:', claims.sub);
      let user = await User.findOne({ where: { oidc_sub: claims.sub } });

      if (!user) {
        console.log('👤 User not found, creating new user...');
        user = await User.create({
          oidc_sub: claims.sub,
          email: claims.email,
          display_name: claims.name || claims.preferred_username
        });
        console.log('✅ New user created:', JSON.stringify({
          id: user.id,
          email: user.email,
          display_name: user.display_name
        }, null, 2));
      } else {
        console.log('✅ Existing user found, updating information...');
        await user.update({
          email: claims.email,
          display_name: claims.name || claims.preferred_username
        });
        console.log('User updated:', JSON.stringify({
          id: user.id,
          email: user.email,
          display_name: user.display_name
        }, null, 2));
      }

      console.log('\n✅ Authentication complete, passing user to passport\n');
      return done(null, user);
    }

    // Initial authorization request
    console.log('\n🚀 Initiating OIDC authorization flow...');

    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const state = generators.state();
    const nonce = generators.nonce();

    console.log('Generated PKCE parameters:');
    console.log('  - Code verifier length:', codeVerifier.length);
    console.log('  - Code challenge:', codeChallenge.substring(0, 20) + '...');
    console.log('  - State:', state);
    console.log('  - Nonce:', nonce);

    // Store for callback validation
    req.session.codeVerifier = codeVerifier;
    req.session.state = state;
    req.session.nonce = nonce;

    console.log('\n💾 Saved to session:');
    console.log('  - Session ID:', req.sessionID);
    console.log('  - codeVerifier saved:', !!req.session.codeVerifier);
    console.log('  - state saved:', !!req.session.state);
    console.log('  - nonce saved:', !!req.session.nonce);

    const authUrl = client.authorizationUrl({
      scope: process.env.OIDC_SCOPE || 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state,
      nonce: nonce,
    });

    // Replace internal Docker URL with public URL for browser (if different)
    const publicIssuer = process.env.OIDC_PUBLIC_ISSUER || process.env.OIDC_ISSUER;
    const publicAuthUrl = authUrl.replace(process.env.OIDC_ISSUER, publicIssuer);

    console.log('\n🔗 Authorization URL:', publicAuthUrl);
    console.log('🌐 Redirecting user to OIDC provider...\n');

    // Redirect to OIDC provider
    req.res.redirect(publicAuthUrl);

  } catch (error) {
    console.error('\n❌ OIDC AUTHENTICATION ERROR ❌');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('HTTP Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    console.error('================================\n');
    return done(error);
  }
}));

// Serialize user to session
passport.serializeUser((user, done) => {
  console.log('📝 Serializing user to session:', user.id);
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  console.log('📖 Deserializing user from session:', id);
  try {
    const user = await User.findByPk(id);
    if (user) {
      console.log('✅ User deserialized:', user.email);
    } else {
      console.log('⚠️ User not found in database:', id);
    }
    done(null, user);
  } catch (error) {
    console.error('❌ Deserialization error:', error.message);
    done(error);
  }
});

// Export both passport and initializeOIDC for use in routes
module.exports = { passport, initializeOIDC };
