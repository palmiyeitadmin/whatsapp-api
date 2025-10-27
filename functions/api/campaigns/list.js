// Campaigns list endpoint
import { createProtectedRoute } from '../../middleware/auth.js';

export const onRequestGet = createProtectedRoute(async function(context) {
    const { env, user } = context;
    const url = new URL(context.request.url);
    
    try {
        // Parse query parameters
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 10;
        const status = url.searchParams.get('status') || '';
        const sortBy = url.searchParams.get('sortBy') || 'created_at';
        const sortOrder = url.searchParams.get('sortOrder') || 'desc';
        
        // Validate pagination parameters
        const validatedPage = Math.max(1, page);
        const validatedLimit = Math.min(Math.max(1, limit), 50); // Max 50 per page
        const offset = (validatedPage - 1) * validatedLimit;
        
        // Build WHERE clause for status filter
        let whereClause = 'WHERE c.user_google_id = ?';
        const params = [user.google_id];
        
        if (status) {
            whereClause += ' AND c.status = ?';
            params.push(status);
        }
        
        // Build ORDER BY clause
        const validSortFields = ['name', 'status', 'created_at', 'updated_at', 'scheduled_at'];
        const validSortOrders = ['asc', 'desc'];
        
        const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const validatedSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';
        
        const orderClause = `ORDER BY c.${validatedSortBy} ${validatedSortOrder.toUpperCase()}`;
        
        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM campaigns c ${whereClause}`;
        const countResult = await env.CF_INFOBIP_DB.prepare(countQuery)
            .bind(...params)
            .first();
        
        // Get campaigns with recipient counts
        const campaignsQuery = `
            SELECT 
                c.id, 
                c.name, 
                c.message_template, 
                c.status, 
                c.scheduled_at,
                c.created_at, 
                c.updated_at,
                COUNT(cr.id) as total_recipients,
                SUM(CASE WHEN cr.status = 'sent' THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN cr.status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
                SUM(CASE WHEN cr.status = 'failed' THEN 1 ELSE 0 END) as failed_count
            FROM campaigns c
            LEFT JOIN campaign_recipients cr ON c.id = cr.campaign_id
            ${whereClause}
            GROUP BY c.id
            ${orderClause}
            LIMIT ? OFFSET ?
        `;
        
        const campaigns = await env.CF_INFOBIP_DB.prepare(campaignsQuery)
            .bind(...params, validatedLimit, offset)
            .all();
        
        // Calculate pagination info
        const total = countResult.total;
        const totalPages = Math.ceil(total / validatedLimit);
        const hasNextPage = validatedPage < totalPages;
        const hasPrevPage = validatedPage > 1;
        
        return new Response(JSON.stringify({
            success: true,
            data: campaigns.results || [],
            pagination: {
                page: validatedPage,
                limit: validatedLimit,
                total,
                totalPages,
                hasNextPage,
                hasPrevPage
            },
            filters: {
                status,
                sortBy: validatedSortBy,
                sortOrder: validatedSortOrder
            }
        }), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
            },
        });
        
    } catch (error) {
        console.error('Campaigns list error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch campaigns',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});