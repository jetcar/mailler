const passport = require('passport');
const CustomStrategy = require('passport-custom').Strategy;
const { Issuer, generators, custom } = require('openid-client');
const { User, EmailAccount } = require('../models');
const http = require('http');
const https = require('https');
const { logger } = require('../middleware/errorHandler');

let client = null;
let issuer = null;
const allowInsecureOidcTls = process.env.ALLOW_INSECURE_OIDC_TLS === 'true';

// Custom HTTP options for development (accept self-signed certificates)
const httpOptions = {
  lookup: (options) => {
    // Return appropriate agent based on protocol
    if (options.protocol === 'https:') {
      return {
        ...options,
        agent: new https.Agent({
          rejectUnauthorized: !allowInsecureOidcTls
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
      // Configure custom HTTP client for openid-client only when insecure TLS is explicitly allowed
      if (allowInsecureOidcTls) {
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

      logger.info('Discovered OIDC issuer', {
        issuer: issuer.metadata.issuer,
        authorizationEndpoint: issuer.metadata.authorization_endpoint,
        tokenEndpoint: issuer.metadata.token_endpoint,
        jwksUri: issuer.metadata.jwks_uri
      });

      // Create client with proper configuration
      client = new issuer.Client({
        client_id: process.env.OIDC_CLIENT_ID,
        client_secret: process.env.OIDC_CLIENT_SECRET,
        redirect_uris: [process.env.OIDC_CALLBACK_URL],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_post',
      });

      // Apply custom HTTP options to client as well
      if (allowInsecureOidcTls) {
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

      logger.info('OpenID Connect client initialized with signature validation');
      if (allowInsecureOidcTls) {
        logger.warn('Insecure OIDC TLS is enabled via ALLOW_INSECURE_OIDC_TLS=true');
      }
    } catch (error) {
      logger.error('Failed to initialize OIDC client', { error: error.message });
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
      logger.info('Processing OIDC callback with authorization code');

      const params = client.callbackParams(req);
      logger.debug('OIDC callback params received', { queryKeys: Object.keys(params || {}) });

      const codeVerifier = req.session.codeVerifier;
      const state = req.session.state;
      const nonce = req.session.nonce;

      logger.debug('OIDC callback session state check', {
        hasCodeVerifier: Boolean(codeVerifier),
        hasState: Boolean(state),
        hasNonce: Boolean(nonce)
      });

      if (!codeVerifier || !state || !nonce) {
        logger.warn('OIDC callback missing session state; redirecting user to login', {
          hasCodeVerifier: Boolean(codeVerifier),
          hasState: Boolean(state),
          hasNonce: Boolean(nonce),
          callbackUrl: req.originalUrl,
        });

        return done(null, false);
      }

      logger.info('Exchanging authorization code for tokens');
      // Exchange code for tokens with automatic signature validation
      const tokenSet = await client.callback(
        process.env.OIDC_CALLBACK_URL,
        params,
        { code_verifier: codeVerifier, state, nonce }
      );

      logger.info('Token exchange successful');
      logger.debug('OIDC token set summary', {
        tokenTypes: Object.keys(tokenSet),
        hasAccessToken: Boolean(tokenSet.access_token),
        hasIdToken: Boolean(tokenSet.id_token),
        hasRefreshToken: Boolean(tokenSet.refresh_token)
      });

      // Get validated claims from ID token (signature already verified by openid-client)
      const claims = tokenSet.claims();

      logger.debug('Validated OIDC claims received', {
        sub: claims.sub,
        email: claims.email,
        preferredUsername: claims.preferred_username
      });

      // Find or create user
      logger.info('Looking up user by OIDC subject', { sub: claims.sub });
      let user = await User.findOne({ where: { oidc_sub: claims.sub } });

      if (!user) {
        logger.info('User not found, creating new user', { sub: claims.sub, email: claims.email });
        user = await User.create({
          oidc_sub: claims.sub,
          email: claims.email,
          display_name: claims.name || claims.preferred_username
        });
        logger.info('Created new user', {
          id: user.id,
          email: user.email,
          display_name: user.display_name
        });

        // Auto-create local email account for the user
        const emailAccount = await EmailAccount.create({
          user_id: user.id,
          email_address: claims.email,
          is_default: true
        });
        logger.info('Created default email account for new user', { emailAddress: emailAccount.email_address, userId: user.id });
      } else {
        logger.info('Existing user found, updating profile', { userId: user.id, email: claims.email });
        await user.update({
          email: claims.email,
          display_name: claims.name || claims.preferred_username
        });
        logger.info('Updated existing user', {
          id: user.id,
          email: user.email,
          display_name: user.display_name
        });

        // Ensure user has an email account
        let emailAccount = await EmailAccount.findOne({
          where: { user_id: user.id }
        });

        if (!emailAccount) {
          emailAccount = await EmailAccount.create({
            user_id: user.id,
            email_address: claims.email,
            is_default: true
          });
          logger.info('Created missing email account for existing user', { emailAddress: emailAccount.email_address, userId: user.id });
        } else {
          // Update email address if changed
          if (emailAccount.email_address !== claims.email) {
            await emailAccount.update({ email_address: claims.email });
            logger.info('Updated email account address', { emailAddress: emailAccount.email_address, userId: user.id });
          }
        }
      }

      logger.info('OIDC authentication complete', { userId: user.id, email: user.email });
      return done(null, user);
    }

    // Initial authorization request
    logger.info('Initiating OIDC authorization flow');

    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const state = generators.state();
    const nonce = generators.nonce();

    logger.debug('Generated PKCE parameters', {
      codeVerifierLength: codeVerifier.length,
      codeChallengePrefix: codeChallenge.substring(0, 20),
      hasState: Boolean(state),
      hasNonce: Boolean(nonce)
    });

    // Store for callback validation
    req.session.codeVerifier = codeVerifier;
    req.session.state = state;
    req.session.nonce = nonce;

    logger.debug('Saved OIDC challenge data to session', {
      sessionId: req.sessionID,
      hasCodeVerifier: !!req.session.codeVerifier,
      hasState: !!req.session.state,
      hasNonce: !!req.session.nonce
    });

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

    logger.info('Redirecting user to OIDC provider', { authorizationUrl: publicAuthUrl });

    // Redirect to OIDC provider
    req.res.redirect(publicAuthUrl);

  } catch (error) {
    logger.error('OIDC authentication error', {
      errorType: error.constructor?.name,
      error: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : undefined
    });
    return done(error);
  }
}));

// Serialize user to session
passport.serializeUser((user, done) => {
  logger.debug('Serializing user to session', { userId: user.id });
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  logger.debug('Deserializing user from session', { userId: id });
  try {
    const user = await User.findByPk(id);
    if (user) {
      logger.debug('User deserialized', { userId: user.id, email: user.email });
    } else {
      logger.warn('User not found during deserialization', { userId: id });
    }
    done(null, user);
  } catch (error) {
    logger.error('Deserialization error', { error: error.message, userId: id });
    done(error);
  }
});

// Export both passport and initializeOIDC for use in routes
module.exports = { passport, initializeOIDC };
