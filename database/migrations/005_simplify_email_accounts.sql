-- Simplify email_accounts table for pure email server architecture
-- Remove external IMAP/SMTP configuration (we host emails locally)

ALTER TABLE email_accounts DROP COLUMN IF EXISTS imap_host;
ALTER TABLE email_accounts DROP COLUMN IF EXISTS imap_port;
ALTER TABLE email_accounts DROP COLUMN IF EXISTS imap_username;
ALTER TABLE email_accounts DROP COLUMN IF EXISTS imap_password;
ALTER TABLE email_accounts DROP COLUMN IF EXISTS smtp_host;
ALTER TABLE email_accounts DROP COLUMN IF EXISTS smtp_port;
ALTER TABLE email_accounts DROP COLUMN IF EXISTS smtp_username;
ALTER TABLE email_accounts DROP COLUMN IF EXISTS smtp_password;

-- email_accounts now only contains:
-- id, user_id, email_address, is_default, created_at, updated_at
