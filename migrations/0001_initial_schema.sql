-- Initial database schema for CF-Infobip Broadcaster
-- Created: 2024-10-29

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    google_refresh_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_google_id TEXT NOT NULL,
    google_contact_id TEXT,
    name TEXT,
    phone_number TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_google_id) REFERENCES users(google_id) ON DELETE CASCADE
);

-- Indexes for contacts table
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_google_id);
CREATE INDEX IF NOT EXISTS idx_contacts_google_id ON contacts(google_contact_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique ON contacts(user_google_id, google_contact_id);

-- Campaigns table (for future use)
CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_google_id TEXT NOT NULL,
    name TEXT NOT NULL,
    message_template TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    scheduled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_google_id) REFERENCES users(google_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_google_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- Messages table (for logging sent messages)
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    contact_id INTEGER NOT NULL,
    user_google_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    infobip_message_id TEXT,
    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_google_id) REFERENCES users(google_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_google_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);
