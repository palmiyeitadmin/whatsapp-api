/**
 * Telegram Bot API Integration
 * Handles message sending via Telegram Bot API
 */

/**
 * Send a message via Telegram Bot API
 * @param {string} chatId - Telegram chat ID (numeric or @username)
 * @param {string} message - Message text content
 * @param {string} botToken - Telegram Bot Token from BotFather
 * @param {string} apiUrl - Telegram API base URL
 * @returns {Promise<object>} Result object with messageId, status, and response
 */
export async function sendTelegramMessage(chatId, message, botToken, apiUrl = 'https://api.telegram.org') {
    const url = `${apiUrl}/bot${botToken}/sendMessage`;

    const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML' // Support for basic HTML formatting
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Telegram API error: ${response.status} - ${errorData.description || 'Unknown error'}`);
        }

        const data = await response.json();

        if (!data.ok) {
            throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
        }

        return {
            messageId: data.result.message_id.toString(),
            status: 'sent',
            response: data
        };
    } catch (error) {
        console.error('Telegram send error:', error);
        throw error;
    }
}

/**
 * Validate and format Telegram chat identifier
 * @param {string|number} identifier - Chat ID or username
 * @returns {string|number|null} Formatted identifier or null if invalid
 */
export function formatTelegramIdentifier(identifier) {
    if (!identifier) return null;

    // Numeric chat ID
    if (typeof identifier === 'number') return identifier;

    // String chat ID (convert to number)
    if (typeof identifier === 'string') {
        // Username format: @username
        if (identifier.startsWith('@')) {
            return identifier;
        }

        // Numeric string: convert to number
        const parsed = parseInt(identifier, 10);
        if (!isNaN(parsed)) return parsed;
    }

    return null; // Invalid identifier
}

/**
 * Send messages to multiple Telegram chats in batches
 * @param {Array} contacts - Array of contact objects with telegram_id
 * @param {string} message - Message content
 * @param {string} botToken - Telegram Bot Token
 * @param {string} apiUrl - Telegram API base URL
 * @param {string} userGoogleId - User's Google ID for logging
 * @param {number|null} campaignId - Optional campaign ID
 * @returns {Promise<Array>} Array of results
 */
export async function sendTelegramMessages(
    contacts,
    message,
    botToken,
    apiUrl,
    userGoogleId,
    campaignId = null
) {
    const results = [];
    const batchSize = 10; // Telegram rate limit: ~30 messages/second, we use 10 for safety
    const delayBetweenBatches = 1000; // 1 second

    for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        const batchPromises = batch.map(async (contact) => {
            try {
                const chatId = formatTelegramIdentifier(contact.telegram_id || contact.telegram_username);

                if (!chatId) {
                    return {
                        contactId: contact.id,
                        contactName: contact.name,
                        success: false,
                        error: 'Invalid Telegram identifier'
                    };
                }

                const result = await sendTelegramMessage(chatId, message, botToken, apiUrl);

                return {
                    contactId: contact.id,
                    contactName: contact.name,
                    success: true,
                    messageId: result.messageId,
                    provider: 'telegram'
                };
            } catch (error) {
                return {
                    contactId: contact.id,
                    contactName: contact.name,
                    success: false,
                    error: error.message,
                    provider: 'telegram'
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Delay between batches to respect rate limits
        if (i + batchSize < contacts.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }

    return results;
}