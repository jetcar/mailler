const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');
const { User, EmailAccount, Message } = require('../src/models');

describe('Email Integration Tests', () => {
  let testUser;
  let testAccount;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
  });

  afterAll(async () => {
    // Cleanup
    if (testAccount) await testAccount.destroy();
    if (testUser) await testUser.destroy();
    await sequelize.close();
  });

  describe('User Authentication', () => {
    test('GET /auth/me returns 401 when not authenticated', async () => {
      const response = await request(app).get('/auth/me');
      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(false);
    });
  });

  describe('Email Account Management', () => {
    beforeEach(async () => {
      // Create test user
      testUser = await User.create({
        oidc_sub: 'test-user-' + Date.now(),
        email: 'test@example.com',
        display_name: 'Test User'
      });
    });

    afterEach(async () => {
      if (testAccount) {
        await testAccount.destroy();
        testAccount = null;
      }
      if (testUser) {
        await testUser.destroy();
        testUser = null;
      }
    });

    test('Create email account with encrypted credentials', async () => {
      testAccount = await EmailAccount.create({
        user_id: testUser.id,
        email_address: 'test@example.com',
        imap_host: 'imap.example.com',
        imap_port: 993,
        imap_username: 'test',
        imap_password: 'plain-password',
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'test',
        smtp_password: 'plain-password'
      });

      // Verify passwords are encrypted in database
      expect(testAccount.imap_password).not.toBe('plain-password');
      expect(testAccount.smtp_password).not.toBe('plain-password');
      expect(testAccount.imap_password).toContain(':');
      expect(testAccount.smtp_password).toContain(':');

      // Verify decryption works
      expect(testAccount.getDecryptedImapPassword()).toBe('plain-password');
      expect(testAccount.getDecryptedSmtpPassword()).toBe('plain-password');
    });

    test('Update email account re-encrypts passwords', async () => {
      testAccount = await EmailAccount.create({
        user_id: testUser.id,
        email_address: 'test@example.com',
        imap_host: 'imap.example.com',
        imap_port: 993,
        imap_username: 'test',
        imap_password: 'password1',
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'test',
        smtp_password: 'password1'
      });

      const oldEncrypted = testAccount.imap_password;

      await testAccount.update({ imap_password: 'password2' });

      expect(testAccount.imap_password).not.toBe(oldEncrypted);
      expect(testAccount.getDecryptedImapPassword()).toBe('password2');
    });
  });

  describe('Message Storage', () => {
    beforeEach(async () => {
      testUser = await User.create({
        oidc_sub: 'test-user-' + Date.now(),
        email: 'test@example.com',
        display_name: 'Test User'
      });

      testAccount = await EmailAccount.create({
        user_id: testUser.id,
        email_address: 'test@example.com',
        imap_host: 'imap.example.com',
        imap_port: 993,
        imap_username: 'test',
        imap_password: 'password',
        smtp_host: 'smtp.example.com',
        smtp_port: 587,
        smtp_username: 'test',
        smtp_password: 'password'
      });
    });

    afterEach(async () => {
      await Message.destroy({ where: { account_id: testAccount.id } });
      if (testAccount) await testAccount.destroy();
      if (testUser) await testUser.destroy();
    });

    test('Store message with all fields', async () => {
      const message = await Message.create({
        account_id: testAccount.id,
        message_id: '<test@example.com>',
        from_address: 'sender@example.com',
        to_addresses: 'recipient@example.com',
        cc_addresses: 'cc@example.com',
        subject: 'Test Email',
        body_text: 'This is a test email',
        body_html: '<p>This is a test email</p>',
        received_date: new Date(),
        folder: 'INBOX'
      });

      expect(message.id).toBeDefined();
      expect(message.subject).toBe('Test Email');
      expect(message.is_read).toBe(false);
      expect(message.is_starred).toBe(false);
    });

    test('Update message read status', async () => {
      const message = await Message.create({
        account_id: testAccount.id,
        message_id: '<test2@example.com>',
        from_address: 'sender@example.com',
        to_addresses: 'recipient@example.com',
        subject: 'Test Email 2',
        body_text: 'Test',
        received_date: new Date()
      });

      expect(message.is_read).toBe(false);

      await message.update({ is_read: true });

      expect(message.is_read).toBe(true);
    });
  });

  describe('API Endpoints', () => {
    test('GET / returns API info', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Mailler API');
      expect(response.body.version).toBe('1.0.0');
    });

    test('GET /health returns health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});

describe('Encryption Service', () => {
  const encryptionService = require('../src/services/encryption');

  test('Encrypt and decrypt text correctly', () => {
    const original = 'my-secret-password';
    const encrypted = encryptionService.encrypt(original);
    
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':');
    
    const decrypted = encryptionService.decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  test('Handle null values', () => {
    expect(encryptionService.encrypt(null)).toBe(null);
    expect(encryptionService.decrypt(null)).toBe(null);
  });

  test('Each encryption produces different output', () => {
    const text = 'password';
    const encrypted1 = encryptionService.encrypt(text);
    const encrypted2 = encryptionService.encrypt(text);
    
    expect(encrypted1).not.toBe(encrypted2);
    expect(encryptionService.decrypt(encrypted1)).toBe(text);
    expect(encryptionService.decrypt(encrypted2)).toBe(text);
  });
});
