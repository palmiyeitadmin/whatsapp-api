// Authentication status endpoint
export async function onRequestGet(context) {
    const { env, request } = context;
    
    try {
        // Get session token from cookies
        const cookies = request.headers.get('Cookie') || '';
        const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='));
        const sessionToken = sessionCookie ? sessionCookie.split('=')[1] : null;
        
        if (!sessionToken) {
            return new Response(JSON.stringify({ authenticated: false }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Verify JWT token
        const payload = await verifyJWT(sessionToken, env.JWT_SECRET);
        
        if (!payload) {
            return new Response(JSON.stringify({ authenticated: false }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Get user information from database
        const userResult = await env.CF_INFOBIP_DB.prepare(`
            SELECT google_id, email, name, created_at FROM users WHERE google_id = ?
        `).bind(payload.sub).first();
        
        if (!userResult) {
            return new Response(JSON.stringify({ authenticated: false }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return new Response(JSON.stringify({
            authenticated: true,
            user: userResult
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
        
    } catch (error) {
        console.error('Auth status error:', error);
        return new Response(JSON.stringify({ authenticated: false }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// Verify JWT token
async function verifyJWT(token, secret) {
    try {
        const [headerB64, payloadB64, signatureB64] = token.split('.');

        if (!headerB64 || !payloadB64 || !signatureB64) {
            return null;
        }

        // Base64URL decode helper
        const base64urlDecode = (str) => {
            // Add padding if needed
            let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) {
                base64 += '=';
            }
            return atob(base64);
        };

        // Verify signature
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const tokenData = `${headerB64}.${payloadB64}`;
        const signature = Uint8Array.from(base64urlDecode(signatureB64), c => c.charCodeAt(0));
        
        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signature,
            encoder.encode(tokenData)
        );
        
        if (!isValid) {
            return null;
        }
        
        // Decode payload
        const payload = JSON.parse(base64urlDecode(payloadB64));
        
        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return null;
        }
        
        return payload;
    } catch (error) {
        console.error('JWT verification error:', error);
        return null;
    }
}