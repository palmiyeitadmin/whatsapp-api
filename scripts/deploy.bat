@echo off
REM CF-Infobip Broadcaster Deployment Script for Windows
REM This script helps deploy the project to GitHub

echo 🚀 Starting CF-Infobip Broadcaster deployment...

REM Check if git is initialized
if not exist ".git" (
    echo %YELLOW%Initializing Git repository...%NC%
    git init
    git config core.autocrlf false
    git add .
    git commit -m "Initial commit: CF-Infobip Broadcaster implementation"
)

REM Check if remote is configured
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%Adding GitHub remote...%NC%
    git remote add origin https://github.com/palmiyeitadmin/whatsapp-api.git
)

REM Stage all files
echo %GREEN%Staging files...%NC%
git add .

REM Commit changes
echo %GREEN%Committing changes...%NC%
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

REM Set up main branch (fix for Git push issue)
echo %YELLOW%Setting up main branch...%NC%
git branch -M main

REM Push to GitHub
echo %GREEN%Pushing to GitHub...%NC%
git push -u origin main

echo %GREEN%✅ Deployment completed successfully!%NC%
echo %YELLOW%Repository: https://github.com/palmiyeitadmin/whatsapp-api.git%NC%
echo %YELLOW%Next steps:%NC%
echo 1. Configure environment variables in Cloudflare dashboard
echo 2. Set up Google OAuth credentials
echo 3. Configure Infobip WhatsApp API
echo 4. Deploy to Cloudflare Pages
echo.
echo %GREEN%📚 Documentation:%NC%
echo - Quick Start: QUICK_START.md
echo - Technical Stack: TECHNICAL_STACK.md
echo - Production Deployment: docs/production-deployment.md

pause