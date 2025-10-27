# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth for the CF-Infobip Broadcaster application.

## Prerequisites

- A Google Cloud Platform (GCP) account
- A Google Cloud project

## Step 1: Create or Select a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project or select an existing one
4. Note down your Project ID for later reference

## Step 2: Enable Required APIs

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - **Google People API** - For accessing Google Contacts
   - **Google Identity and Access Management (IAM) API** - For user authentication
   - **Google OAuth2 API** - For OAuth 2.0 authentication

## Step 3: Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose **External** for the User Type and click **Create**
3. Fill in the required information:
   - **App name**: CF-Infobip Broadcaster
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **Save and Continue**
5. Add the following scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `https://www.googleapis.com/auth/contacts.readonly`
6. Click **Save and Continue**
7. Add test users (your email address) if in testing mode
8. Click **Save and Continue** and then **Back to Dashboard**

## Step 4: Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click **+ CREATE CREDENTIALS** and select **OAuth client ID**
3. Select **Web application** as the application type
4. Give it a name (e.g., "CF-Infobip Broadcaster Web")
5. Add the following authorized redirect URIs:
   - `https://your-project.pages.dev/functions/auth/google/callback`
   - `http://localhost:8788/functions/auth/google/callback` (for local development)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret** - you'll need these for your application

## Step 5: Configure Environment Variables

Update your `wrangler.toml` file with the Google OAuth credentials:

```toml
[vars]
GOOGLE_CLIENT_ID = "your-google-client-id-here"
GOOGLE_CLIENT_SECRET = "your-google-client-secret-here"
```

Or set them as secrets in Cloudflare:

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

## Step 6: Test the Integration

1. Deploy your application to Cloudflare Pages
2. Navigate to your application URL
3. Click "Sign in with Google"
4. You should be redirected to Google's OAuth consent screen
5. After granting permission, you should be redirected back to your application and logged in

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Ensure the redirect URI in your Google Cloud Console exactly matches the one in your application
   - Check for trailing slashes and protocol (http vs https)

2. **Invalid Client**
   - Verify that the Client ID and Client Secret are correctly configured
   - Make sure you're using the correct credentials for the right environment (production vs development)

3. **Access Blocked**
   - If your app is in testing mode, ensure your email address is added as a test user
   - For production use, submit your app for verification by Google

4. **API Not Enabled**
   - Verify that all required APIs are enabled in your Google Cloud project
   - Check that you're using the correct project ID

### Debugging Tips

- Check the browser console for JavaScript errors
- Review the Cloudflare Functions logs for any error messages
- Use the Google OAuth 2.0 Playground to test your configuration

## Security Considerations

1. Never expose your Client Secret in client-side code
2. Always use HTTPS in production
3. Regularly rotate your Client Secret
4. Limit the scopes to only what's necessary for your application
5. Implement proper session management and token validation

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google People API Documentation](https://developers.google.com/people)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)