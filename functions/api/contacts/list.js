// Contacts list endpoint with pagination and search
import { createProtectedRoute } from '../../middleware/auth.js';

export const onRequestGet = createProtectedRoute(async function(context) {
    const { env } = context;
    // TEMPORARY: Use test user for development
    const user = context.user || { google_id: 'test-user' };
    const url = new URL(context.request.url);
    
    try {
        // Parse query parameters
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 20;
        const search = url.searchParams.get('search') || '';
        const sortBy = url.searchParams.get('sortBy') || 'name';
        const sortOrder = url.searchParams.get('sortOrder') || 'asc';
        
        // Validate pagination parameters
        const validatedPage = Math.max(1, page);
        const validatedLimit = Math.min(Math.max(1, limit), 100); // Max 100 per page
        const offset = (validatedPage - 1) * validatedLimit;
        
        // Build WHERE clause for search
        let whereClause = 'WHERE user_google_id = ?';
        const params = [user.google_id];
        
        if (search) {
            whereClause += ' AND (name LIKE ? OR phone_number LIKE ? OR email LIKE ? OR telegram_username LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }
        
        // Build ORDER BY clause
        const validSortFields = ['name', 'phone_number', 'email', 'telegram_id', 'telegram_username', 'preferred_provider', 'created_at', 'updated_at'];
        const validSortOrders = ['asc', 'desc'];
        
        const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'name';
        const validatedSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'asc';
        
        const orderClause = `ORDER BY ${validatedSortBy} ${validatedSortOrder.toUpperCase()}`;
        
        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM contacts ${whereClause}`;
        const countResult = await env.CF_INFOBIP_DB.prepare(countQuery)
            .bind(...params)
            .first();
        
        // Get contacts with pagination
        const contactsQuery = `
            SELECT
                id,
                name,
                phone_number,
                email,
                telegram_id,
                telegram_username,
                preferred_provider,
                created_at,
                updated_at
            FROM contacts
            ${whereClause}
            ${orderClause}
            LIMIT ? OFFSET ?
        `;
        
        const contacts = await env.CF_INFOBIP_DB.prepare(contactsQuery)
            .bind(...params, validatedLimit, offset)
            .all();
        
        // Calculate pagination info
        const total = countResult.total;
        const totalPages = Math.ceil(total / validatedLimit);
        const hasNextPage = validatedPage < totalPages;
        const hasPrevPage = validatedPage > 1;
        
        return new Response(JSON.stringify({
            success: true,
            data: contacts.results || [],
            pagination: {
                page: validatedPage,
                limit: validatedLimit,
                total,
                totalPages,
                hasNextPage,
                hasPrevPage
            },
            filters: {
                search,
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
        console.error('Contacts list error:', error);
        console.error('Error stack:', error.stack);
        console.error('User:', user);
        console.error('Search params:', { search, sortBy, sortOrder, page: validatedPage, limit: validatedLimit });

        return new Response(JSON.stringify({
            error: 'Failed to fetch contacts',
            details: error.message,
            stack: error.stack,
            user: user?.google_id,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});