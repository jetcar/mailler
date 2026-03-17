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

// Fetch available folders from external IMAP provider
router.post('/import/folders', ensureAuthenticated, async (req, res, next) => {
  try {
    const { imap_host, imap_port, imap_username, imap_password } = req.body;

    // Validation
    if (!imap_host || !imap_username || !imap_password) {
      return res.status(400).json({
        error: 'Missing required fields: imap_host, imap_username, imap_password'
      });
    }

    console.log(`📂 User ${req.user.email} fetching folders from ${imap_host}`);

    const folders = await receiverService.fetchFolders({
      host: imap_host,
      port: imap_port || 993,
      username: imap_username,
      password: imap_password
    });

    res.json({ folders });
  } catch (error) {
    next(error);
  }
});

// Import from multiple folders
// SSE endpoint for import progress with logs
router.get('/import/progress/:sessionId', ensureAuthenticated, (req, res) => {
  const { sessionId } = req.params;

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
  console.log(`📡 SSE connection established for session: ${sessionId}`);

  // Set up event listeners
  const logHandler = (data) => {
    if (data.sessionId === sessionId) {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error('Failed to send log event:', error);
      }
    }
  };

  const completeHandler = (data) => {
    if (data.sessionId === sessionId) {
      try {
        const completeData = { type: 'complete', ...data };
        console.log(`📡 Sending completion event for session ${sessionId}:`, completeData);
        res.write(`data: ${JSON.stringify(completeData)}\n\n`);
        res.end();
        console.log(`📡 SSE connection closed for session: ${sessionId}`);
      } catch (error) {
        console.error('Failed to send complete event:', error);
        res.end();
      }
    }
  };

  receiverService.on('import:log', logHandler);
  receiverService.on('import:complete', completeHandler);

  // Clean up on client disconnect
  req.on('close', () => {
    console.log(`📡 SSE client disconnected for session: ${sessionId}`);
    receiverService.off('import:log', logHandler);
    receiverService.off('import:complete', completeHandler);
  });
});

router.post('/import/multi', ensureAuthenticated, async (req, res, next) => {
  try {
    const { account_id, imap_host, imap_port, imap_username, imap_password, folders, limit_per_folder, session_id } = req.body;

    // Validation
    if (!account_id || !imap_host || !imap_username || !imap_password || !folders || !Array.isArray(folders)) {
      return res.status(400).json({
        error: 'Missing required fields: account_id, imap_host, imap_username, imap_password, folders (array)'
      });
    }

    // Check account ownership
    const account = await EmailAccount.findByPk(account_id);
    if (!account || account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Invalid account' });
    }

    console.log(`📥 User ${req.user.email} importing from ${folders.length} folders on ${imap_host}`);

    // Return immediately - import runs in background
    res.status(202).json({
      message: 'Import started',
      sessionId: session_id,
      folders: folders.length
    });

    // Run import in background (don't await)
    receiverService.importFromMultipleFolders(
      account_id,
      {
        host: imap_host,
        port: imap_port || 993,
        username: imap_username,
        password: imap_password
      },
      folders,
      limit_per_folder || 100,
      session_id
    ).catch(error => {
      console.error('Background import failed:', error);
      receiverService.emitLog(session_id, 'error', `Import failed: ${error.message}`);
      receiverService.emit('import:complete', {
        sessionId: session_id,
        error: error.message,
        results: {
          totalImported: 0,
          totalSkipped: 0,
          folders: []
        }
      });
    });
  } catch (error) {
    next(error);
  }
});

// Import emails from external IMAP provider (Gmail, Yahoo, etc.)
router.post('/import', ensureAuthenticated, async (req, res, next) => {
  try {
    const { account_id, imap_host, imap_port, imap_username, imap_password, folder, limit } = req.body;

    // Validation
    if (!account_id || !imap_host || !imap_username || !imap_password) {
      return res.status(400).json({
        error: 'Missing required fields: account_id, imap_host, imap_username, imap_password'
      });
    }

    // Check account ownership
    const account = await EmailAccount.findByPk(account_id);
    if (!account || account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Invalid account' });
    }

    console.log(`📥 User ${req.user.email} importing from ${imap_host}`);

    const result = await receiverService.importFromExternal(
      account_id,
      {
        host: imap_host,
        port: imap_port || 993,
        username: imap_username,
        password: imap_password
      },
      folder || 'INBOX',
      limit || 100
    );

    res.json({
      message: 'Import completed',
      imported: result.imported,
      skipped: result.skipped,
      total: result.total
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
