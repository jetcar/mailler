const { EmailAccount, Message } = require('../models');

class ReceiverService {
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
}

module.exports = new ReceiverService();
