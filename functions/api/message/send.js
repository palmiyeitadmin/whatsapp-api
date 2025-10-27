// WhatsApp message sending endpoint via Infobip
import { createProtectedRoute } from '../../middleware/auth.js';

export const onRequestPost = createProtectedRoute(async function(context) {
    const { env, user } = context;
    
    try {
        const body = await context.request.json();
        
        // Validate request body
        const { message, recipients, campaignId } = body;
        
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
        
        // Validate message length (WhatsApp limit is typically 4096 characters)
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
        
        // Send messages with rate limiting and batch processing
        const sendResults = await sendWhatsAppMessages(
            contacts, 
            message, 
            env.INFOBIP_API_KEY, 
            env.INFOBIP_BASE_URL,
            env.INFOBIP_WHATSAPP_SENDER,
            user.google_id,
            campaign?.id
        );
        
        // Update campaign status if provided
        if (campaign) {
            await updateCampaignStatus(campaign.id, 'sending', env);
        }
        
        return new Response(JSON.stringify({
            success: true,
            results: sendResults,
            summary: {
                total: sendResults.length,
                sent: sendResults.filter(r => r.status === 'sent').length,
                failed: sendResults.filter(r => r.status === 'failed').length
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
        SELECT id, name, phone_number, email 
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

async function sendWhatsAppMessages(contacts, message, apiKey, baseUrl, sender, userId, campaignId = null) {
    const results = [];
    const batchSize = 10; // Process in batches of 10
    const delayBetweenBatches = 1000; // 1 second delay between batches
    
    for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (contact) => {
            try {
                // Format phone number for WhatsApp (remove non-numeric characters, ensure country code)
                const phoneNumber = formatPhoneNumber(contact.phone_number);
                
                if (!phoneNumber) {
                    throw new Error('Invalid phone number');
                }
                
                // Send message via Infobip API
                const infobipResponse = await sendInfobipMessage(
                    phoneNumber,
                    message,
                    apiKey,
                    baseUrl,
                    sender
                );
                
                // Log message in database
                await logMessage(
                    userId,
                    contact.id,
                    campaignId,
                    message,
                    infobipResponse.messageId,
                    'sent',
                    null,
                    env
                );
                
                return {
                    contactId: contact.id,
                    phoneNumber,
                    status: 'sent',
                    messageId: infobipResponse.messageId,
                    response: infobipResponse
                };
                
            } catch (error) {
                // Log failed message
                await logMessage(
                    userId,
                    contact.id,
                    campaignId,
                    message,
                    null,
                    'failed',
                    error.message,
                    env
                );
                
                return {
                    contactId: contact.id,
                    phoneNumber: contact.phone_number,
                    status: 'failed',
                    error: error.message
                };
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches to avoid rate limiting
        if (i + batchSize < contacts.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }
    
    return results;
}

async function sendInfobipMessage(phoneNumber, message, apiKey, baseUrl, sender) {
    const url = `${baseUrl}/whatsapp/1/message/text`;
    
    const payload = {
        from: sender,
        to: phoneNumber,
        content: {
            text: message
        }
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `App ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Infobip API error: ${response.status} - ${errorData}`);
    }
    
    const data = await response.json();
    
    return {
        messageId: data.messageId || data.messages?.[0]?.messageId,
        status: data.status || 'sent',
        response: data
    };
}

function formatPhoneNumber(phoneNumber) {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');
    
    // Ensure it has country code (add default if missing)
    if (cleaned.length === 10) {
        // Assume US number if 10 digits
        cleaned = '1' + cleaned;
    } else if (cleaned.length < 10) {
        return null; // Invalid number
    }
    
    // Validate length (should be 11-15 digits for international numbers)
    if (cleaned.length < 11 || cleaned.length > 15) {
        return null;
    }
    
    return cleaned;
}

async function logMessage(userId, contactId, campaignId, messageContent, messageId, status, errorMessage, env) {
    await env.CF_INFOBIP_DB.prepare(`
        INSERT INTO message_logs 
        (user_google_id, contact_id, campaign_id, message_content, infobip_message_id, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
        userId,
        contactId,
        campaignId,
        messageContent,
        messageId,
        status,
        errorMessage
    ).run();
}