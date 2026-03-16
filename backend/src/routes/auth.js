const express = require('express');
const { passport, initializeOIDC } = require('../config/passport');

const router = express.Router();

// Login route - initiates OIDC flow with PKCE
router.get('/login', (req, res, next) => {
  console.log('\n========== LOGIN REQUEST ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('URL:', req.originalUrl);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', JSON.stringify(req.session, null, 2));
  console.log('===================================\n');
  next();
}, passport.authenticate('oidc'));

// Callback routes - support both /auth/callback and /webmail/oauth2/authorize for HAProxy
router.get('/callback',
  (req, res, next) => {
    console.log('\n========== CALLBACK REQUEST ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL:', req.originalUrl);
    console.log('Query params:', JSON.stringify(req.query, null, 2));
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', JSON.stringify(req.session, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('======================================\n');
    next();
  },
  passport.authenticate('oidc', {
    failureRedirect: '/auth/login'
  }),
  (req, res) => {
    console.log('\n========== AUTHENTICATION SUCCESS ==========');
    console.log('User:', JSON.stringify(req.user, null, 2));
    console.log('Session ID:', req.sessionID);
    console.log('Redirecting to:', process.env.FRONTEND_URL || 'http://localhost:5173');
    console.log('===========================================\n');
    // Successful authentication with validated ID token signature
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  }
);

// HAProxy/OIDC callback route (alternate path)
router.get('/oauth2/authorize',
  (req, res, next) => {
    console.log('\n========== OAUTH2/AUTHORIZE CALLBACK ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL:', req.originalUrl);
    console.log('Query params:', JSON.stringify(req.query, null, 2));
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', JSON.stringify(req.session, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('===============================================\n');
    next();
  },
  passport.authenticate('oidc', {
    failureRedirect: '/auth/login'
  }),
  (req, res) => {
    console.log('\n========== AUTHENTICATION SUCCESS (OAUTH2) ==========');
    console.log('User:', JSON.stringify(req.user, null, 2));
    console.log('Session ID:', req.sessionID);
    console.log('Redirecting to:', process.env.FRONTEND_URL || 'http://localhost:5173');
    console.log('====================================================\n');
    // Successful authentication with validated ID token signature
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
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
