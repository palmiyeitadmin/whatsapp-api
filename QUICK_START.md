# Quick Start Guide

## 🚀 Getting Started

This guide will help you get the CF-Infobip Broadcaster running locally in minutes.

## Prerequisites

- Node.js 18+ and npm
- Git
- Cloudflare account
- Google Cloud account (for OAuth)
- Infobip account (for WhatsApp)

## 📦 Installation

### 1. Clone and Install
```bash
# Clone the repository
git clone <your-repo-url>
cd cf-infobip-broadcaster

# Install dependencies
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
# You'll need:
# - Google OAuth credentials
# - Infobip API credentials
# - JWT secret
```

### 3. Database Setup
```bash
# Create local database
wrangler d1 execute CF_INFOBIP_DB --local --file=./db/schema.sql

# Or use the npm script
npm run db:local
```

### 4. Start Development Server
```bash
# Start the development server
npm run dev

# Application will be available at http://localhost:8788
```

## 🔧 Configuration

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google People API
4. Create OAuth 2.0 Client ID
5. Add redirect URI: `http://localhost:8788/auth/google/callback`
6. Copy Client ID and Client Secret

### Infobip Setup
1. Go to [Infobip Dashboard](https://portal.infobip.com/)
2. Set up WhatsApp Business API
3. Get your API key and sender number
4. Configure in your environment

### Environment Variables
Create a `.env` file with:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
INFOBIP_API_KEY=your-infobip-api-key
INFOBIP_WHATSAPP_SENDER=your-whatsapp-sender
JWT_SECRET=your-jwt-secret
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Run load tests
npm run test:load

# Run with coverage
npm run test:coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 🚀 Deployment

### Staging
```bash
# Deploy to staging
npm run deploy:staging
```

### Production
```bash
# Deploy to production
npm run deploy:production
```

## 🔍 Troubleshooting

### Common Issues

#### npm install fails with k6 version
**Problem**: `npm error notarget No matching version found for k6@^0.47.0`

**Solution**: The k6 package version was incorrect. Try:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Database connection issues
**Problem**: D1 database connection fails

**Solution**: Check your wrangler.toml configuration:
```toml
[[d1_databases]]
binding = "CF_INFOBIP_DB"
database_name = "cf-infobip-db"
database_id = "your-actual-database-id"
```

#### OAuth redirect issues
**Problem**: Google OAuth redirect fails

**Solution**: Ensure redirect URI matches exactly:
- In Google Console: `http://localhost:8788/auth/google/callback`
- No trailing slashes
- Exact protocol (http vs https)

#### Environment variables not loading
**Problem**: Environment variables undefined

**Solution**: Check `.env` file format and ensure it's not in `.gitignore`:
```bash
# Verify .env exists
ls -la .env

# Check .gitignore
cat .gitignore | grep .env
```

### Getting Help

1. **Check logs**: Look at console output for error details
2. **Review documentation**: Check `docs/` folder for detailed guides
3. **Test components**: Use unit tests to isolate issues
4. **Check environment**: Verify all required variables are set

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=true
```

This will provide additional logging output for troubleshooting.

## 📚 Next Steps

1. **Configure OAuth**: Set up Google OAuth credentials
2. **Configure Infobip**: Set up WhatsApp Business API
3. **Test locally**: Run the application and test features
4. **Deploy to staging**: Test in staging environment
5. **Deploy to production**: Go live with your application

## 📞 Support

If you encounter issues:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review the [documentation](docs/)
3. Check [GitHub Issues](../../issues) for known problems
4. Create a new issue if needed

Happy coding! 🚀
