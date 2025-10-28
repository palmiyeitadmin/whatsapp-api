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
        
        // Basic phone number validation - adjust as needed for your use case
        // At minimum, check that it's not empty and has some digits
        if (!/\d/.test(phone_number)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid phone number format'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
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
            // Get the newly created contact
            const newContactQuery = `
                SELECT id, name, phone_number, email, google_contact_id, created_at, updated_at
                FROM contacts
                WHERE rowid = ?
            `;
            
            const newContact = await env.CF_INFOBIP_DB.prepare(newContactQuery)
                .bind(result.lastInsertRowid)
                .first();
            
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