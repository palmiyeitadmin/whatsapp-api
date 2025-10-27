-- CF-Infobip Broadcaster Database Schema

-- Users table for Google OAuth authentication
CREATE TABLE IF NOT EXISTS users (
  google_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  google_refresh_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table synchronized from Google Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_google_id TEXT NOT NULL,
  name TEXT,
  phone_number TEXT NOT NULL,
  email TEXT,
  google_contact_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_google_id) REFERENCES users(google_id) ON DELETE CASCADE
);

-- Message campaigns for bulk messaging
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_google_id TEXT NOT NULL,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, scheduled, sending, completed, failed
  scheduled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_google_id) REFERENCES users(google_id) ON DELETE CASCADE
);

-- Campaign recipients (many-to-many relationship between campaigns and contacts)
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  message_id TEXT, -- Infobip message ID
  sent_at DATETIME,
  delivered_at DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Message logs for tracking individual messages
CREATE TABLE IF NOT EXISTS message_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_google_id TEXT NOT NULL,
  contact_id INTEGER NOT NULL,
  campaign_id INTEGER,
  message_content TEXT NOT NULL,
  infobip_message_id TEXT,
  status TEXT NOT NULL, -- sent, delivered, failed
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_google_id) REFERENCES users(google_id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_user_google_id ON contacts(user_google_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_google_id ON campaigns(user_google_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact_id ON campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_user_google_id ON message_logs(user_google_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_contact_id ON message_logs(contact_id);