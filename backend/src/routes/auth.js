const express = require('express');
const { passport, initializeOIDC } = require('../config/passport');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Login route - initiates OIDC flow with PKCE
router.get('/login', (req, res, next) => {
  logger.info('OIDC login requested', {
    url: req.originalUrl,
    hasSession: Boolean(req.session)
  });
  next();
}, passport.authenticate('oidc'));

// Callback routes - support both /auth/callback and /webmail/oauth2/authorize for HAProxy
router.get('/callback',
  (req, res, next) => {
    logger.info('OIDC callback received', {
      url: req.originalUrl,
      queryKeys: Object.keys(req.query || {})
    });
    next();
  },
  passport.authenticate('oidc', {
    failureRedirect: '/auth/login'
  }),
  (req, res) => {
    const redirectUrl = (process.env.FRONTEND_URL || 'https://host.docker.internal') + '/inbox';
    logger.info('OIDC authentication succeeded', {
      user: req.user?.email || req.user?.id,
      redirectUrl
    });
    // Successful authentication with validated ID token signature
    res.redirect(redirectUrl);
  }
);

// HAProxy/OIDC callback route (alternate path)
router.get('/oauth2/authorize',
  (req, res, next) => {
    logger.info('Alternate OIDC callback received', {
      url: req.originalUrl,
      queryKeys: Object.keys(req.query || {})
    });
    next();
  },
  passport.authenticate('oidc', {
    failureRedirect: '/auth/login'
  }),
  (req, res) => {
    const redirectUrl = (process.env.FRONTEND_URL || 'https://host.docker.internal') + '/inbox';
    logger.info('Alternate OIDC authentication succeeded', {
      user: req.user?.email || req.user?.id,
      redirectUrl
    });
    // Successful authentication with validated ID token signature
    res.redirect(redirectUrl);
  }
);

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      display_name: req.user.display_name
    }
  });
});

module.exports = router;
