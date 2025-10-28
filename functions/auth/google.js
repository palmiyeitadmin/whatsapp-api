// Google OAuth initiation endpoint
export async function onRequestGet(context) {
    const { env, request } = context;

    // Check if required environment variables are set
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        return new Response(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Configuration Error</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            </head>
            <body class="bg-gray-50 min-h-screen flex items-center justify-center">
                <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                    <div class="text-red-600 mb-4">
                        <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h1 class="text-2xl font-bold text-gray-900 text-center mb-2">Configuration Error</h1>
                    <p class="text-gray-600 text-center mb-4">
                        Google OAuth credentials are not configured. Please set the following environment variables in Cloudflare Pages:
                    </p>
                    <ul class="list-disc list-inside text-sm text-gray-700 mb-4">
                        <li>GOOGLE_CLIENT_ID</li>
                        <li>GOOGLE_CLIENT_SECRET</li>
                    </ul>
                    <div class="text-center">
                        <a href="/" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
                            Go Back
                        </a>
                    </div>
                </div>
            </body>
            </html>
        `, {
            status: 500,
            headers: { 'Content-Type': 'text/html' }
        });
    }

    // Generate a random state parameter for security
    const state = crypto.randomUUID();
    
    // Store state in a secure cookie (short-lived)
    const stateCookie = `state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`;
    
    // Construct Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${new URL(request.url).origin}/auth/google/callback`);
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