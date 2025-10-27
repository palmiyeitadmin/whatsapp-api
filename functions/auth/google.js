// Google OAuth initiation endpoint
export async function onRequestGet(context) {
    const { env, request } = context;
    
    // Generate a random state parameter for security
    const state = crypto.randomUUID();
    
    // Store state in a secure cookie (short-lived)
    const stateCookie = `state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`;
    
    // Construct Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${new URL(request.url).origin}/functions/auth/google/callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/contacts.readonly');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    
    // Redirect to Google OAuth
    return Response.redirect(authUrl.toString(), 302, {
        headers: {
            'Set-Cookie': stateCookie
        }
    });
}