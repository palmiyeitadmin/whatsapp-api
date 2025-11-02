// Multi-provider message sending endpoint
import { createProtectedRoute } from '../../middleware/auth.js';
import { sendMessageViaProvider, validateProviderContacts } from '../../lib/providerRouter.js';

export const onRequestPost = createProtectedRoute(async function(context) {
    const { env, user } = context;
    
    try {
        const body = await context.request.json();
        
        // Validate request body
        const { message, recipients, campaignId, provider = 'whatsapp' } = body;
        
        // Validate provider
        if (!['whatsapp', 'telegram'].includes(provider)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid provider. Must be "whatsapp" or "telegram"'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (!message || !message.trim()) {
            return new Response(JSON.stringify({ 
                error: 'Message content is required' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return new Response(JSON.stringify({ 
                error: 'At least one recipient is required' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Validate message length (both WhatsApp and Telegram limit is typically 4096 characters)
        if (message.length > 4096) {
            return new Response(JSON.stringify({
                error: 'Message is too long. Maximum 4096 characters allowed.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Get contact details for recipients
        const contactIds = recipients.map(r => r.id || r);
        const contacts = await getContactsByIds(contactIds, user.google_id, env);
        
        if (contacts.length === 0) {
            return new Response(JSON.stringify({
                error: 'No valid contacts found'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Validate contacts have required provider fields
        const providerValidation = validateProviderContacts(provider, contacts);
        if (!providerValidation.valid) {
            return new Response(JSON.stringify({
                success: false,
                error: `${providerValidation.invalidContacts.length} contacts missing ${provider} information`,
                invalidContacts: providerValidation.invalidContacts
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Create campaign if campaignId is provided
        let campaign = null;
        if (campaignId) {
            campaign = await getCampaignById(campaignId, user.google_id, env);
            if (!campaign) {
                return new Response(JSON.stringify({ 
                    error: 'Campaign not found' 
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }
        
        // Send messages via selected provider
        const sendResults = await sendMessageViaProvider(
            provider,
            contacts,
            message,
            env,
            user.google_id,
            campaign?.id
        );
        
        // Log messages in database
        for (const result of sendResults) {
            await logMessage(
                user.google_id,
                result.contactId,
                campaign?.id,
                message,
                result.messageId || null,
                result.success ? 'sent' : 'failed',
                result.error || null,
                provider,
                env
            );
        }
        
        // Update campaign status if provided
        if (campaign) {
            await updateCampaignStatus(campaign.id, 'sending', env);
        }
        
        return new Response(JSON.stringify({
            success: true,
            results: sendResults,
            summary: {
                total: sendResults.length,
                sent: sendResults.filter(r => r.success).length,
                failed: sendResults.filter(r => !r.success).length
            }
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
        
    } catch (error) {
        console.error('Message send error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to send messages',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});

async function getContactsByIds(contactIds, userId, env) {
    const placeholders = contactIds.map(() => '?').join(',');
    const query = `
        SELECT id, name, phone_number, email, telegram_id, telegram_username, preferred_provider
        FROM contacts
        WHERE user_google_id = ? AND id IN (${placeholders})
    `;
    
    const result = await env.CF_INFOBIP_DB.prepare(query)
        .bind(userId, ...contactIds)
        .all();
    
    return result.results || [];
}

async function getCampaignById(campaignId, userId, env) {
    const result = await env.CF_INFOBIP_DB.prepare(`
        SELECT id, name, message_template, status 
        FROM campaigns 
        WHERE id = ? AND user_google_id = ?
    `).bind(campaignId, userId).first();
    
    return result;
}

async function updateCampaignStatus(campaignId, status, env) {
    await env.CF_INFOBIP_DB.prepare(`
        UPDATE campaigns 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `).bind(status, campaignId).run();
}

async function logMessage(userId, contactId, campaignId, messageContent, messageId, status, errorMessage, provider, env) {
    await env.CF_INFOBIP_DB.prepare(`
        INSERT INTO message_logs
        (user_google_id, contact_id, campaign_id, message_content, infobip_message_id, provider, status, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
        userId,
        contactId,
        campaignId,
        messageContent,
        messageId,
        provider,
        status,
        errorMessage
    ).run();
}