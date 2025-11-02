-- Migration: Add Telegram Provider Support
-- Date: 2025-11-02

-- Add Telegram support to contacts table
ALTER TABLE contacts ADD COLUMN telegram_id TEXT;
ALTER TABLE contacts ADD COLUMN telegram_username TEXT;
ALTER TABLE contacts ADD COLUMN preferred_provider TEXT DEFAULT 'whatsapp' CHECK(preferred_provider IN ('whatsapp', 'telegram'));

-- Make message_logs provider-agnostic
ALTER TABLE message_logs ADD COLUMN provider TEXT DEFAULT 'whatsapp' CHECK(provider IN ('whatsapp', 'telegram'));

-- Note: SQLite doesn't support ALTER COLUMN RENAME, so we'll handle infobip_message_id → provider_message_id in app logic

-- Add provider to campaign_recipients
ALTER TABLE campaign_recipients ADD COLUMN provider TEXT DEFAULT 'whatsapp' CHECK(provider IN ('whatsapp', 'telegram'));

-- Create index for efficient provider queries
CREATE INDEX idx_contacts_telegram_id ON contacts(telegram_id);
CREATE INDEX idx_message_logs_provider ON message_logs(provider);
CREATE INDEX idx_campaign_recipients_provider ON campaign_recipients(provider);