const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const { Message, EmailAccount } = require('../models');
const fs = require('fs');
const path = require('path');
const { logger } = require('../middleware/errorHandler');

class SMTPListenerService {
    constructor() {
        this.servers = [];
        this.tlsOptions = null;
    }

    /**
     * Load TLS certificates for SMTP over SSL/TLS
     */
    loadTLSCertificates() {
        try {
            const certPath = process.env.SMTP_CERT_PATH || '/certs';
            const keyFile = path.join(certPath, 'localhost.key');
            const certFile = path.join(certPath, 'localhost.crt');

            if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
                logger.info('Loading TLS certificates for SMTP', { certPath });
                return {
                    key: fs.readFileSync(keyFile),
                    cert: fs.readFileSync(certFile)
                };
            } else {
                logger.warn('TLS certificates not found; SMTP will run without encryption', { certPath });
                return null;
            }
        } catch (error) {
            logger.error('Error loading SMTP TLS certificates', { error: error.message });
            return null;
        }
    }

    /**
     * Start SMTP server to receive incoming emails
     * @param {number} port - Port to listen on (default: 2525)
     */
    start(port = 2525) {
        const isImplicitTLS = port === 465; // Port 465 uses implicit TLS
        const isSubmissionPort = port === 587; // Port 587 requires STARTTLS

        if (this.tlsOptions === null) {
            this.tlsOptions = this.loadTLSCertificates();
        }

        const serverOptions = {
            // Disable authentication for local testing
            authOptional: true,

            // Allow any recipient
            disabledCommands: ['AUTH'],

            // Banner displayed on connection
            banner: 'Mailler SMTP Server',

            // TLS configuration
            ...(this.tlsOptions && {
                secure: isImplicitTLS, // Port 465 starts with TLS
                ...(!isImplicitTLS && { // Ports 25, 587 use STARTTLS
                    disabledCommands: isSubmissionPort ? ['AUTH'] : ['AUTH'],
                }),
                ...this.tlsOptions
            }),

            // Handle incoming connections
            onConnect(session, callback) {
                logger.debug('SMTP connection opened', { remoteAddress: session.remoteAddress, port });
                return callback();
            },

            // Handle incoming emails
            onData: async (stream, session, callback) => {
                try {
                    // Parse email
                    const parsed = await simpleParser(stream);

                    logger.info('SMTP email received', {
                        from: parsed.from?.text,
                        to: parsed.to?.text,
                        subject: parsed.subject,
                        port
                    });

                    // Extract recipient email addresses
                    const recipients = parsed.to?.value || [];

                    // For each recipient, find their email account and store message
                    for (const recipient of recipients) {
                        const emailAddress = recipient.address;

                        // Find email account by address
                        const account = await EmailAccount.findOne({
                            where: { email_address: emailAddress }
                        });

                        if (account) {
                            // Store message in database
                            await Message.create({
                                account_id: account.id,
                                message_id: parsed.messageId,
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

                            logger.info('Stored received email', { emailAddress, accountId: account.id, port });
                        } else {
                            logger.warn('No local account found for SMTP recipient', { emailAddress, port });
                        }
                    }

                    callback();
                } catch (error) {
                    logger.error('Error processing received email', { error: error.message, port });
                    callback(error);
                }
            }
        };

        this.server = new SMTPServer(serverOptions);

        this.server.listen(port, () => {
            let tlsStatus;
            if (isImplicitTLS) {
                tlsStatus = '(implicit TLS - always encrypted)';
            } else if (this.tlsOptions) {
                tlsStatus = port === 25
                    ? '(plaintext OK, STARTTLS optional)'
                    : '(plaintext OK, STARTTLS available)';
            } else {
                tlsStatus = '(no encryption)';
            }
            logger.info('SMTP server listening', { port, tlsStatus });
        });

        this.server.on('error', (error) => {
            logger.error('SMTP server error', { port, error: error.message });
        });

        this.servers.push(this.server);
        return this.server;
    }

    /**
     * Start SMTP servers on multiple ports
     * @param {number[]} ports - Array of ports to listen on
     */
    startMultiple(ports = [25, 587, 465, 2525]) {
        logger.info('Starting SMTP servers', { ports });
        for (const port of ports) {
            this.start(port);
        }
    }

    /**
     * Stop all SMTP servers
     */
    stop() {
        for (const server of this.servers) {
            server.close(() => {
                logger.info('SMTP server stopped');
            });
        }
        this.servers = [];
    }
}

module.exports = new SMTPListenerService();
