import { createProtectedRoute } from '../../middleware/auth.js';

// Create new contact endpoint
export const onRequestPost = createProtectedRoute(async function(context) {
    const { env, user } = context;
    
    try {
        // Parse request body
        const requestData = await context.request.json();
        const { name, phone_number, email } = requestData;
        
        // Validate input
        if (!phone_number) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Phone number is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Enhanced phone number validation
        // Must contain at least 7 digits and only allowed characters: digits, +, -, (), spaces
        const cleanPhone = phone_number.replace(/[\s\-()]/g, '');
        if (!/^\+?\d{7,15}$/.test(cleanPhone)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid phone number format. Must contain 7-15 digits and may include +, -, (), spaces'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate email if provided
        if (email && email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid email format'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        // Check if contact already exists for this user with the same phone number
        const existingContactQuery = `
            SELECT id FROM contacts 
            WHERE user_google_id = ? AND phone_number = ?
        `;
        
        const existingContact = await env.CF_INFOBIP_DB.prepare(existingContactQuery)
            .bind(user.google_id, phone_number)
            .first();
            
        if (existingContact) {
            return new Response(JSON.stringify({
                success: false,
                error: 'A contact with this phone number already exists',
                contact_id: existingContact.id
            }), {
                status: 409, // Conflict status code
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Insert new contact
        const insertQuery = `
            INSERT INTO contacts (
                user_google_id, 
                name, 
                phone_number, 
                email,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        
        const result = await env.CF_INFOBIP_DB.prepare(insertQuery)
            .bind(user.google_id, name || '', phone_number, email || '')
            .run();
        
        if (result.success) {
            // Get the newly created contact using the last inserted ID
            // D1 uses last_insert_rowid() function, we need to query differently
            const newContactQuery = `
                SELECT id, name, phone_number, email, google_contact_id, created_at, updated_at
                FROM contacts
                WHERE user_google_id = ? AND phone_number = ?
                ORDER BY created_at DESC
                LIMIT 1
            `;

            const newContact = await env.CF_INFOBIP_DB.prepare(newContactQuery)
                .bind(user.google_id, phone_number)
                .first();

            if (!newContact) {
                console.error('Contact was inserted but could not be retrieved');
                // Still return success since the insert worked
                return new Response(JSON.stringify({
                    success: true,
                    message: 'Contact added successfully',
                    contact: null
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({
                success: true,
                message: 'Contact added successfully',
                contact: newContact
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            throw new Error('Failed to insert contact');
        }
        
    } catch (error) {
        console.error('Create contact error:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: 'Failed to create contact',
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});