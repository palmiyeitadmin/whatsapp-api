-- Seed production database with test contacts
INSERT INTO contacts (user_google_id, name, phone_number, telegram_id, telegram_username, preferred_provider)
VALUES
('test-user', 'John Doe (WhatsApp)', '+905551234567', NULL, NULL, 'whatsapp'),
('test-user', 'Jane Smith (Telegram)', '+0000000000', '7820827823', '@janesmith', 'telegram'),
('test-user', 'Bob Johnson (Both)', '+905559876543', '1234567890', '@bobjohnson', 'whatsapp');
