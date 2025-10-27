// Message logs endpoint
import { createProtectedRoute } from '../../middleware/auth.js';

export const onRequestGet = createProtectedRoute(async function(context) {
    const { env, user } = context;
    const url = new URL(context.request.url);
    
    try {
        // Parse query parameters
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 20;
        const status = url.searchParams.get('status') || '';
        const campaignId = url.searchParams.get('campaignId') || '';
        const contactId = url.searchParams.get('contactId') || '';
        const startDate = url.searchParams.get('startDate') || '';
        const endDate = url.searchParams.get('endDate') || '';
        const sortBy = url.searchParams.get('sortBy') || 'created_at';
        const sortOrder = url.searchParams.get('sortOrder') || 'desc';
        
        // Validate pagination parameters
        const validatedPage = Math.max(1, page);
        const validatedLimit = Math.min(Math.max(1, limit), 100); // Max 100 per page
        const offset = (validatedPage - 1) * validatedLimit;
        
        // Build WHERE clause
        let whereClause = 'WHERE ml.user_google_id = ?';
        const params = [user.google_id];
        
        if (status) {
            whereClause += ' AND ml.status = ?';
            params.push(status);
        }
        
        if (campaignId) {
            whereClause += ' AND ml.campaign_id = ?';
            params.push(campaignId);
        }
        
        if (contactId) {
            whereClause += ' AND ml.contact_id = ?';
            params.push(contactId);
        }
        
        if (startDate) {
            whereClause += ' AND ml.created_at >= ?';
            params.push(startDate);
        }
        
        if (endDate) {
            whereClause += ' AND ml.created_at <= ?';
            params.push(endDate);
        }
        
        // Build ORDER BY clause
        const validSortFields = ['created_at', 'status', 'contact_id', 'campaign_id'];
        const validSortOrders = ['asc', 'desc'];
        
        const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const validatedSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';
        
        const orderClause = `ORDER BY ml.${validatedSortBy} ${validatedSortOrder.toUpperCase()}`;
        
        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM message_logs ml ${whereClause}`;
        const countResult = await env.CF_INFOBIP_DB.prepare(countQuery)
            .bind(...params)
            .first();
        
        // Get message logs with contact and campaign details
        const logsQuery = `
            SELECT 
                ml.id,
                ml.message_content,
                ml.infobip_message_id,
                ml.status,
                ml.error_message,
                ml.created_at,
                ml.sent_at,
                ml.delivered_at,
                c.name as contact_name,
                c.phone_number as contact_phone,
                c.email as contact_email,
                camp.name as campaign_name,
                camp.status as campaign_status
            FROM message_logs ml
            LEFT JOIN contacts c ON ml.contact_id = c.id
            LEFT JOIN campaigns camp ON ml.campaign_id = camp.id
            ${whereClause}
            ${orderClause}
            LIMIT ? OFFSET ?
        `;
        
        const logs = await env.CF_INFOBIP_DB.prepare(logsQuery)
            .bind(...params, validatedLimit, offset)
            .all();
        
        // Get statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_messages,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                COUNT(DISTINCT contact_id) as unique_contacts,
                COUNT(DISTINCT campaign_id) as campaigns_count
            FROM message_logs 
            WHERE user_google_id = ?
            ${startDate ? 'AND created_at >= ?' : ''}
            ${endDate ? 'AND created_at <= ?' : ''}
        `;
        
        const statsParams = [user.google_id];
        if (startDate) statsParams.push(startDate);
        if (endDate) statsParams.push(endDate);
        
        const stats = await env.CF_INFOBIP_DB.prepare(statsQuery)
            .bind(...statsParams)
            .first();
        
        // Calculate pagination info
        const total = countResult.total;
        const totalPages = Math.ceil(total / validatedLimit);
        const hasNextPage = validatedPage < totalPages;
        const hasPrevPage = validatedPage > 1;
        
        return new Response(JSON.stringify({
            success: true,
            data: logs.results || [],
            pagination: {
                page: validatedPage,
                limit: validatedLimit,
                total,
                totalPages,
                hasNextPage,
                hasPrevPage
            },
            statistics: stats,
            filters: {
                status,
                campaignId,
                contactId,
                startDate,
                endDate,
                sortBy: validatedSortBy,
                sortOrder: validatedSortOrder
            }
        }), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60' // Cache for 1 minute
            },
        });
        
    } catch (error) {
        console.error('Message logs error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch message logs',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});