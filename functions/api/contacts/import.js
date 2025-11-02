// Google Contacts import endpoint with batch processing optimization
// Version: 2.0 - Rebuilt to fix deployment issues
// Handles large contact lists by chunking SQL queries to avoid D1 limits
import { createProtectedRoute } from '../../middleware/auth.js';

class ImportError extends Error {
    constructor(message, status = 500, details = {}) {
        super(message);
        this.name = 'ImportError';
        this.status = status;
        this.details = details;
    }
}

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
            const tokenError = await parseGoogleError(tokenResponse);
            console.error('Google token refresh error:', tokenError);

            const errorMessage = typeof tokenError.message === 'string' ? tokenError.message : '';

            const isExpired = tokenResponse.status === 400 && (
                tokenError.errorCode === 'invalid_grant' ||
                errorMessage.toLowerCase().includes('invalid_grant')
            );

            throw new ImportError(
                isExpired
                    ? 'Your Google session expired. Please sign in again.'
                    : 'Could not refresh Google access token.',
                isExpired ? 409 : 502,
                {
                    googleStatus: tokenResponse.status,
                    googleError: tokenError.message,
                    errorCode: tokenError.errorCode,
                    raw: tokenError.rawBody,
                    reason: isExpired ? 'GOOGLE_REFRESH_TOKEN_EXPIRED' : 'GOOGLE_TOKEN_REFRESH_FAILED'
                }
            );
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

        const isImportError = error instanceof ImportError;
        const status = isImportError ? error.status : 500;
        const meta = isImportError && typeof error.details === 'object' ? error.details : undefined;

        const responseBody = {
            success: false,
            error: isImportError ? error.message : 'Failed to import contacts',
            details: isImportError
                ? (error.details?.googleError || error.details || error.message)
                : error.message
        };

        if (meta) {
            responseBody.meta = meta;
        }

        if (!isImportError) {
            responseBody.stack = error.stack;
        }

        return new Response(JSON.stringify(responseBody), {
            status,
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
            const apiError = await parseGoogleError(contactsResponse);
            console.error('Google People API error:', apiError);

            const status =
                contactsResponse.status === 403 || contactsResponse.status === 401
                    ? 403
                    : 502;

            throw new ImportError(
                contactsResponse.status === 403
                    ? 'Google denied access to contacts. Ensure the People API is enabled and you granted the required scopes.'
                    : 'Failed to fetch contacts from Google.',
                status,
                {
                    googleStatus: contactsResponse.status,
                    googleError: apiError.message,
                    errorCode: apiError.errorCode,
                    raw: apiError.rawBody
                }
            );
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
        // We use chunks of 150 to be extra safe (150 + 1 for userId = 151 << 999)
        const existingContactsMap = new Map();
        const CHECK_BATCH_SIZE = 150; // Very safe limit for IN clause

        console.log(`Processing ${googleContactIds.length} contacts in chunks of ${CHECK_BATCH_SIZE}`);

        for (let i = 0; i < googleContactIds.length; i += CHECK_BATCH_SIZE) {
            const chunk = googleContactIds.slice(i, i + CHECK_BATCH_SIZE);
            const placeholders = chunk.map(() => '?').join(',');
            
            // Verify we don't exceed the limit
            const totalParams = 1 + chunk.length; // 1 for userId + chunk length
            if (totalParams >= 999) {
                throw new Error(`Too many parameters in query: ${totalParams} (max 998)`);
            }

            console.log(`Checking chunk ${Math.floor(i/CHECK_BATCH_SIZE) + 1}: ${chunk.length} contacts`);

            try {
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
            } catch (batchError) {
                console.error(`Batch ${Math.floor(i/CHECK_BATCH_SIZE) + 1} failed:`, batchError);
                throw new Error(`Failed to check existing contacts in batch ${Math.floor(i/CHECK_BATCH_SIZE) + 1}: ${batchError.message}`);
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
        const BATCH_SIZE = 25; // Further reduced for maximum safety
        const totalBatches = Math.ceil(batchStatements.length / BATCH_SIZE);
        
        console.log(`Executing ${batchStatements.length} operations in ${totalBatches} batches of ${BATCH_SIZE}`);
        
        for (let i = 0; i < batchStatements.length; i += BATCH_SIZE) {
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const batch = batchStatements.slice(i, i + BATCH_SIZE);
            
            console.log(`Executing batch ${batchNum}/${totalBatches}: ${batch.length} operations`);
            
            try {
                if (typeof env.CF_INFOBIP_DB.batch === 'function') {
                    await env.CF_INFOBIP_DB.batch(batch);
                } else {
                    for (const statement of batch) {
                        if (typeof statement.run !== 'function') {
                            throw new Error('Database driver does not support batch execution and statement.run() is unavailable.');
                        }
                        await statement.run();
                    }
                }
                console.log(`Batch ${batchNum} completed successfully`);
                
                // Small delay between batches to avoid overwhelming the database
                if (batchNum < totalBatches) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            } catch (batchError) {
                console.error(`Batch ${batchNum} failed:`, batchError);
                throw new Error(`Failed to execute batch ${batchNum}: ${batchError.message}`);
            }
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

async function parseGoogleError(response) {
    const status = response.status;
    const statusText = response.statusText;
    const rawBody = await response.text();
    let parsed;

    try {
        parsed = JSON.parse(rawBody);
    } catch {
        parsed = null;
    }

    const message =
        parsed?.error_description ||
        parsed?.error?.message ||
        parsed?.error ||
        statusText ||
        rawBody;

    const errorCode =
        typeof parsed?.error === 'string'
            ? parsed.error
            : parsed?.error?.status || parsed?.error?.code;

    return {
        status,
        statusText,
        message,
        errorCode,
        rawBody
    };
}
