const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const { Message, EmailAccount } = require('../models');
const fs = require('fs');
const path = require('path');

class SMTPListenerService {
    constructor() {
        this.servers = [];

        // Load TLS certificates if available
        this.tlsOptions = this.loadTLSCertificates();
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
                console.log('🔐 Loading TLS certificates for SMTP');
                return {
                    key: fs.readFileSync(keyFile),
                    cert: fs.readFileSync(certFile)
                };
            } else {
                console.warn('⚠️  TLS certificates not found - SMTP will run without encryption');
                return null;
            }
        } catch (error) {
            console.error('❌ Error loading TLS certificates:', error.message);
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
                console.log(`📨 SMTP connection from ${session.remoteAddress} on port ${port}`);
                return callback();
            },

            // Handle incoming emails
            onData: async (stream, session, callback) => {
                try {
                    // Parse email
                    const parsed = await simpleParser(stream);

                    console.log('📧 Received email:');
                    console.log('  From:', parsed.from?.text);
                    console.log('  To:', parsed.to?.text);
                    console.log('  Subject:', parsed.subject);

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

                            console.log(`  ✅ Stored in account: ${emailAddress}`);
                        } else {
                            console.log(`  ⚠️  No account found for: ${emailAddress}`);
                        }
                    }

                    callback();
                } catch (error) {
                    console.error('❌ Error processing email:', error);
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
            console.log(`✅ SMTP server listening on port ${port} ${tlsStatus}`);
        });

        this.server.on('error', (error) => {
            console.error(`❌ SMTP server error on port ${port}:`, error.message);
        });

        this.servers.push(this.server);
        return this.server;
    }

    /**
     * Start SMTP servers on multiple ports
     * @param {number[]} ports - Array of ports to listen on
     */
    startMultiple(ports = [25, 587, 465, 2525]) {
        console.log(`🚀 Starting SMTP servers on ports: ${ports.join(', ')}`);
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
                console.log('SMTP server stopped');
            });
        }
        this.servers = [];
    }
}

module.exports = new SMTPListenerService();
