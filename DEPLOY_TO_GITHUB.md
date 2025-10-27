# Deploy to GitHub Instructions

This guide will help you push the CF-Infobip Broadcaster project to GitHub.

## 🚀 Quick Deploy

### Method 1: Using the Deployment Script (Recommended)

#### For Windows:
```bash
# Run the Windows deployment script
npm run git:push:windows
```

#### For Linux/Mac:
```bash
# Run the Unix/Linux deployment script
npm run git:push
```

This will:
- ✅ Initialize Git repository (if needed)
- ✅ Add all files to staging
- ✅ Commit with detailed message
- ✅ Push to GitHub repository

### Method 2: Manual Git Commands

```bash
# Initialize Git (if not already done)
git init

# Add remote repository
git remote add origin https://github.com/palmiyeitadmin/whatsapp-api.git

# Add all files
git add .

# Commit changes
git commit -m "feat: Complete CF-Infobip Broadcaster implementation"

# Push to GitHub
git push -u origin main
```

## 📁 Project Structure Being Deployed

The following files will be pushed to GitHub:

### Core Application
- `public/` - Frontend application
- `functions/` - Cloudflare Functions backend
- `db/` - Database schema and migrations

### Configuration
- `wrangler.toml` - Cloudflare configuration
- `package.json` - Dependencies and scripts

### Documentation
- `README.md` - Project overview and setup
- `QUICK_START.md` - Quick start guide
- `docs/` - Detailed documentation

### Testing
- `tests/` - Complete test suite
- `vitest.config.js` - Unit test configuration
- `playwright.config.js` - E2E test configuration

### Deployment
- `scripts/deploy.sh` - Deployment automation script

## 🔧 Before You Push

### 1. Review Configuration
```bash
# Check wrangler.toml
cat wrangler.toml

# Check package.json
cat package.json
```

### 2. Run Tests (Optional but Recommended)
```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run E2E tests (if you have Playwright installed)
npm run test:e2e
```

### 3. Check Environment Variables
Make sure your `.env` file is properly configured but NOT committed to Git:
```bash
# Ensure .env is in .gitignore
cat .gitignore | grep .env

# Should see: .env
```

## 🌐 Repository Details

- **Repository**: https://github.com/palmiyeitadmin/whatsapp-api.git
- **Main Branch**: `main`
- **Visibility**: Public repository

## 📊 What Gets Deployed

### Features Included
- ✅ Complete Google OAuth authentication system
- ✅ Google Contacts synchronization
- ✅ Infobip WhatsApp messaging integration
- ✅ Campaign management system
- ✅ Message analytics and logging
- ✅ Responsive frontend interface
- ✅ Complete testing framework
- ✅ Production deployment configuration

### Documentation
- 📖 README with setup instructions
- 📚 Technical stack documentation
- 🚀 Deployment guides
- 🔧 Quick start guide

### Testing
- 🧪 Unit tests with Vitest
- 🎭 E2E tests with Playwright
- ⚡ Load tests with k6
- 🔍 Code quality checks with ESLint

## 🎯 After Deployment

### 1. Clone the Repository
```bash
git clone https://github.com/palmiyeitadmin/whatsapp-api.git
cd whatsapp-api
```

### 2. Set Up Environment
```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials
```

### 3. Deploy to Cloudflare
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## 🔍 Troubleshooting

### Git Push Fails
```bash
# Check if remote is configured
git remote -v

# Check current branch
git branch

# Force push if needed (use with caution)
git push -f origin main
```

### Authentication Issues
Make sure your `.env` file has:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `INFOBIP_API_KEY`
- `INFOBIP_WHATSAPP_SENDER`
- `JWT_SECRET`

### Large Repository
If the push fails due to large files:
```bash
# Check file sizes
du -sh *

# Remove unnecessary large files
rm -rf node_modules
rm -rf .git
```

## 📞 Support

If you encounter issues:

1. **Check the deployment script**: `scripts/deploy.sh`
2. **Review Git configuration**: Make sure remote is correct
3. **Check GitHub permissions**: Ensure you have push access
4. **Review file sizes**: Large files may cause issues

## 🎉 Success Indicators

You'll know the deployment was successful when you see:
- `✅ Deployment completed successfully!`
- Repository URL: https://github.com/palmiyeitadmin/whatsapp-api.git
- All files committed and pushed

## 📈 Next Steps After GitHub Deploy

1. **Set up Cloudflare Pages** with GitHub integration
2. **Configure environment variables** in Cloudflare dashboard
3. **Set up D1 database** and apply schema
4. **Configure OAuth credentials** (Google and Infobip)
5. **Test the application** in staging environment
6. **Deploy to production** when ready

---

**Ready to deploy! 🚀**