const { EmailAccount, Message } = require('../models');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const { logger } = require('../middleware/errorHandler');

const allowInsecureImapTls = process.env.ALLOW_INSECURE_IMAP_TLS === 'true';

class ReceiverService extends EventEmitter {
  constructor() {
    super();
    this.activeImports = new Map(); // Track active imports by sessionId
  }

  /**
   * Stop an active import
   */
  stopImport(sessionId) {
    if (this.activeImports.has(sessionId)) {
      this.activeImports.set(sessionId, true); // Set cancellation flag
      logger.info('Import stop requested', { sessionId });
      this.emitLog(sessionId, 'warning', 'Stop requested, finishing current batch...');
      return true;
    }
    return false;
  }

  /**
   * Check if import should be cancelled
   */
  shouldStopImport(sessionId) {
    return this.activeImports.get(sessionId) === true;
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
      logger.debug('Saved debug email', { filename, uid, reason });
      return filepath;
    } catch (err) {
      logger.error('Failed to save debug email', { error: err.message, uid, reason });
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
      logger.error('Error fetching emails', { error: error.message, accountId, folder });
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

      logger.info('SMTP-backed account sync checked', {
        accountId,
        emailAddress: account.email_address,
        totalMessages: count
      });

      return {
        synced: 0,
        total: count,
        message: 'Emails are received automatically via SMTP server'
      };
    } catch (error) {
      logger.error('Error syncing emails', { error: error.message, accountId });
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
      logger.info('Fetching folders from IMAP server', { host: imapConfig.host });

      const config = {
        imap: {
          user: imapConfig.username,
          password: imapConfig.password,
          host: imapConfig.host,
          port: imapConfig.port || 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: !allowInsecureImapTls }
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
      logger.info('Fetched IMAP folders', { host: imapConfig.host, folderCount: folders.length });

      return folders;
    } catch (error) {
      if (connection) connection.end();
      logger.error('Error fetching folders', { error: error.message, host: imapConfig.host });
      throw error;
    }
  }

