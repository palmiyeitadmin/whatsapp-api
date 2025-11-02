// Google OAuth callback endpoint
export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    
    // Get authorization code and state from query parameters
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
        return new Response(`OAuth Error: ${error}`, {
            status: 400,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
    
    if (!code || !state) {
        return new Response('Missing required parameters', {
            status: 400,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
    
    // Basic state validation - just check it exists and is a valid UUID format
    // Note: We rely on Google OAuth to maintain state integrity during the redirect
    // A more sophisticated implementation would store state server-side (KV/D1)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!state || !uuidRegex.test(state)) {
        return new Response(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Authentication Error</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            </head>
            <body class="bg-gray-50 min-h-screen flex items-center justify-center">
                <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                    <div class="text-red-600 mb-4">
                        <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h1 class="text-2xl font-bold text-gray-900 text-center mb-2">Authentication Error</h1>
                    <p class="text-gray-600 text-center mb-4">
                        Invalid or missing state parameter. Please try signing in again.
                    </p>
                    <div class="text-center">
                        <a href="/" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
                            Try Again
                        </a>
                    </div>
                </div>
            </body>
            </html>
        `, {
            status: 400,
            headers: { 'Content-Type': 'text/html' }
        });
    }

    // Check required environment variables
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.JWT_SECRET) {
        console.error('Missing environment variables:', {
            hasClientId: !!env.GOOGLE_CLIENT_ID,
            hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
            hasJwtSecret: !!env.JWT_SECRET
        });
        return new Response('Server configuration error. Please contact administrator.', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    try {
        // Exchange authorization code for tokens
        const redirectUri = `${new URL(request.url).origin}/auth/google/callback`;

        console.log('Token exchange attempt:', {
            redirectUri,
            hasCode: !!code,
            hasClientId: !!env.GOOGLE_CLIENT_ID,
            hasClientSecret: !!env.GOOGLE_CLIENT_SECRET
        });

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: env.GOOGLE_CLIENT_ID,
                client_secret: env.GOOGLE_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Google token exchange error:', {
                status: tokenResponse.status,
                statusText: tokenResponse.statusText,
                error: errorData
            });
            throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorData}`);
        }
        
        const tokenData = await tokenResponse.json();
        const { access_token, refresh_token } = tokenData;
        
        // Get user information from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });
        
        if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user information');
        }
        
        const userData = await userInfoResponse.json();
        const { id, email, name } = userData;
        
        // Store or update user in database
        await env.CF_INFOBIP_DB.prepare(`
            INSERT OR REPLACE INTO users (google_id, email, name, google_refresh_token, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(id, email, name, refresh_token).run();
        
        // Create JWT session
        const sessionToken = await createSessionToken(id, email, env.JWT_SECRET);

        // Set session cookie and redirect to dashboard using HTTP redirect
        const baseUrl = new URL(request.url).origin;
        return new Response(null, {
            status: 302,
            headers: {
                'Location': baseUrl + '/',
                'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`,
            },
        });
        
    } catch (error) {
        console.error('OAuth callback error:', error);
        console.error('Error stack:', error.stack);

        return new Response(JSON.stringify({
            error: 'Authentication failed',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Create JWT session token
async function createSessionToken(userId, email, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        sub: userId,
        email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    // Base64URL encode (remove padding and make URL-safe)
    const base64url = (str) => {
        return btoa(str)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    };

    const tokenParts = [
        base64url(JSON.stringify(header)),
        base64url(JSON.stringify(payload)),
    ];

    const tokenData = tokenParts.join('.');
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(tokenData)
    );

    const signatureBase64 = base64url(String.fromCharCode(...new Uint8Array(signature)));

    return `${tokenData}.${signatureBase64}`;
}