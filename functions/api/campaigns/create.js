// Create campaign endpoint
import { createProtectedRoute } from '../../middleware/auth.js';

export const onRequestPost = createProtectedRoute(async function(context) {
    const { env, user } = context;
    
    try {
        const body = await context.request.json();
        
        // Validate request body
        const { name, messageTemplate, recipientIds, scheduledAt } = body;
        
        if (!name || !name.trim()) {
            return new Response(JSON.stringify({ 
                error: 'Campaign name is required' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        if (!messageTemplate || !messageTemplate.trim()) {
            return new Response(JSON.stringify({ 
                error: 'Message template is required' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Validate message length
        if (messageTemplate.length > 4096) {
            return new Response(JSON.stringify({ 
                error: 'Message template is too long. Maximum 4096 characters allowed.' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Validate scheduled date if provided
        let scheduledDate = null;
        if (scheduledAt) {
            scheduledDate = new Date(scheduledAt);
            if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
                return new Response(JSON.stringify({ 
                    error: 'Invalid scheduled date. Must be a future date.' 
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }
        
        // Create campaign
        const campaignResult = await env.CF_INFOBIP_DB.prepare(`
            INSERT INTO campaigns (user_google_id, name, message_template, status, scheduled_at)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            user.google_id,
            name,
            messageTemplate,
            scheduledDate ? 'scheduled' : 'draft',
            scheduledDate ? scheduledDate.toISOString() : null
        ).run();
        
        const campaignId = campaignResult.meta.last_row_id;
        
        // Add recipients if provided
        if (recipientIds && Array.isArray(recipientIds) && recipientIds.length > 0) {
            await addCampaignRecipients(campaignId, recipientIds, user.google_id, env);
        }
        
        // Return created campaign
        const campaign = await env.CF_INFOBIP_DB.prepare(`
            SELECT id, name, message_template, status, scheduled_at, created_at, updated_at
            FROM campaigns 
            WHERE id = ? AND user_google_id = ?
        `).bind(campaignId, user.google_id).first();
        
        return new Response(JSON.stringify({
            success: true,
            campaign
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
        
    } catch (error) {
        console.error('Campaign creation error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to create campaign',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});

async function addCampaignRecipients(campaignId, recipientIds, userId, env) {
    // Validate that all contacts exist and belong to the user
    const placeholders = recipientIds.map(() => '?').join(',');
    const contacts = await env.CF_INFOBIP_DB.prepare(`
        SELECT id FROM contacts 
        WHERE user_google_id = ? AND id IN (${placeholders})
    `).bind(userId, ...recipientIds).all();
    
    const validContactIds = contacts.results.map(c => c.id);
    
    // Insert campaign recipients
    for (const contactId of validContactIds) {
        await env.CF_INFOBIP_DB.prepare(`
            INSERT INTO campaign_recipients (campaign_id, contact_id, status)
            VALUES (?, ?, 'pending')
        `).bind(campaignId, contactId).run();
    }
    
    return validContactIds.length;
}