// Google Contacts import endpoint with batch processing optimization
// Version: 2.0 - Rebuilt to fix deployment issues
// Handles large contact lists by chunking SQL queries to avoid D1 limits
import { createProtectedRoute } from '../../middleware/auth.js';

export const onRequestPost = createProtectedRoute(async function(context) {
    const { env, user } = context;

    try {
        // Check if user has refresh token
        if (!user.google_refresh_token) {
            return new Response(JSON.stringify({
                error: 'No refresh token available. Please re-authenticate with Google.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Get new access token using refresh token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: env.GOOGLE_CLIENT_ID,
                client_secret: env.GOOGLE_CLIENT_SECRET,
                refresh_token: user.google_refresh_token,
                grant_type: 'refresh_token',
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            throw new Error(`Token refresh failed: ${errorData}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Import contacts with pagination
        const importResult = await importContactsFromGoogle(accessToken, user.google_id, env);

        return new Response(JSON.stringify({
            success: true,
            imported: importResult.imported,
            updated: importResult.updated,
            total: importResult.total
        }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Contacts import error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to import contacts',
            details: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});

async function importContactsFromGoogle(accessToken, userId, env) {
    let imported = 0;
    let updated = 0;
    let total = 0;
    let pageToken = null;

    do {
        // Build request URL with pagination
        let url = 'https://people.googleapis.com/v1/people/me/connections?' +
            'personFields=names,emailAddresses,phoneNumbers&' +
            'pageSize=1000';

        if (pageToken) {
            url += `&pageToken=${pageToken}`;
        }

        // Fetch contacts from Google People API
        const contactsResponse = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
            },
        });

        if (!contactsResponse.ok) {
            throw new Error(`Google API error: ${contactsResponse.statusText}`);
        }

        const data = await contactsResponse.json();
        const contacts = data.connections || [];
        total += contacts.length;

        // Parse all contacts
        const parsedContacts = contacts
            .map(contact => parseGoogleContact(contact))
            .filter(contact => contact.phoneNumber);

        if (parsedContacts.length === 0) continue;

        // Get all google_contact_ids for this batch
        const googleContactIds = parsedContacts.map(c => c.googleContactId);

        // CRITICAL: Check existing contacts in chunks to avoid SQL variable limit (999)
        // SQLite has a limit of 999 parameters per query
        // We use chunks of 400 to be safe
        const existingContactsMap = new Map();
        const CHECK_BATCH_SIZE = 400; // Safe limit for IN clause (well below 999)

        for (let i = 0; i < googleContactIds.length; i += CHECK_BATCH_SIZE) {
            const chunk = googleContactIds.slice(i, i + CHECK_BATCH_SIZE);
            const placeholders = chunk.map(() => '?').join(',');

            const existingContactsResult = await env.CF_INFOBIP_DB.prepare(`
                SELECT id, google_contact_id
                FROM contacts
                WHERE user_google_id = ? AND google_contact_id IN (${placeholders})
            `).bind(userId, ...chunk).all();

            if (existingContactsResult.results) {
                existingContactsResult.results.forEach(row => {
                    existingContactsMap.set(row.google_contact_id, row.id);
                });
            }
        }

        // Prepare batch operations
        const batchStatements = [];

        for (const contactData of parsedContacts) {
            const existingId = existingContactsMap.get(contactData.googleContactId);

            if (existingId) {
                // Update existing contact
                batchStatements.push(
                    env.CF_INFOBIP_DB.prepare(`
                        UPDATE contacts
                        SET name = ?, phone_number = ?, email = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).bind(
                        contactData.name,
                        contactData.phoneNumber,
                        contactData.email,
                        existingId
                    )
                );
                updated++;
            } else {
                // Insert new contact
                batchStatements.push(
                    env.CF_INFOBIP_DB.prepare(`
                        INSERT INTO contacts (user_google_id, name, phone_number, email, google_contact_id)
                        VALUES (?, ?, ?, ?, ?)
                    `).bind(
                        userId,
                        contactData.name,
                        contactData.phoneNumber,
                        contactData.email,
                        contactData.googleContactId
                    )
                );
                imported++;
            }
        }

        // Execute batch (max 100 statements per batch in D1)
        const BATCH_SIZE = 100;
        for (let i = 0; i < batchStatements.length; i += BATCH_SIZE) {
            const batch = batchStatements.slice(i, i + BATCH_SIZE);
            await env.CF_INFOBIP_DB.batch(batch);
        }

        // Get next page token
        pageToken = data.nextPageToken;

        // Add delay to avoid rate limiting
        if (pageToken) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

    } while (pageToken);

    return { imported, updated, total };
}

function parseGoogleContact(contact) {
    const result = {
        name: '',
        phoneNumber: '',
        email: '',
        googleContactId: contact.resourceName
    };

    // Extract name
    if (contact.names && contact.names.length > 0) {
        const primaryName = contact.names.find(name => name.metadata.primary) || contact.names[0];
        result.name = primaryName.displayName || '';
    }

    // Extract phone number
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        const primaryPhone = contact.phoneNumbers.find(phone => phone.metadata.primary) || contact.phoneNumbers[0];
        result.phoneNumber = primaryPhone.canonicalForm || primaryPhone.value || '';
    }

    // Extract email
    if (contact.emailAddresses && contact.emailAddresses.length > 0) {
        const primaryEmail = contact.emailAddresses.find(email => email.metadata.primary) || contact.emailAddresses[0];
        result.email = primaryEmail.value || '';
    }

    return result;
}
