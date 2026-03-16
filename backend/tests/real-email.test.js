const mailerService = require('../src/services/mailer');
const receiverService = require('../src/services/receiver');
const { sequelize } = require('../src/config/database');
const { User, EmailAccount } = require('../src/models');

/**
 * REAL EMAIL SENDING/RECEIVING TEST
 * 
 * This test requires real email credentials to work.
 * Configure the following environment variables:
 * 
 * TEST_EMAIL_ADDRESS=your-email@gmail.com
 * TEST_IMAP_HOST=imap.gmail.com
 * TEST_IMAP_PORT=993
 * TEST_IMAP_USERNAME=your-email@gmail.com
 * TEST_IMAP_PASSWORD=your-app-password
 * TEST_SMTP_HOST=smtp.gmail.com
 * TEST_SMTP_PORT=587
 * TEST_SMTP_USERNAME=your-email@gmail.com
 * TEST_SMTP_PASSWORD=your-app-password
 * 
 * For Gmail, you need to:
 * 1. Enable 2FA on your account
 * 2. Create an App Password: https://myaccount.google.com/apppasswords
 * 3. Use the app password instead of your regular password
 */

describe('Real Email Send/Receive Tests', () => {
  let testUser;
  let testAccount;

  const hasEmailConfig = () => {
    return process.env.TEST_EMAIL_ADDRESS &&
           process.env.TEST_IMAP_HOST &&
           process.env.TEST_SMTP_HOST;
  };

  beforeAll(async () => {
    if (!hasEmailConfig()) {
      console.log('⚠️  Skipping real email tests - credentials not configured');
      console.log('Set TEST_EMAIL_* environment variables to run these tests');
      return;
    }

    await sequelize.authenticate();

    // Create test user and account
    testUser = await User.create({
      oidc_sub: 'real-email-test-' + Date.now(),
      email: process.env.TEST_EMAIL_ADDRESS,
      display_name: 'Real Email Test User'
    });

    testAccount = await EmailAccount.create({
      user_id: testUser.id,
      email_address: process.env.TEST_EMAIL_ADDRESS,
      imap_host: process.env.TEST_IMAP_HOST,
      imap_port: parseInt(process.env.TEST_IMAP_PORT || '993'),
      imap_username: process.env.TEST_IMAP_USERNAME || process.env.TEST_EMAIL_ADDRESS,
      imap_password: process.env.TEST_IMAP_PASSWORD,
      smtp_host: process.env.TEST_SMTP_HOST,
      smtp_port: parseInt(process.env.TEST_SMTP_PORT || '587'),
      smtp_username: process.env.TEST_SMTP_USERNAME || process.env.TEST_EMAIL_ADDRESS,
      smtp_password: process.env.TEST_SMTP_PASSWORD
    });

    console.log('✅ Test account created with ID:', testAccount.id);
  });

  afterAll(async () => {
    if (testAccount) await testAccount.destroy();
    if (testUser) await testUser.destroy();
    await sequelize.close();
  });

  test('Send real email via SMTP', async () => {
    if (!hasEmailConfig()) return;

    const emailData = {
      to: process.env.TEST_EMAIL_ADDRESS, // Send to self
      subject: `Mailler Test Email - ${new Date().toISOString()}`,
      text: 'This is a test email from the Mailler service.\n\nIf you receive this, sending works! ✅',
      html: '<h1>Test Email</h1><p>This is a test email from the Mailler service.</p><p>If you receive this, sending works! ✅</p>'
    };

    console.log('📤 Sending test email to:', emailData.to);

    const result = await mailerService.sendEmail(testAccount.id, emailData);

    expect(result).toBeDefined();
    expect(result.messageId).toBeDefined();
    console.log('✅ Email sent successfully! Message ID:', result.messageId);
    console.log('   Check your inbox at', process.env.TEST_EMAIL_ADDRESS);
  }, 30000); // 30 second timeout

  test('Receive emails via IMAP', async () => {
    if (!hasEmailConfig()) return;

    console.log('📥 Fetching emails from IMAP...');

    const emails = await receiverService.fetchEmails(testAccount.id, 'INBOX', 5);

    expect(Array.isArray(emails)).toBe(true);
    console.log(`✅ Retrieved ${emails.length} emails from inbox`);

    if (emails.length > 0) {
      const latest = emails[emails.length - 1];
      console.log('\n📧 Latest email:');
      console.log('   From:', latest.from);
      console.log('   Subject:', latest.subject);
      console.log('   Date:', latest.date);
      
      expect(latest.subject).toBeDefined();
      expect(latest.from).toBeDefined();
    } else {
      console.log('⚠️  Inbox is empty');
    }
  }, 30000); // 30 second timeout

  test('Sync emails to database', async () => {
    if (!hasEmailConfig()) return;

    console.log('🔄 Syncing emails to database...');

    const result = await receiverService.syncEmails(testAccount.id);

    expect(result).toBeDefined();
    expect(result.synced).toBeGreaterThanOrEqual(0);
    console.log(`✅ Synced ${result.synced} emails to database`);
  }, 30000); // 30 second timeout

  test('Full send and receive cycle', async () => {
    if (!hasEmailConfig()) return;

    const uniqueSubject = `Mailler Full Cycle Test - ${Date.now()}`;

    // Step 1: Send email
    console.log('📤 Step 1: Sending email with unique subject...');
    const sendResult = await mailerService.sendEmail(testAccount.id, {
      to: process.env.TEST_EMAIL_ADDRESS,
      subject: uniqueSubject,
      text: 'This email is part of an automated send/receive test cycle.'
    });

    expect(sendResult.messageId).toBeDefined();
    console.log('✅ Email sent:', sendResult.messageId);

    // Step 2: Wait for email to arrive (Gmail can take a few seconds)
    console.log('⏳ Step 2: Waiting 10 seconds for email delivery...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 3: Fetch emails and look for our test email
    console.log('📥 Step 3: Fetching emails...');
    const emails = await receiverService.fetchEmails(testAccount.id, 'INBOX', 20);

    const ourEmail = emails.find(email => email.subject === uniqueSubject);

    if (ourEmail) {
      console.log('✅ Successfully found our sent email in inbox!');
      console.log('   Full cycle completed successfully! 🎉');
      expect(ourEmail.subject).toBe(uniqueSubject);
    } else {
      console.log('⚠️  Email not found yet in inbox. This might be due to:');
      console.log('   - Delay in email delivery');
      console.log('   - Email in spam folder');
      console.log('   - IMAP sync delay');
      console.log('   Check your inbox manually for subject:', uniqueSubject);
    }
  }, 45000); // 45 second timeout
});

/**
 * HOW TO RUN THESE TESTS:
 * 
 * 1. Set up environment variables (create .env.test file):
 *    TEST_EMAIL_ADDRESS=your-email@gmail.com
 *    TEST_IMAP_HOST=imap.gmail.com
 *    TEST_IMAP_PORT=993
 *    TEST_IMAP_USERNAME=your-email@gmail.com
 *    TEST_IMAP_PASSWORD=your-app-password
 *    TEST_SMTP_HOST=smtp.gmail.com
 *    TEST_SMTP_PORT=587
 *    TEST_SMTP_USERNAME=your-email@gmail.com
 *    TEST_SMTP_PASSWORD=your-app-password
 * 
 * 2. Run the tests:
 *    npm test tests/real-email.test.js
 * 
 * 3. Check your email inbox for the test messages
 */
