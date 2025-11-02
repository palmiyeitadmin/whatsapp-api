/**
 * Multi-Provider Message Router
 * Abstracts message sending across different providers
 */

import { sendTelegramMessages } from './telegram.js';

/**
 * Send messages via WhatsApp (existing Infobip integration)
 * This function wraps the existing WhatsApp logic
 */
async function sendWhatsAppMessages(contacts, message, env, userGoogleId, campaignId) {
    // Import the existing WhatsApp send logic
    // We need to extract the relevant parts from the existing send.js implementation
    const INFOBIP_API_KEY = env.INFOBIP_API_KEY;
    const INFOBIP_BASE_URL = env.INFOBIP_BASE_URL;
    const INFOBIP_WHATSAPP_SENDER = env.INFOBIP_WHATSAPP_SENDER;
    
    const results = [];
    
    for (const contact of contacts) {
        try {
            const response = await fetch(`${INFOBIP_BASE_URL}/whatsapp/1/message/text`, {
                method: 'POST',
                headers: {
                    'Authorization': `App ${INFOBIP_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: INFOBIP_WHATSAPP_SENDER,
                    to: contact.phone_number,
                    content: {
                        text: message
                    }
                })
            });

            const data = await response.json();

            if (response.ok) {
                results.push({
                    contactId: contact.id,
                    contactName: contact.name,
                    success: true,
                    messageId: data.messageId,
                    provider: 'whatsapp'
                });
            } else {
                results.push({
                    contactId: contact.id,
                    contactName: contact.name,
                    success: false,
                    error: data.message || 'Unknown WhatsApp API error',
                    provider: 'whatsapp'
                });
            }
        } catch (error) {
            results.push({
                contactId: contact.id,
                contactName: contact.name,
                success: false,
                error: error.message,
                provider: 'whatsapp'
            });
        }
    }
    
    return results;
}

/**
 * Route message sending to the appropriate provider
 * @param {string} provider - 'whatsapp' or 'telegram'
 * @param {Array} contacts - Array of contact objects
 * @param {string} message - Message content
 * @param {object} env - Environment variables
 * @param {string} userGoogleId - User's Google ID
 * @param {number|null} campaignId - Optional campaign ID
 * @returns {Promise<Array>} Array of send results
 */
export async function sendMessageViaProvider(provider, contacts, message, env, userGoogleId, campaignId = null) {
    switch (provider) {
        case 'whatsapp':
            return sendWhatsAppMessages(contacts, message, env, userGoogleId, campaignId);

        case 'telegram':
            if (!env.TELEGRAM_BOT_TOKEN) {
                throw new Error('Telegram Bot Token not configured');
            }
            return sendTelegramMessages(
                contacts,
                message,
                env.TELEGRAM_BOT_TOKEN,
                env.TELEGRAM_API_URL || 'https://api.telegram.org',
                userGoogleId,
                campaignId
            );

        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

/**
 * Validate provider and contacts compatibility
 * @param {string} provider - Provider name
 * @param {Array} contacts - Array of contacts
 * @returns {object} Validation result
 */
export function validateProviderContacts(provider, contacts) {
    const invalidContacts = [];

    for (const contact of contacts) {
        switch (provider) {
            case 'whatsapp':
                if (!contact.phone_number) {
                    invalidContacts.push({ id: contact.id, name: contact.name, reason: 'Missing phone number' });
                }
                break;

            case 'telegram':
                if (!contact.telegram_id && !contact.telegram_username) {
                    invalidContacts.push({ id: contact.id, name: contact.name, reason: 'Missing Telegram ID' });
                }
                break;
        }
    }

    return {
        valid: invalidContacts.length === 0,
        invalidContacts
    };
}