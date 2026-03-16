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
      is_default
    } = req.body;

    // Validation
    if (!email_address) {
      return res.status(400).json({ error: 'Email address is required' });
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
      is_default: is_default || false
    });

    res.status(201).json({ account: account.toJSON() });
  } catch (error) {
    next(error);
  }
});

// Update email account
router.put('/:id', ensureAuthenticated, ensureOwnership(EmailAccount), async (req, res, next) => {
  try {
    const updates = {};
    const allowedFields = ['email_address', 'is_default'];

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

    res.json({ account: req.resource.toJSON() });
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
