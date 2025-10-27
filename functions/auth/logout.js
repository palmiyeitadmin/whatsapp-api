// Logout endpoint
export async function onRequestPost(context) {
    try {
        // Clear session cookie
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
            },
        });
    } catch (error) {
        console.error('Logout error:', error);
        return new Response(JSON.stringify({ error: 'Logout failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}