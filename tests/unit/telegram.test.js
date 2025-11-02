import { describe, it, expect, vi } from 'vitest';
import { sendTelegramMessage, formatTelegramIdentifier } from '../../functions/lib/telegram.js';

describe('Telegram Integration', () => {
    describe('formatTelegramIdentifier', () => {
        it('should format numeric chat ID', () => {
            expect(formatTelegramIdentifier(123456789)).toBe(123456789);
        });

        it('should format username with @', () => {
            expect(formatTelegramIdentifier('@testuser')).toBe('@testuser');
        });

        it('should convert numeric string to number', () => {
            expect(formatTelegramIdentifier('123456789')).toBe(123456789);
        });

        it('should return null for invalid identifier', () => {
            expect(formatTelegramIdentifier('')).toBe(null);
            expect(formatTelegramIdentifier('invalid')).toBe(null);
        });
    });

    describe('sendTelegramMessage', () => {
        it('should send message successfully', async () => {
            // Mock fetch
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    ok: true,
                    result: { message_id: 12345 }
                })
            });

            const result = await sendTelegramMessage(
                123456789,
                'Test message',
                'test_bot_token',
                'https://api.telegram.org'
            );

            expect(result.messageId).toBe('12345');
            expect(result.status).toBe('sent');
        });

        it('should handle API error response', async () => {
            // Mock fetch with error response
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                json: async () => ({
                    description: 'Bad Request: chat not found'
                })
            });

            await expect(
                sendTelegramMessage(
                    123456789,
                    'Test message',
                    'invalid_token',
                    'https://api.telegram.org'
                )
            ).rejects.toThrow('Telegram API error: 400 - Bad Request: chat not found');
        });

        it('should handle non-ok response from Telegram', async () => {
            // Mock fetch with non-ok response
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    ok: false,
                    description: 'Bad Request: chat not found'
                })
            });

            await expect(
                sendTelegramMessage(
                    123456789,
                    'Test message',
                    'invalid_token',
                    'https://api.telegram.org'
                )
            ).rejects.toThrow('Telegram API error: Bad Request: chat not found');
        });
    });
});