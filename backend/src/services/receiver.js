const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const { EmailAccount, Message } = require('../models');

class ReceiverService {
  /**
   * Fetch emails from an IMAP account
   * @param {number} accountId - Email account ID
   * @param {string} folder - Email folder (default: INBOX)
   * @param {number} limit - Number of emails to fetch
   */
  async fetchEmails(accountId, folder = 'INBOX', limit = 50) {
    let connection;
    
    try {
      const account = await EmailAccount.findByPk(accountId);
      
      if (!account) {
        throw new Error('Email account not found');
      }

      const config = {
        imap: {
          user: account.imap_username,
          password: account.getDecryptedImapPassword(),
          host: account.imap_host,
          port: account.imap_port,
          tls: true,
          tlsOptions: { rejectUnauthorized: false }
        }
      };

      connection = await imaps.connect(config);
      await connection.openBox(folder);

      // Search for all emails
      const searchCriteria = ['ALL'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
        markSeen: false
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      const parsedMessages = [];

      for (const item of messages.slice(-limit)) {
        const all = item.parts.find(part => part.which === '');
        const id = item.attributes.uid;
        const idHeader = 'Imap-Id: ' + id + '\r\n';
        
        const parsed = await simpleParser(idHeader + all.body);
        
        parsedMessages.push({
          uid: id,
          messageId: parsed.messageId,
          from: parsed.from?.text,
          to: parsed.to?.text,
          cc: parsed.cc?.text,
          subject: parsed.subject,
          date: parsed.date,
          text: parsed.text,
          html: parsed.html,
          attachments: parsed.attachments?.map(a => ({
            filename: a.filename,
            contentType: a.contentType,
            size: a.size
          }))
        });
      }

      connection.end();
      return parsedMessages;
    } catch (error) {
      if (connection) connection.end();
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  /**
   * Sync emails from IMAP to database
   * @param {number} accountId - Email account ID
   */
  async syncEmails(accountId) {
    try {
      const emails = await this.fetchEmails(accountId);
      
      for (const email of emails) {
        await Message.upsert({
          account_id: accountId,
          message_id: email.messageId,
          from_address: email.from,
          to_addresses: email.to,
          cc_addresses: email.cc,
          subject: email.subject,
          body_text: email.text,
          body_html: email.html,
          received_date: email.date,
          folder: 'INBOX'
        });
      }

      return { synced: emails.length };
    } catch (error) {
      console.error('Error syncing emails:', error);
      throw error;
    }
  }
}

module.exports = new ReceiverService();
