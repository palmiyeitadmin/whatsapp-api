import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendMessageViaProvider, validateProviderContacts } from '../../functions/lib/providerRouter.js';

// Mock the Telegram module
vi.mock('../../functions/lib/telegram.js', () => ({
    sendTelegramMessages: vi.fn()
}));

describe('Multi-Provider Integration', () => {
    let mockEnv;
    let mockContacts;

    beforeEach(() => {
        mockEnv = {
            INFOBIP_API_KEY: 'test_infobip_key',
            INFOBIP_BASE_URL: 'https://api.infobip.com',
            INFOBIP_WHATSAPP_SENDER: '447860099299',
            TELEGRAM_BOT_TOKEN: 'test_telegram_token',
            TELEGRAM_API_URL: 'https://api.telegram.org'
        };

        mockContacts = [
            {
                id: 1,
                name: 'Test User 1',
                phone_number: '+1234567890',
                telegram_id: '123456789',
                telegram_username: '@testuser1'
            },
            {
                id: 2,
                name: 'Test User 2',
                phone_number: '+0987654321',
                telegram_id: '987654321',
                telegram_username: '@testuser2'
            }
        ];

        // Mock fetch globally
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('validateProviderContacts', () => {
        it('should validate WhatsApp contacts correctly', () => {
            const result = validateProviderContacts('whatsapp', mockContacts);
            
            expect(result.valid).toBe(true);
            expect(result.invalidContacts).toHaveLength(0);
        });

        it('should validate Telegram contacts correctly', () => {
            const result = validateProviderContacts('telegram', mockContacts);
            
            expect(result.valid).toBe(true);
            expect(result.invalidContacts).toHaveLength(0);
        });

        it('should detect missing phone numbers for WhatsApp', () => {
            const contactsWithoutPhone = [
                { id: 1, name: 'User 1', phone_number: null },
                { id: 2, name: 'User 2', phone_number: '' }
            ];

            const result = validateProviderContacts('whatsapp', contactsWithoutPhone);
            
            expect(result.valid).toBe(false);
            expect(result.invalidContacts).toHaveLength(2);
            expect(result.invalidContacts[0].reason).toBe('Missing phone number');
        });

        it('should detect missing Telegram IDs', () => {
            const contactsWithoutTelegram = [
                { id: 1, name: 'User 1', telegram_id: null, telegram_username: null },
                { id: 2, name: 'User 2', telegram_id: '', telegram_username: '' }
            ];

            const result = validateProviderContacts('telegram', contactsWithoutTelegram);
            
            expect(result.valid).toBe(false);
            expect(result.invalidContacts).toHaveLength(2);
            expect(result.invalidContacts[0].reason).toBe('Missing Telegram ID');
        });
    });

    describe('sendMessageViaProvider', () => {
        it('should route to WhatsApp provider correctly', async () => {
            // Mock successful WhatsApp API response
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    messageId: 'whatsapp_msg_123',
                    status: 'sent'
                })
            });

            const result = await sendMessageViaProvider(
                'whatsapp',
                mockContacts,
                'Test message',
                mockEnv,
                'user123',
                null
            );

            expect(result).toHaveLength(2);
            expect(result[0].provider).toBe('whatsapp');
            expect(result[0].success).toBe(true);
        });

        it('should route to Telegram provider correctly', async () => {
            const { sendTelegramMessages } = await import('../../functions/lib/telegram.js');
            sendTelegramMessages.mockResolvedValue([
                {
                    contactId: 1,
                    contactName: 'Test User 1',
                    success: true,
                    messageId: 'telegram_msg_123',
                    provider: 'telegram'
                },
                {
                    contactId: 2,
                    contactName: 'Test User 2',
                    success: true,
                    messageId: 'telegram_msg_456',
                    provider: 'telegram'
                }
            ]);

            const result = await sendMessageViaProvider(
                'telegram',
                mockContacts,
                'Test message',
                mockEnv,
                'user123',
                null
            );

            expect(sendTelegramMessages).toHaveBeenCalledWith(
                mockContacts,
                'Test message',
                'test_telegram_token',
                'https://api.telegram.org',
                'user123',
                null
            );

            expect(result).toHaveLength(2);
            expect(result[0].provider).toBe('telegram');
            expect(result[0].success).toBe(true);
        });

        it('should throw error for unknown provider', async () => {
            await expect(
                sendMessageViaProvider(
                    'unknown',
                    mockContacts,
                    'Test message',
                    mockEnv,
                    'user123',
                    null
                )
            ).rejects.toThrow('Unknown provider: unknown');
        });

        it('should throw error when Telegram token is missing', async () => {
            const envWithoutTelegram = { ...mockEnv };
            delete envWithoutTelegram.TELEGRAM_BOT_TOKEN;

            await expect(
                sendMessageViaProvider(
                    'telegram',
                    mockContacts,
                    'Test message',
                    envWithoutTelegram,
                    'user123',
                    null
                )
            ).rejects.toThrow('Telegram Bot Token not configured');
        });
    });
});