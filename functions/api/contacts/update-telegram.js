/**
 * Update contact with Telegram information
 * PUT /api/contacts/update-telegram
 */
import { createProtectedRoute } from '../../middleware/auth.js';

export const onRequestPut = createProtectedRoute(async function(context) {
    const { env, user } = context;

    try {
        const body = await context.request.json();
        const { contactId, telegramId, telegramUsername, preferredProvider } = body;

        if (!contactId) {
            return new Response(JSON.stringify({ error: 'Contact ID required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update contact
        await env.CF_INFOBIP_DB.prepare(`
            UPDATE contacts
            SET
                telegram_id = ?,
                telegram_username = ?,
                preferred_provider = ?,
                updated_at = datetime('now')
            WHERE id = ? AND user_google_id = ?
        `).bind(
            telegramId || null,
            telegramUsername || null,
            preferredProvider || 'whatsapp',
            contactId,
            user.google_id
        ).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Contact updated successfully'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Update contact error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});