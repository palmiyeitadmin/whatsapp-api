# Deployment Guide

This guide will walk you through deploying the CF-Infobip Broadcaster to Cloudflare Pages.

## Prerequisites

- A Cloudflare account
- A GitHub account (for automatic deployments)
- Node.js and npm installed locally
- Wrangler CLI installed (`npm install -g wrangler`)

## Step 1: Set Up Cloudflare D1 Database

1. Log in to your Cloudflare dashboard
2. Navigate to "Workers & Pages" > "D1"
3. Click "Create database"
4. Name your database (e.g., `cf-infobip-db`)
5. Click "Create"

### Initialize the Database

1. Once the database is created, click on it
2. Go to the "Settings" tab and note your Database ID
3. Update your `wrangler.toml` file with the Database ID:
   ```toml
   [[d1_databases]]
   binding = "CF_INFOBIP_DB"
   database_name = "cf-infobip-db"
   database_id = "your-actual-database-id-here"
   ```

4. Run the database migration:
   ```bash
   wrangler d1 execute cf-infobip-db --file=./db/schema.sql
   ```

## Step 2: Set Up Environment Variables and Secrets

### Environment Variables

Update your `wrangler.toml` with the required variables:

```toml
[vars]
INFOBIP_BASE_URL = "https://api.infobip.com"
```

### Secrets

Set up the following secrets using Wrangler:

```bash
# Google OAuth credentials
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

# Infobip API credentials
wrangler secret put INFOBIP_API_KEY

# JWT secret (generate a strong random string)
wrangler secret put JWT_SECRET
```

## Step 3: Create GitHub Repository

1. Create a new repository on GitHub
2. Initialize git in your project directory:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/cf-infobip-broadcaster.git
   git push -u origin main
   ```

## Step 4: Set Up Cloudflare Pages

1. Log in to your Cloudflare dashboard
2. Navigate to "Workers & Pages" > "Create application"
3. Select "Pages" and then "Connect to Git"
4. Choose your GitHub repository
5. Configure the build settings:
   - **Framework preset**: None
   - **Build command**: Leave blank
   - **Build output directory**: `public`
   - **Root directory**: `/`

6. Click "Save and Deploy"

## Step 5: Configure Environment Variables in Cloudflare Dashboard

1. After the initial deployment, go to your Pages project
2. Navigate to "Settings" > "Environment variables"
3. Add the following variables:
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret
   - `INFOBIP_API_KEY`: Your Infobip API key
   - `INFOBIP_BASE_URL`: `https://api.infobip.com`
   - `JWT_SECRET`: Your JWT secret

## Step 6: Bind D1 Database

1. In your Pages project settings, go to "D1 bindings"
2. Click "Add binding"
3. Select your D1 database
4. Set the variable name to `CF_INFOBIP_DB`
5. Click "Add binding"

## Step 7: Configure Custom Domain (Optional)

1. In your Pages project settings, go to "Custom domains"
2. Click "Set up a custom domain"
3. Enter your domain name and follow the DNS configuration instructions

## Step 8: Test the Deployment

1. Visit your Pages URL
2. Click "Sign in with Google"
3. Complete the OAuth flow
4. Verify you're redirected to the dashboard

## Local Development

For local development, you can use Wrangler's local development server:

1. Set up local D1 database:
   ```bash
   wrangler d1 execute cf-infobip-db --local --file=./db/schema.sql
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Your application will be available at `http://localhost:8788`

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify your D1 database binding is correctly configured
   - Check that your database ID in `wrangler.toml` matches the actual database ID

2. **OAuth Redirect Errors**
   - Ensure your Google OAuth redirect URI matches your Pages URL
   - Check that the URI is properly formatted (no trailing slashes)

3. **Environment Variable Issues**
   - Verify all secrets are properly set in the Cloudflare dashboard
   - Check for typos in variable names

4. **Build Failures**
   - Ensure your project structure matches the expected layout
   - Check that all required files are committed to Git

### Debugging Tips

- Use the Cloudflare Dashboard to view function logs
- Check the Network tab in your browser for failed requests
- Use `wrangler pages dev` for local testing with live logs

## Production Considerations

1. **Security**
   - Use strong secrets for all sensitive values
   - Regularly rotate your secrets
   - Enable security headers in your Pages settings

2. **Performance**
   - Monitor your D1 database usage
   - Consider implementing caching for frequently accessed data
   - Use Cloudflare Analytics to monitor performance

3. **Scaling**
   - Monitor your usage limits for D1 and Pages Functions
   - Consider implementing rate limiting for API endpoints
   - Set up alerts for unusual activity

## Maintenance

1. **Regular Updates**
   - Keep dependencies updated
   - Monitor for security advisories
   - Update your Google OAuth configuration as needed

2. **Backups**
   - Regularly export your D1 database data
   - Keep your configuration in version control
   - Document any custom configurations

3. **Monitoring**
   - Set up monitoring for critical functions
   - Monitor error rates and response times
   - Set up alerts for downtime or errors