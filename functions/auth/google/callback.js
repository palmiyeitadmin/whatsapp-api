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
    const storedState = stateCookie ? stateCookie.split('=')[1] : null;
    
    if (!storedState || storedState !== state) {
        return new Response('Invalid state parameter', {
            status: 400,
            headers: { 'Content-Type': 'text/plain' }
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
                redirect_uri: `${new URL(request.url).origin}/functions/auth/google/callback`,
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
        return new Response(null, {
            status: 302,
            headers: {
                'Location': '/',
                'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`,
                'Set-Cookie': `state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`, // Clear state cookie
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