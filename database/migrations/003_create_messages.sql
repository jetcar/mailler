-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    message_id VARCHAR(500),
    from_address TEXT,
    to_addresses TEXT,
    cc_addresses TEXT,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    received_date TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    folder VARCHAR(100) DEFAULT 'INBOX',
    raw_headers JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_account_id ON messages(account_id);
CREATE INDEX idx_messages_message_id ON messages(message_id);
CREATE INDEX idx_messages_folder ON messages(folder);
CREATE INDEX idx_messages_received_date ON messages(received_date DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read);
