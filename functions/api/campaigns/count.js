// Campaigns count endpoint
import { createProtectedRoute } from '../../middleware/auth.js';

export const onRequestGet = createProtectedRoute(async function(context) {
    const { env, user } = context;
    
    try {
        const result = await env.CF_INFOBIP_DB.prepare(`
            SELECT COUNT(*) as count FROM campaigns WHERE user_google_id = ?
        `).bind(user.google_id).first();
        
        return new Response(JSON.stringify({ count: result.count }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching campaigns count:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch campaigns count' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});