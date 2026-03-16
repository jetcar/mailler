const nodemailer = require('nodemailer');
const { EmailAccount, Message } = require('../models');

class MailerService {
  /**
   * Send an email from a local account
   * @param {number} accountId - Email account ID
   * @param {Object} mailOptions - Email options (to, subject, text, html, attachments)
   */
  async sendEmail(accountId, mailOptions) {
    try {
      const account = await EmailAccount.findByPk(accountId);

      if (!account) {
        throw new Error('Email account not found');
      }

      // Create transporter using local SMTP server (no auth required for local server)
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: process.env.SMTP_SEND_PORT || 587,
        secure: false,
        ignoreTLS: true, // For local server, we don't need TLS
        auth: undefined // No authentication for local server
      });

      // Send email
      const info = await transporter.sendMail({
        from: account.email_address,
        to: mailOptions.to,
        cc: mailOptions.cc,
        bcc: mailOptions.bcc,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
        attachments: mailOptions.attachments
      });

      console.log('📤 Email sent from', account.email_address, 'to', mailOptions.to);
      console.log('   Message ID:', info.messageId);

      // Store sent message in database
      await Message.create({
        account_id: accountId,
        message_id: info.messageId,
        from_address: account.email_address,
        to_addresses: mailOptions.to,
        cc_addresses: mailOptions.cc || '',
        subject: mailOptions.subject || '(no subject)',
        body_text: mailOptions.text || '',
        body_html: mailOptions.html || '',
        received_date: new Date(),
        folder: 'SENT',
        is_read: true,
        is_starred: false
      });

      return info;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  }
}

module.exports = new MailerService();
