// Debug endpoint to check environment variables (REMOVE IN PRODUCTION!)
export async function onRequestGet(context) {
    const { env } = context;

    // Only show if secrets exist, not values
    const envCheck = {
        GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ? `Set (${env.GOOGLE_CLIENT_ID.substring(0, 10)}...)` : 'NOT SET',
        GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ? `Set (${env.GOOGLE_CLIENT_SECRET.length} chars)` : 'NOT SET',
        JWT_SECRET: env.JWT_SECRET ? `Set (${env.JWT_SECRET.length} chars)` : 'NOT SET',
        INFOBIP_API_KEY: env.INFOBIP_API_KEY ? 'Set (hidden)' : 'NOT SET',
        INFOBIP_BASE_URL: env.INFOBIP_BASE_URL ? env.INFOBIP_BASE_URL : 'NOT SET',
        INFOBIP_WHATSAPP_SENDER: env.INFOBIP_WHATSAPP_SENDER ? env.INFOBIP_WHATSAPP_SENDER : 'NOT SET',
        CF_INFOBIP_DB: env.CF_INFOBIP_DB ? 'Database binding OK' : 'NOT SET',
    };

    return new Response(JSON.stringify(envCheck, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}