  /**
   * Import emails from multiple folders
   * @param {number} accountId - Local email account ID
   * @param {Object} imapConfig - IMAP connection details
   * @param {Array<string>} folders - Array of folder names to import from
   * @param {number} batchSize - Number of emails to process per batch (default: 10)
   */
  async importFromMultipleFolders(accountId, imapConfig, folders, batchSize = 10, sessionId = null) {
    // Register this import session
    if (sessionId) {
      this.activeImports.set(sessionId, false); // false = not cancelled
    }

    const results = {
      totalImported: 0,
      totalSkipped: 0,
      folders: [],
      cancelled: false
    };

    logger.info('Starting multi-folder import', { folderCount: folders.length, batchSize, sessionId });
    this.emitLog(sessionId, 'info', `Starting import from ${folders.length} folders (processing in batches of ${batchSize})`);

    try {
      for (let i = 0; i < folders.length; i++) {
        // Check for cancellation
        if (this.shouldStopImport(sessionId)) {
          logger.warn('Import cancelled by user', { sessionId });
          this.emitLog(sessionId, 'warning', '🛑 Import stopped by user');
          results.cancelled = true;
          break;
        }

        const folder = folders[i];
        try {
          logger.info('Importing folder', { folder, index: i + 1, totalFolders: folders.length, sessionId });
          this.emitLog(sessionId, 'info', `[${i + 1}/${folders.length}] Processing folder: ${folder}`);

          const result = await this.importFromExternal(accountId, imapConfig, folder, batchSize, sessionId);

          // Check if import was cancelled during folder processing
          if (result.cancelled) {
            results.cancelled = true;
            results.totalImported += result.imported;
            results.totalSkipped += result.skipped;
            results.folders.push({
              name: folder,
              imported: result.imported,
              skipped: result.skipped,
              total: result.total,
              cancelled: true
            });
            break;
          }

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
          logger.error('Failed to import folder', { folder, error: error.message, sessionId });
          this.emitLog(sessionId, 'error', `❌ ${folder}: ${error.message}`);
          results.folders.push({
            name: folder,
            error: error.message,
            imported: 0,
            skipped: 0
          });
        }
      }

      if (!results.cancelled) {
        logger.info('Multi-folder import complete', {
          sessionId,
          totalImported: results.totalImported,
          totalSkipped: results.totalSkipped
        });
        this.emitLog(sessionId, 'success', `Import complete! Total: ${results.totalImported} imported, ${results.totalSkipped} skipped`);
      } else {
        logger.warn('Multi-folder import stopped', {
          sessionId,
          totalImported: results.totalImported,
          totalSkipped: results.totalSkipped
        });
        this.emitLog(sessionId, 'warning', `Import stopped. Processed: ${results.totalImported} imported, ${results.totalSkipped} skipped`);
      }

      if (sessionId) {
        this.emit('import:complete', { sessionId, results });
      }

      return results;
    } finally {
      // Clean up session tracking
      if (sessionId) {
        this.activeImports.delete(sessionId);
      }
    }
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
  async importFromExternal(accountId, imapConfig, folder = 'INBOX', batchSize = 10, sessionId = null) {
    let connection;
    let progressInterval;

    try {
      const account = await EmailAccount.findByPk(accountId);

      if (!account) {
        throw new Error('Email account not found');
      }

      logger.info('Importing emails from external IMAP', {
        host: imapConfig.host,
        accountId,
        emailAddress: account.email_address,
        folder,
        sessionId
      });
      this.emitLog(sessionId, 'info', `Connecting to ${imapConfig.host}...`);

      // Connect to external IMAP server
      const config = {
        imap: {
          user: imapConfig.username,
          password: imapConfig.password,
          host: imapConfig.host,
          port: imapConfig.port || 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: !allowInsecureImapTls },
          authTimeout: 30000,
          connTimeout: 60000,
          keepalive: {
            interval: 10000,
            idleInterval: 300000,
            forceNoop: true
          }
        }
      };

      logger.debug('Connecting to IMAP server', { host: imapConfig.host, folder, sessionId });
      connection = await imaps.connect(config);
      logger.info('Connected to IMAP server', { host: imapConfig.host, sessionId });
      this.emitLog(sessionId, 'info', `Connected! Opening folder: ${folder}`);

      logger.debug('Opening IMAP folder', { host: imapConfig.host, folder, sessionId });
      await connection.openBox(folder);
      logger.info('IMAP folder opened', { folder, sessionId });

      // Search for all emails
      logger.info('Searching IMAP message UIDs', { folder, sessionId });
      this.emitLog(sessionId, 'info', `Searching for emails in ${folder}...`);

      const searchCriteria = ['ALL'];

      logger.debug('Fetching message UIDs', { folder, sessionId });
      const startTime = Date.now();

      // Add a progress indicator for long searches
      progressInterval = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        logger.debug('Still searching for message UIDs', { folder, elapsedSeconds: elapsed, sessionId });
        this.emitLog(sessionId, 'info', `Still searching for message UIDs... (${elapsed}s elapsed)`);
      }, 10000); // Log every 10 seconds

      // First, just get the UIDs without downloading bodies
      const searchResults = await connection.search(searchCriteria, { bodies: [] });
      clearInterval(progressInterval);
      progressInterval = null;
      const searchDuration = ((Date.now() - startTime) / 1000).toFixed(1);

      logger.info('Found message UIDs', {
        folder,
        totalMessages: searchResults.length,
        durationSeconds: searchDuration,
        sessionId
      });
      this.emitLog(sessionId, 'info', `Found ${searchResults.length} messages, will download and process in batches of ${batchSize}...`);

      let imported = 0;
      let skipped = 0;
      const totalToProcess = searchResults.length;
      const totalBatches = Math.ceil(searchResults.length / batchSize);

      // Process emails in batches - fetch bodies only for current batch
      for (let batchStart = 0; batchStart < searchResults.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, searchResults.length);
        const batchNum = Math.floor(batchStart / batchSize) + 1;

        // Get UIDs for current batch
        const batchUids = searchResults.slice(batchStart, batchEnd).map(msg => msg.attributes.uid);

        logger.info('Downloading import batch', {
          batch: batchNum,
          totalBatches,
          messageCount: batchUids.length,
          firstUid: batchUids[0],
          lastUid: batchUids[batchUids.length - 1],
          folder,
          sessionId
        });
        this.emitLog(sessionId, 'info', `📥 Batch ${batchNum}/${totalBatches}: Downloading ${batchUids.length} messages...`);

