const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const { Message, EmailAccount } = require('../models');
const mailerService = require('../services/mailer');
const receiverService = require('../services/receiver');
const { Op } = require('sequelize');

const router = express.Router();

// Get messages for current user
router.get('/', ensureAuthenticated, async (req, res, next) => {
  try {
    const { folder = 'INBOX', limit = 50, offset = 0, search } = req.query;

    // Get user's email accounts
    const accounts = await EmailAccount.findAll({
      where: { user_id: req.user.id },
      attributes: ['id']
    });

    const accountIds = accounts.map(a => a.id);

    const where = {
      account_id: { [Op.in]: accountIds }
    };

    if (folder) {
      where.folder = folder;
    }

    if (search) {
      where[Op.or] = [
        { subject: { [Op.iLike]: `%${search}%` } },
        { from_address: { [Op.iLike]: `%${search}%` } },
        { body_text: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const messages = await Message.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['received_date', 'DESC']],
      include: [{
        model: EmailAccount,
        as: 'account',
        attributes: ['email_address']
      }]
    });

    res.json({
      messages: messages.rows,
      total: messages.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

// Get single message
router.get('/:id', ensureAuthenticated, async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id, {
      include: [{
        model: EmailAccount,
        as: 'account',
        attributes: ['email_address', 'user_id']
      }]
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check ownership
    if (message.account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark as read
    if (!message.is_read) {
      await message.update({ is_read: true });
    }

    res.json({ message });
  } catch (error) {
    next(error);
  }
});

// Send email
router.post('/send', ensureAuthenticated, async (req, res, next) => {
  try {
    const { account_id, to, cc, bcc, subject, text, html, attachments } = req.body;

    // Validate
    if (!account_id || !to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: account_id, to, subject' });
    }

    // Check account ownership
    const account = await EmailAccount.findByPk(account_id);
    if (!account || account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Invalid account' });
    }

    // Send email
    const info = await mailerService.sendEmail(account_id, {
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      attachments
    });

    res.json({ 
      message: 'Email sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    next(error);
  }
});

// Sync emails from IMAP
router.post('/sync', ensureAuthenticated, async (req, res, next) => {
  try {
    const { account_id } = req.body;

    if (!account_id) {
      return res.status(400).json({ error: 'account_id required' });
    }

    // Check account ownership
    const account = await EmailAccount.findByPk(account_id);
    if (!account || account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Invalid account' });
    }

    const result = await receiverService.syncEmails(account_id);

    res.json({ 
      message: 'Sync completed',
      synced: result.synced
    });
  } catch (error) {
    next(error);
  }
});

// Update message (mark read/starred)
router.patch('/:id', ensureAuthenticated, async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id, {
      include: [{
        model: EmailAccount,
        as: 'account',
        attributes: ['user_id']
      }]
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (req.body.is_read !== undefined) updates.is_read = req.body.is_read;
    if (req.body.is_starred !== undefined) updates.is_starred = req.body.is_starred;
    if (req.body.folder !== undefined) updates.folder = req.body.folder;

    await message.update(updates);

    res.json({ message });
  } catch (error) {
    next(error);
  }
});

// Delete message
router.delete('/:id', ensureAuthenticated, async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id, {
      include: [{
        model: EmailAccount,
        as: 'account',
        attributes: ['user_id']
      }]
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await message.destroy();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
