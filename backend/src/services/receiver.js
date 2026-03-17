const { EmailAccount, Message } = require('../models');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class ReceiverService extends EventEmitter {
  constructor() {
    super();
  }
  /**
   * Save raw email content to debug folder
   */
  async saveDebugEmail(uid, content, reason = 'unknown') {
    try {
      const debugDir = path.join(__dirname, '../../debug-emails');
      await fs.mkdir(debugDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `uid-${uid}-${reason}-${timestamp}.eml`;
      const filepath = path.join(debugDir, filename);

      await fs.writeFile(filepath, content);
      console.log(`     💾 Saved debug email: ${filename}`);
      return filepath;
    } catch (err) {
      console.error(`     ⚠️  Failed to save debug email:`, err.message);
    }
  }

  /**
   * Get emails from database (no external IMAP fetch needed - we receive directly via SMTP)
   * @param {number} accountId - Email account ID
   * @param {string} folder - Email folder (default: INBOX)
   * @param {number} limit - Number of emails to fetch
   */
  async fetchEmails(accountId, folder = 'INBOX', limit = 50) {
    try {
      const account = await EmailAccount.findByPk(accountId);

      if (!account) {
        throw new Error('Email account not found');
      }

      // Fetch messages from database (already received via SMTP)
      const messages = await Message.findAll({
        where: {
          account_id: accountId,
          folder: folder
        },
        order: [['received_date', 'DESC']],
        limit: limit
      });

      return messages.map(msg => ({
        id: msg.id,
        messageId: msg.message_id,
        from: msg.from_address,
        to: msg.to_addresses,
        cc: msg.cc_addresses,
        subject: msg.subject,
        date: msg.received_date,
        text: msg.body_text,
        html: msg.body_html,
        isRead: msg.is_read,
        isStarred: msg.is_starred
      }));
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  /**
   * Sync emails (no-op for pure email server - emails arrive via SMTP automatically)
   * @param {number} accountId - Email account ID
   */
  async syncEmails(accountId) {
    try {
      // For a pure email server, we don't need to sync from external IMAP
      // Emails are received directly via SMTP and stored by smtp-listener
      const account = await EmailAccount.findByPk(accountId);

      if (!account) {
        throw new Error('Email account not found');
      }

      // Just return count of existing messages
      const count = await Message.count({
        where: { account_id: accountId }
      });

      console.log(`📧 Email account ${account.email_address} has ${count} messages (received via SMTP)`);

      return {
        synced: 0,
        total: count,
        message: 'Emails are received automatically via SMTP server'
      };
    } catch (error) {
      console.error('Error syncing emails:', error);
      throw error;
    }
  }

  /**
   * Fetch available folders from external IMAP server
   * @param {Object} imapConfig - IMAP connection details
   * @returns {Array} List of folder names
   */
  async fetchFolders(imapConfig) {
    let connection;

    try {
      console.log(`📂 Fetching folders from ${imapConfig.host}...`);

      const config = {
        imap: {
          user: imapConfig.username,
          password: imapConfig.password,
          host: imapConfig.host,
          port: imapConfig.port || 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: false }
        }
      };

      connection = await imaps.connect(config);
      const boxes = await connection.getBoxes();
      connection.end();

      // Parse folder structure recursively
      const parseFolders = (boxTree, prefix = '') => {
        const folders = [];
        for (const [name, box] of Object.entries(boxTree)) {
          const fullName = prefix ? `${prefix}/${name}` : name;

          // Only include selectable folders (not just containers)
          if (!box.attribs || !box.attribs.includes('\\Noselect')) {
            folders.push({
              name: fullName,
              displayName: name,
              hasChildren: box.children && Object.keys(box.children).length > 0
            });
          }

          // Recursively add child folders
          if (box.children) {
            folders.push(...parseFolders(box.children, fullName));
          }
        }
        return folders;
      };

      const folders = parseFolders(boxes);
      console.log(`✅ Found ${folders.length} folders`);

      return folders;
    } catch (error) {
      if (connection) connection.end();
      console.error('❌ Error fetching folders:', error);
      throw error;
    }
  }

  /**
   * Import emails from multiple folders
   * @param {number} accountId - Local email account ID
   * @param {Object} imapConfig - IMAP connection details
   * @param {Array<string>} folders - Array of folder names to import from
   * @param {number} limitPerFolder - Max emails per folder (default: 100)
   */
  async importFromMultipleFolders(accountId, imapConfig, folders, limitPerFolder = 100, sessionId = null) {
    const results = {
      totalImported: 0,
      totalSkipped: 0,
      folders: []
    };

    console.log(`📥 Starting multi-folder import: ${folders.length} folders, ${limitPerFolder} per folder`);
    this.emitLog(sessionId, 'info', `Starting import from ${folders.length} folders (${limitPerFolder} emails per folder)`);

    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      try {
        console.log(`\n📁 Importing from folder: ${folder}`);
        this.emitLog(sessionId, 'info', `[${i + 1}/${folders.length}] Processing folder: ${folder}`);

        const result = await this.importFromExternal(accountId, imapConfig, folder, limitPerFolder, sessionId);

        results.totalImported += result.imported;
        results.totalSkipped += result.skipped;
        results.folders.push({
          name: folder,
          imported: result.imported,
          skipped: result.skipped,
          total: result.total
        });

        this.emitLog(sessionId, 'success', `✅ ${folder}: ${result.imported} imported, ${result.skipped} skipped`);
      } catch (error) {
        console.error(`❌ Failed to import from folder ${folder}:`, error.message);
        this.emitLog(sessionId, 'error', `❌ ${folder}: ${error.message}`);
        results.folders.push({
          name: folder,
          error: error.message,
          imported: 0,
          skipped: 0
        });
      }
    }

    console.log(`\n✅ Multi-folder import complete: ${results.totalImported} total imported, ${results.totalSkipped} total skipped`);
    this.emitLog(sessionId, 'success', `Import complete! Total: ${results.totalImported} imported, ${results.totalSkipped} skipped`);

    if (sessionId) {
      this.emit('import:complete', { sessionId, results });
    }

    return results;
  }

  /**
   * Emit a log event for SSE
   */
  emitLog(sessionId, level, message) {
    if (sessionId) {
      this.emit('import:log', {
        sessionId,
        type: 'log',
        level,
        message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Import emails from external IMAP server (Gmail, Yahoo, etc.)
   * @param {number} accountId - Local email account ID to import into
   * @param {Object} imapConfig - IMAP connection details
   * @param {string} imapConfig.host - IMAP server host (e.g., imap.gmail.com)
   * @param {number} imapConfig.port - IMAP port (default: 993)
   * @param {string} imapConfig.username - IMAP username/email
   * @param {string} imapConfig.password - IMAP password (App Password for Gmail)
   * @param {string} folder - Folder to import from (default: INBOX)
   * @param {number} limit - Max emails to import (default: 100)
   * @param {string} sessionId - Session ID for SSE progress updates
   */
  async importFromExternal(accountId, imapConfig, folder = 'INBOX', limit = 100, sessionId = null) {
    let connection;

    try {
      const account = await EmailAccount.findByPk(accountId);

      if (!account) {
        throw new Error('Email account not found');
      }

      console.log(`📥 Importing emails from ${imapConfig.host} to ${account.email_address}...`);
      this.emitLog(sessionId, 'info', `Connecting to ${imapConfig.host}...`);

      // Connect to external IMAP server
      const config = {
        imap: {
          user: imapConfig.username,
          password: imapConfig.password,
          host: imapConfig.host,
          port: imapConfig.port || 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: false }
        }
      };

      connection = await imaps.connect(config);
      this.emitLog(sessionId, 'info', `Connected! Opening folder: ${folder}`);
      await connection.openBox(folder);

      // Search for all emails
      const searchCriteria = ['ALL'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        markSeen: false
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      console.log(`📬 Found ${messages.length} messages in ${folder}, importing up to ${limit}...`);
      this.emitLog(sessionId, 'info', `Found ${messages.length} messages, importing up to ${limit}...`);

      let imported = 0;
      let skipped = 0;
      const totalToProcess = Math.min(messages.length, limit);

      // Import emails (newest first)
      for (let i = 0; i < messages.slice(-limit).length; i++) {
        const item = messages.slice(-limit)[i];
        let parsed = null;
        let uid = 'unknown';
        let fullContent = null;

        try {
          uid = item.attributes.uid;

          // Emit progress every 10 messages or on first/last
          if (i === 0 || i === totalToProcess - 1 || (i + 1) % 10 === 0) {
            this.emitLog(sessionId, 'info', `Processing ${i + 1}/${totalToProcess} emails...`);
          }

          // Try to find the full message body - handle different email structures
          let headerPart = item.parts.find(part => part.which === 'HEADER');
          let textPart = item.parts.find(part => part.which === 'TEXT');
          let fullPart = item.parts.find(part => part.which === '');

          let bodyContent = null;

          // Prefer full message, otherwise combine header + text
          if (fullPart && fullPart.body) {
            bodyContent = fullPart.body;
            console.log(`  📦 UID ${uid} - Using full message part`);
          } else if (headerPart && textPart && headerPart.body && textPart.body) {
            // Combine header and text parts
            const header = Buffer.isBuffer(headerPart.body) ? headerPart.body.toString('utf-8') : headerPart.body;
            const text = Buffer.isBuffer(textPart.body) ? textPart.body.toString('utf-8') : textPart.body;
            bodyContent = header + '\r\n' + text;
            console.log(`  📦 UID ${uid} - Combined HEADER + TEXT parts`);
          } else if (headerPart && headerPart.body) {
            bodyContent = headerPart.body;
            console.log(`  📦 UID ${uid} - Using HEADER part only`);
          } else if (textPart && textPart.body) {
            bodyContent = textPart.body;
            console.log(`  ⚠️  UID ${uid} - Using TEXT part only (may be missing headers)`);
          } else {
            console.warn(`  ⚠️  Skipping UID ${uid} - malformed structure (no readable body parts)`);
            skipped++;
            continue;
          }

          if (!bodyContent) {
            console.warn(`  ⚠️  Skipping UID ${uid} - empty body content`);
            skipped++;
            continue;
          }

          // Log raw content before parsing
          console.log(`     Body type: ${typeof bodyContent}`);
          console.log(`     Body is Buffer: ${Buffer.isBuffer(bodyContent)}`);
          console.log(`     Body length: ${bodyContent?.length || 0} bytes`);

          // Convert to string if it's a Buffer
          if (Buffer.isBuffer(bodyContent)) {
            bodyContent = bodyContent.toString('utf-8');
            console.log(`     Converted Buffer to string (${bodyContent.length} chars)`);
          }

          if (bodyContent) {
            const preview = bodyContent.substring(0, 500).replace(/\r?\n/g, '\\n');
            console.log(`     Preview (first 500 chars): ${preview}${bodyContent.length > 500 ? '...' : ''}`);
          }

          // Prepare full content for parsing
          const idHeader = 'Imap-Id: ' + uid + '\r\n';
          fullContent = idHeader + bodyContent;

          console.log(`     Full content length (with header): ${fullContent.length} bytes`);

          // Parse email with error handling
          try {
            parsed = await simpleParser(fullContent);
            console.log(`     ✅ Parsing successful`);
          } catch (parseError) {
            console.error(`     ❌ Parsing failed:`, parseError.message);
            await this.saveDebugEmail(uid, fullContent, 'parse-error');
            throw new Error(`Failed to parse email: ${parseError.message}`);
          }

          console.log(`  📧 Processing: "${parsed.subject || '(no subject)'}" from ${parsed.from?.text || '(unknown)'}`);
          console.log(`     📋 Message-ID: ${parsed.messageId || '(missing)'}`);
          console.log(`     📅 Date: ${parsed.date || '(no date)'}`);
          console.log(`     📝 Headers:`, {
            to: parsed.to?.text || '(none)',
            cc: parsed.cc?.text || '(none)',
            hasText: !!parsed.text,
            hasHtml: !!parsed.html,
            textLength: parsed.text?.length || 0,
            htmlLength: parsed.html?.length || 0
          });

          // Generate message_id if missing (some emails don't have one)
          const messageId = parsed.messageId || `imported-${Date.now()}-${uid}@${imapConfig.host}`;

          if (!parsed.messageId) {
            console.log(`     ⚠️  No Message-ID header, generated: ${messageId}`);
            await this.saveDebugEmail(uid, fullContent, 'no-message-id');
          }

          // Check if message already exists
          const existing = await Message.findOne({
            where: {
              account_id: accountId,
              message_id: messageId
            }
          });

          if (existing) {
            console.log(`     ⏭️  Already exists, skipping`);
            skipped++;
            continue;
          }

          // Import message
          await Message.create({
            account_id: accountId,
            message_id: messageId,
            from_address: parsed.from?.text || '',
            to_addresses: parsed.to?.text || '',
            cc_addresses: parsed.cc?.text || '',
            subject: parsed.subject || '(no subject)',
            body_text: parsed.text || '',
            body_html: parsed.html || '',
            received_date: parsed.date || new Date(),
            folder: 'INBOX',
            is_read: false,
            is_starred: false
          });

          const textPreview = (parsed.text || parsed.html || '').substring(0, 100).replace(/\n/g, ' ');
          console.log(`     ✅ Imported! Preview: ${textPreview}${textPreview.length >= 100 ? '...' : ''}`);
          imported++;

          if (imported % 10 === 0) {
            console.log(`  📊 Progress: ${imported} imported so far...`);
          }
        } catch (emailError) {
          console.error(`  ⚠️  Failed to import message UID ${uid}:`, emailError.message);
          console.error(`     Error type: ${emailError.name}`);
          console.error(`     Stack trace:`, emailError.stack?.split('\n').slice(0, 3).join('\n     '));

          // Save raw content for debugging
          if (fullContent) {
            await this.saveDebugEmail(uid, fullContent, `error-${emailError.name}`);
          }

          // Log parsed data if available
          if (parsed) {
            console.error(`     📋 Parsed content:`, {
              messageId: parsed.messageId || '(missing)',
              subject: parsed.subject || '(no subject)',
              from: parsed.from?.text || '(unknown)',
              to: parsed.to?.text || '(none)',
              date: parsed.date || '(no date)',
              hasText: !!parsed.text,
              hasHtml: !!parsed.html
            });
          }

          skipped++;
        }
      }

      connection.end();

      console.log(`✅ Import complete: ${imported} imported, ${skipped} skipped`);

      return {
        imported,
        skipped,
        total: messages.length
      };
    } catch (error) {
      if (connection) connection.end();
      console.error('❌ Error importing emails:', error);
      throw error;
    }
  }
}

module.exports = new ReceiverService();