        const batchStartTime = Date.now();

        // Fetch bodies only for this batch using UID search
        const fetchOptions = {
          bodies: ['HEADER', 'TEXT', ''],
          markSeen: false
        };

        // Use UID search criteria to fetch specific messages
        const uidCriteria = [['UID', batchUids.join(',')]];
        const batch = await connection.search(uidCriteria, fetchOptions);
        const downloadDuration = ((Date.now() - batchStartTime) / 1000).toFixed(1);

        logger.info('Downloaded import batch', {
          batch: batchNum,
          totalBatches,
          downloadedMessages: batch.length,
          durationSeconds: downloadDuration,
          folder,
          sessionId
        });
        this.emitLog(sessionId, 'info', `✅ Downloaded ${batch.length} messages in ${downloadDuration}s, processing...`);

        for (let i = 0; i < batch.length; i++) {
          const item = batch[i];
          const globalIndex = batchStart + i;
          let parsed = null;
          let uid = 'unknown';
          let fullContent = null;

          try {
            uid = item.attributes.uid;

            // Emit progress for first and last message in batch
            if (i === 0 || i === batch.length - 1) {
              this.emitLog(sessionId, 'info', `  Processing ${globalIndex + 1}/${totalToProcess} (${imported} imported, ${skipped} skipped)`);
            }

            // Try to find the full message body - handle different email structures
            let headerPart = item.parts.find(part => part.which === 'HEADER');
            let textPart = item.parts.find(part => part.which === 'TEXT');
            let fullPart = item.parts.find(part => part.which === '');

            logger.debug('Available message parts', { uid, parts: item.parts.map(p => p.which), folder, sessionId });

            let bodyContent = null;

            // Prefer full message, otherwise combine header + text
            if (fullPart && fullPart.body) {
              bodyContent = fullPart.body;
              logger.debug('Using full message part', { uid, folder, sessionId });
            } else if (headerPart && textPart && headerPart.body && textPart.body) {
              // Combine header and text parts
              const header = Buffer.isBuffer(headerPart.body) ? headerPart.body.toString('utf-8') : headerPart.body;
              const text = Buffer.isBuffer(textPart.body) ? textPart.body.toString('utf-8') : textPart.body;
              bodyContent = header + '\r\n' + text;
              logger.debug('Combined header and text parts', { uid, folder, sessionId });
            } else if (headerPart && headerPart.body) {
              bodyContent = headerPart.body;
              logger.debug('Using header-only message part', { uid, folder, sessionId });
            } else if (textPart && textPart.body) {
              bodyContent = textPart.body;
              logger.warn('Using text-only message part; headers may be missing', { uid, folder, sessionId });
            } else {
              logger.warn('Skipping malformed message with no readable body parts', { uid, folder, sessionId });
              skipped++;
              continue;
            }

            if (!bodyContent) {
              logger.warn('Skipping message with empty body content', { uid, folder, sessionId });
              skipped++;
              continue;
            }

            // Log raw content before parsing
            logger.debug('Prepared message body', {
              uid,
              bodyType: typeof bodyContent,
              isBuffer: Buffer.isBuffer(bodyContent),
              bodyLength: bodyContent?.length || 0,
              folder,
              sessionId
            });

            // Convert to string if it's a Buffer
            if (Buffer.isBuffer(bodyContent)) {
              bodyContent = bodyContent.toString('utf-8');
              logger.debug('Converted buffer body to string', { uid, length: bodyContent.length, folder, sessionId });
            }

            if (bodyContent) {
              const preview = bodyContent.substring(0, 500).replace(/\r?\n/g, '\\n');
              logger.debug('Message preview prepared', { uid, preview: `${preview}${bodyContent.length > 500 ? '...' : ''}`, folder, sessionId });

              // Check if Subject header is present
              const subjectMatch = bodyContent.match(/^Subject:\s*(.*)$/mi);
              if (subjectMatch) {
                logger.debug('Subject found in raw content', { uid, subject: subjectMatch[1], folder, sessionId });
              } else {
                logger.warn('No Subject header found in raw content', { uid, folder, sessionId });
              }
            }

            // Prepare full content for parsing (don't add extra header if it's already a full message)
            if (fullPart && fullPart.body) {
              // Already a full message with headers
              fullContent = bodyContent;
            } else {
              // Add UID as custom header
              const idHeader = 'Imap-Id: ' + uid + '\r\n';
              fullContent = idHeader + bodyContent;
            }

            logger.debug('Prepared full message content', { uid, contentLength: fullContent.length, folder, sessionId });

            // Parse email with error handling
            try {
              parsed = await simpleParser(fullContent);
              logger.debug('Email parsing successful', { uid, folder, sessionId });
            } catch (parseError) {
              logger.error('Email parsing failed', { uid, error: parseError.message, folder, sessionId });
              await this.saveDebugEmail(uid, fullContent, 'parse-error');
              throw new Error(`Failed to parse email: ${parseError.message}`);
            }

            logger.debug('Parsed email metadata', {
              uid,
              subject: parsed.subject || '(no subject)',
              from: parsed.from?.text || '(unknown)',
              messageId: parsed.messageId || '(missing)',
              date: parsed.date || '(no date)',
              to: parsed.to?.text || '(none)',
              cc: parsed.cc?.text || '(none)',
              hasText: !!parsed.text,
              hasHtml: !!parsed.html,
              textLength: parsed.text?.length || 0,
              htmlLength: parsed.html?.length || 0,
              folder,
              sessionId
            });

            // Generate message_id if missing (some emails don't have one)
            const messageId = parsed.messageId || `imported-${Date.now()}-${uid}@${imapConfig.host}`;

            if (!parsed.messageId) {
              logger.warn('Message imported without Message-ID; generated fallback', { uid, messageId, folder, sessionId });
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
              logger.debug('Message already exists, skipping', { uid, messageId, folder, sessionId });
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
              folder: folder, // Use the actual folder being imported
              is_read: false,
              is_starred: false
            });

            const textPreview = (parsed.text || parsed.html || '').substring(0, 100).replace(/\n/g, ' ');
            logger.debug('Message imported', { uid, preview: `${textPreview}${textPreview.length >= 100 ? '...' : ''}`, folder, sessionId });
            imported++;
          } catch (emailError) {
            logger.error('Failed to import message', {
              uid,
              error: emailError.message,
              errorType: emailError.name,
              stack: emailError.stack?.split('\n').slice(0, 3).join('\n'),
              folder,
              sessionId
            });

            // Save raw content for debugging
            if (fullContent) {
              await this.saveDebugEmail(uid, fullContent, `error-${emailError.name}`);
            }

            // Log parsed data if available
            if (parsed) {
              logger.debug('Parsed content available after import failure', {
                messageId: parsed.messageId || '(missing)',
                subject: parsed.subject || '(no subject)',
                from: parsed.from?.text || '(unknown)',
                to: parsed.to?.text || '(none)',
                date: parsed.date || '(no date)',
                hasText: !!parsed.text,
                hasHtml: !!parsed.html,
                uid,
                folder,
                sessionId
              });
            }

            skipped++;
          }
        }

        // Emit batch completion
        this.emitLog(sessionId, 'info', `  ✅ Batch ${batchNum}/${totalBatches} complete: ${imported} total imported, ${skipped} total skipped`);

        // Check for cancellation after each batch
        if (this.shouldStopImport(sessionId)) {
          logger.warn('Import cancelled after batch', { batch: batchNum, totalBatches, folder, sessionId });
          this.emitLog(sessionId, 'warning', `🛑 Import stopped after batch ${batchNum}/${totalBatches}`);
          connection.end();
          return {
            imported,
            skipped,
            total: searchResults.length,
            cancelled: true
          };
        }
      }

      connection.end();

      logger.info('Folder import complete', { folder, imported, skipped, total: searchResults.length, sessionId });

      return {
        imported,
        skipped,
        total: searchResults.length,
        cancelled: false
      };
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      if (connection) connection.end();
      logger.error('Error importing emails', { error: error.message, folder, sessionId, host: imapConfig.host });
      this.emitLog(sessionId, 'error', `Import error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ReceiverService();
