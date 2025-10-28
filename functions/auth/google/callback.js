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
    
    // Verify state parameter to prevent CSRF attacks
    const cookies = request.headers.get('Cookie') || '';
    const stateCookie = cookies.split(';').find(c => c.trim().startsWith('state='));
    const storedState = stateCookie ? stateCookie.split('=')[1].trim() : null;

    if (!storedState || storedState !== state) {
        // More detailed error for debugging
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
                        Invalid state parameter. This could be due to:
                    </p>
                    <ul class="list-disc list-inside text-sm text-gray-700 mb-4">
                        <li>Session expired (try again)</li>
                        <li>Browser cookies blocked</li>
                        <li>Cross-site request forgery protection</li>
                    </ul>
                    <div class="text-center">
                        <a href="/" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
                            Try Again
                        </a>
                    </div>
                    <details class="mt-4 text-xs text-gray-500">
                        <summary class="cursor-pointer">Debug Info</summary>
                        <pre class="mt-2 p-2 bg-gray-100 rounded overflow-auto">Expected: ${state}
Received: ${storedState || 'null'}
Cookies: ${cookies.substring(0, 200)}</pre>
                    </details>
                </div>
            </body>
            </html>
        `, {
            status: 400,
            headers: { 'Content-Type': 'text/html' }
        });
    }
    
    try {
        // Exchange authorization code for tokens
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
                redirect_uri: `${new URL(request.url).origin}/auth/google/callback`,
            }),
        });
        
        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            throw new Error(`Token exchange failed: ${errorData}`);
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
        
        // Set session cookie and redirect to dashboard
        const baseUrl = new URL(request.url).origin;
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta http-equiv="refresh" content="0; url=${baseUrl}/">
                <script>window.location.href = '${baseUrl}/';</script>
            </head>
            <body>
                <p>Redirecting...</p>
            </body>
            </html>
        `, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
                'Set-Cookie': [
                    `session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`,
                    `state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/` // Clear state cookie
                ],
            },
        });
        
    } catch (error) {
        console.error('OAuth callback error:', error);
        return new Response(`Authentication error: ${error.message}`, {
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
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
    
    const tokenParts = [
        btoa(JSON.stringify(header)),
        btoa(JSON.stringify(payload)),
    ];
    
    const tokenData = tokenParts.join('.');
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(tokenData)
    );
    
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    return `${tokenData}.${signatureBase64}`;
}