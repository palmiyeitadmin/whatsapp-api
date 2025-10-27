// Authentication middleware for protecting routes
export async function withAuth(request, env) {
    // Get session token from cookies
    const cookies = request.headers.get('Cookie') || '';
    const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='));
    const sessionToken = sessionCookie ? sessionCookie.split('=')[1] : null;
    
    if (!sessionToken) {
        return {
            authenticated: false,
            error: 'No session token found'
        };
    }
    
    // Verify JWT token
    const payload = await verifyJWT(sessionToken, env.JWT_SECRET);
    
    if (!payload) {
        return {
            authenticated: false,
            error: 'Invalid or expired token'
        };
    }
    
    // Get user information from database
    const user = await env.CF_INFOBIP_DB.prepare(`
        SELECT google_id, email, name, google_refresh_token, created_at FROM users WHERE google_id = ?
    `).bind(payload.sub).first();
    
    if (!user) {
        return {
            authenticated: false,
            error: 'User not found'
        };
    }
    
    return {
        authenticated: true,
        user
    };
}

// Verify JWT token
async function verifyJWT(token, secret) {
    try {
        const [headerB64, payloadB64, signatureB64] = token.split('.');
        
        if (!headerB64 || !payloadB64 || !signatureB64) {
            return null;
        }
        
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
        const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
        
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
        const payload = JSON.parse(atob(payloadB64));
        
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

// Helper function to create protected route handlers
export function createProtectedRoute(handler) {
    return async function(context) {
        const { env, request } = context;
        
        // Check authentication
        const authResult = await withAuth(request, env);
        
        if (!authResult.authenticated) {
            return new Response(JSON.stringify({ 
                error: 'Authentication required',
                message: authResult.error
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Add user to context and call the original handler
        return await handler({
            ...context,
            user: authResult.user
        });
    };
}