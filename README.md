# CF-Infobip Broadcaster

A serverless multi-platform messaging application running on Cloudflare Pages with Google Contacts synchronization and support for both WhatsApp and Telegram providers.

## 🚀 Repository

**GitHub Repository**: [https://github.com/palmiyeitadmin/whatsapp-api.git](https://github.com/palmiyeitadmin/whatsapp-api.git)

## ✨ Features

- 🔐 **Google OAuth authentication** - Secure user authentication with Google
- 👥 **Google Contacts synchronization** - Automatic import from Google Contacts
- 📱 **Multi-platform messaging** - Send messages via WhatsApp or Telegram
- ⚡ **Serverless architecture** - Built on Cloudflare Pages
- 🗄️ **D1 database** - Serverless SQLite database
- 📊 **Analytics & reporting** - Comprehensive message tracking
- 🎯 **Campaign management** - Create and manage message campaigns
- 🔍 **Search & filtering** - Advanced contact search capabilities
- 📱 **Responsive design** - Mobile-friendly interface

## 🏗️ Project Structure

```
cf-infobip-broadcaster/
├── 📁 functions/           # Cloudflare Pages functions
│   ├── 📁 auth/           # Authentication endpoints
│   ├── 📁 api/             # API endpoints
│   └── 📁 middleware/      # Reusable middleware
├── 📁 public/             # Static assets
│   ├── 📄 index.html       # Main application
│   ├── 📄 styles.css       # Custom styles
│   └── 📄 app.js          # Frontend logic
├── 📁 tests/              # Test suites
│   ├── 📁 unit/           # Unit tests
│   ├── 📁 e2e/            # E2E tests
│   └── 📁 load/           # Load tests
├── 📁 db/                # Database schema and migrations
├── 📁 docs/               # Documentation
├── 📄 package.json        # Dependencies and scripts
├── 📄 wrangler.toml       # Cloudflare configuration
└── 📄 QUICK_START.md      # Quick start guide
```

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/palmiyeitadmin/whatsapp-api.git
cd whatsapp-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment
```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
# See QUICK_START.md for detailed setup
```

### 4. Start Development
```bash
npm run dev
```

## ⚙️ Environment Variables

Create a `.env` file with:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# WhatsApp Provider (Infobip)
INFOBIP_API_KEY=your-infobip-api-key
INFOBIP_WHATSAPP_SENDER=your-whatsapp-sender
INFOBIP_BASE_URL=https://api.infobip.com

# Telegram Provider
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_API_URL=https://api.telegram.org

# Application
JWT_SECRET=your-jwt-secret
DEBUG=true
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Run load tests
npm run test:load

# Check code quality
npm run lint
```

## 🚀 Deployment

### Staging
```bash
npm run deploy:staging
```

### Production
```bash
npm run deploy:production
```

## 📚 Documentation

- 📖 [Quick Start Guide](QUICK_START.md) - Get started in minutes
- 🏗️ [Project Overview](PROJECT_OVERVIEW.md) - Detailed architecture
- 🔧 [Technical Stack](TECHNICAL_STACK.md) - Technical implementation details
- 🚀 [Production Deployment](docs/production-deployment.md) - Deployment guide
- 🔐 [Google OAuth Setup](docs/google-oauth-setup.md) - OAuth configuration
- 📱 [Infobip Setup](docs/infobip-setup.md) - WhatsApp API setup
- 📱 [Telegram Setup](docs/telegram-setup.md) - Telegram Bot configuration

## 🛠️ Development Scripts

```json
{
  "dev": "Start development server",
  "test": "Run unit tests",
  "test:e2e": "Run E2E tests",
  "test:load": "Run load tests",
  "lint": "Check code quality",
  "deploy:staging": "Deploy to staging",
  "deploy:production": "Deploy to production",
  "db:migrate": "Run database migrations",
  "db:local": "Setup local database"
}
```

## 🔧 Prerequisites

- Node.js 18+
- npm
- Cloudflare account
- Google Cloud account (for OAuth)
- Infobip account (for WhatsApp)
- Telegram account (for Telegram Bot)

## 📞 Support

1. 📖 Check [QUICK_START.md](QUICK_START.md) for troubleshooting
2. 🔍 Review [documentation](docs/) for detailed guides
3. 🐛 [Report issues](https://github.com/palmiyeitadmin/whatsapp-api/issues) on GitHub
4. 💬 [Discussions](https://github.com/palmiyeitadmin/whatsapp-api/discussions) for questions

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for efficient multi-platform bulk messaging**