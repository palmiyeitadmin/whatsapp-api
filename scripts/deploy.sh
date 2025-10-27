#!/bin/bash

# CF-Infobip Broadcaster Deployment Script
# This script helps deploy the project to GitHub

set -e

echo "🚀 Starting CF-Infobip Broadcaster deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing Git repository...${NC}"
    git init
    git add .
    git commit -m "Initial commit: CF-Infobip Broadcaster implementation"
fi

# Check if remote is configured
if ! git remote get-url origin > /dev/null 2>&1; then
    echo -e "${YELLOW}Adding GitHub remote...${NC}"
    git remote add origin https://github.com/palmiyeitadmin/whatsapp-api.git
fi

# Stage all files
echo -e "${GREEN}Staging files...${NC}"
git add .

# Commit changes
echo -e "${GREEN}Committing changes...${NC}"
git commit -m "feat: Complete CF-Infobip Broadcaster implementation

- ✅ Complete project structure with proper organization
- ✅ Cloudflare Pages configuration with D1 database binding
- ✅ Google OAuth 2.0 implementation with CSRF protection
- ✅ JWT-based session management with secure cookies
- ✅ Google Contacts synchronization with pagination and search
- ✅ Infobip WhatsApp messaging integration
- ✅ Modern responsive frontend with contact management
- ✅ Campaign management and analytics functionality
- ✅ Complete testing framework (unit, E2E, load tests)
- ✅ Production deployment with monitoring and logging
- ✅ Comprehensive documentation and quick start guide

Features:
- 🔐 Google OAuth authentication
- 👥 Google Contacts import
- 📱 WhatsApp bulk messaging
- 📊 Campaign management
- 📈 Analytics and reporting
- 🧪 Complete test suite
- 🚀 Production deployment

Technical Stack:
- Frontend: Vanilla JavaScript, HTML5, Tailwind CSS
- Backend: Cloudflare Functions (JavaScript)
- Database: Cloudflare D1 (SQLite)
- Authentication: Google OAuth 2.0 with JWT
- APIs: Google People API, Infobip WhatsApp API
- Testing: Vitest, Playwright, k6
- Deployment: Wrangler CLI with multi-environment support

🎯 Ready for production deployment!"

# Push to GitHub
echo -e "${GREEN}Pushing to GitHub...${NC}"
git push -u origin main

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${YELLOW}Repository: https://github.com/palmiyeitadmin/whatsapp-api.git${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Configure environment variables in Cloudflare dashboard"
echo -e "2. Set up Google OAuth credentials"
echo -e "3. Configure Infobip WhatsApp API"
echo -e "4. Deploy to Cloudflare Pages"
echo -e ""
echo -e "${GREEN}📚 Documentation:${NC}"
echo -e "- Quick Start: QUICK_START.md"
echo -e "- Technical Stack: TECHNICAL_STACK.md"
echo -e "- Production Deployment: docs/production-deployment.md"