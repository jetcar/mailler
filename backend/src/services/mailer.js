const nodemailer = require('nodemailer');
const { EmailAccount } = require('../models');

class MailerService {
  /**
   * Send an email using the specified account
   * @param {number} accountId - Email account ID
   * @param {Object} mailOptions - Email options (to, subject, text, html, attachments)
   */
  async sendEmail(accountId, mailOptions) {
    try {
      const account = await EmailAccount.findByPk(accountId);
      
      if (!account) {
        throw new Error('Email account not found');
      }

      // Create transporter with account settings
      const transporter = nodemailer.createTransport({
        host: account.smtp_host,
        port: account.smtp_port,
        secure: account.smtp_port === 465,
        auth: {
          user: account.smtp_username,
          pass: account.getDecryptedSmtpPassword()
        }
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

      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

module.exports = new MailerService();
