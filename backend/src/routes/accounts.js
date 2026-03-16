const express = require('express');
const { ensureAuthenticated, ensureOwnership } = require('../middleware/auth');
const { EmailAccount } = require('../models');

const router = express.Router();

// Get all email accounts for current user
router.get('/', ensureAuthenticated, async (req, res, next) => {
  try {
    const accounts = await EmailAccount.findAll({
      where: { user_id: req.user.id },
      attributes: { exclude: ['imap_password', 'smtp_password'] }
    });
    
    res.json({ accounts });
  } catch (error) {
    next(error);
  }
});

// Get single email account
router.get('/:id', ensureAuthenticated, ensureOwnership(EmailAccount), async (req, res) => {
  const account = req.resource.toJSON();
  delete account.imap_password;
  delete account.smtp_password;
  
  res.json({ account });
});

// Create email account
router.post('/', ensureAuthenticated, async (req, res, next) => {
  try {
    const {
      email_address,
      imap_host,
      imap_port,
      imap_username,
      imap_password,
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      is_default
    } = req.body;

    // Validation
    if (!email_address || !imap_host || !imap_username || !imap_password ||
        !smtp_host || !smtp_username || !smtp_password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await EmailAccount.update(
        { is_default: false },
        { where: { user_id: req.user.id } }
      );
    }

    const account = await EmailAccount.create({
      user_id: req.user.id,
      email_address,
      imap_host,
      imap_port: imap_port || 993,
      imap_username,
      imap_password,
      smtp_host,
      smtp_port: smtp_port || 587,
      smtp_username,
      smtp_password,
      is_default: is_default || false
    });

    const result = account.toJSON();
    delete result.imap_password;
    delete result.smtp_password;

    res.status(201).json({ account: result });
  } catch (error) {
    next(error);
  }
});

// Update email account
router.put('/:id', ensureAuthenticated, ensureOwnership(EmailAccount), async (req, res, next) => {
  try {
    const updates = {};
    const allowedFields = [
      'email_address', 'imap_host', 'imap_port', 'imap_username', 'imap_password',
      'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'is_default'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // If setting as default, unset other defaults
    if (updates.is_default) {
      await EmailAccount.update(
        { is_default: false },
        { where: { user_id: req.user.id, id: { [require('sequelize').Op.ne]: req.params.id } } }
      );
    }

    await req.resource.update(updates);

    const result = req.resource.toJSON();
    delete result.imap_password;
    delete result.smtp_password;

    res.json({ account: result });
  } catch (error) {
    next(error);
  }
});

// Delete email account
router.delete('/:id', ensureAuthenticated, ensureOwnership(EmailAccount), async (req, res, next) => {
  try {
    await req.resource.destroy();
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
