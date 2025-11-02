# Telegram Integration Plan - CF-Infobip Broadcaster

## 🎯 Project Goal

Add **Telegram messaging support** to the existing WhatsApp bulk messaging project. The project will **not break any existing WhatsApp functionality**, and will allow users to choose between WhatsApp or Telegram as their messaging platform.

---

## 📊 Current State Analysis

### Project Structure:
- **Frontend**: Vanilla JavaScript + Tailwind CSS
- **Backend**: Cloudflare Pages Functions (Serverless)
- **Database**: Cloudflare D1 (SQLite)
- **Current Provider**: Infobip WhatsApp API
- **Architecture**: Clean, modular, serverless

### Strengths:
✅ **Provider-agnostic UI** - No WhatsApp branding, generic design
✅ **Modular code structure** - Easily extensible
✅ **Clean API design** - RESTful endpoints
✅ **Generic database schema** - Most tables are provider-independent
✅ **Serverless architecture** - Unlimited scalability

### Integration Points:
🔍 **Backend**: `functions/api/message/send.js` - Main message sending function
🔍 **Frontend**: `public/app.js` (lines 252-360) - Message composition and preview
🔍 **Database**: `db/schema.sql` - Additional columns needed for provider info
🔍 **Config**: `wrangler.toml` - Telegram API credentials

---

## 🏗️ ARCHITECTURAL APPROACH

### Strategy: **Multi-Provider Architecture**

Instead of replacing WhatsApp, we'll add **multi-provider support**:

```
                    ┌─────────────────┐
                    │  User Frontend  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Provider Choice │
                    │ (WhatsApp/Telegram)│
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Send API      │
                    │ /api/message/send│
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Provider Router │
                    │  (Abstraction)  │
                    └────┬────────┬───┘
                         │        │
              ┌──────────▼─┐  ┌──▼───────────┐
              │  WhatsApp  │  │   Telegram   │
              │  Provider  │  │   Provider   │
              └────────────┘  └──────────────┘
```

---

## 📝 DETAILED IMPLEMENTATION PLAN

### **PHASE 1: Database Updates** (Priority: HIGH)

#### 1.1. Database Schema Changes

**File**: `db/schema.sql`

**Change 1**: Add Telegram support to `contacts` table
```sql
-- Lines 13-24
ALTER TABLE contacts ADD COLUMN telegram_id TEXT;
ALTER TABLE contacts ADD COLUMN telegram_username TEXT;
ALTER TABLE contacts ADD COLUMN preferred_provider TEXT DEFAULT 'whatsapp';
```

**Change 2**: Make `message_logs` provider-agnostic
```sql
-- Lines 54-68
ALTER TABLE message_logs ADD COLUMN provider TEXT DEFAULT 'whatsapp';
ALTER TABLE message_logs RENAME COLUMN infobip_message_id TO provider_message_id;
```

**Change 3**: Update `campaign_recipients` table
```sql
-- Lines 39-52
ALTER TABLE campaign_recipients ADD COLUMN provider TEXT DEFAULT 'whatsapp';
```

**New Migration File**: `db/migrations/001_add_telegram_support.sql`
```sql
-- Migration: Add Telegram Provider Support
-- Date: 2025-11-02

-- Add Telegram support to contacts table
ALTER TABLE contacts ADD COLUMN telegram_id TEXT;
ALTER TABLE contacts ADD COLUMN telegram_username TEXT;
ALTER TABLE contacts ADD COLUMN preferred_provider TEXT DEFAULT 'whatsapp' CHECK(preferred_provider IN ('whatsapp', 'telegram'));

-- Make message_logs provider-agnostic
ALTER TABLE message_logs ADD COLUMN provider TEXT DEFAULT 'whatsapp' CHECK(provider IN ('whatsapp', 'telegram'));

-- Note: SQLite doesn't support ALTER COLUMN RENAME, so we'll handle infobip_message_id → provider_message_id in app logic

-- Add provider to campaign_recipients
ALTER TABLE campaign_recipients ADD COLUMN provider TEXT DEFAULT 'whatsapp' CHECK(provider IN ('whatsapp', 'telegram'));

-- Create index for efficient provider queries
CREATE INDEX idx_contacts_telegram_id ON contacts(telegram_id);
CREATE INDEX idx_message_logs_provider ON message_logs(provider);
CREATE INDEX idx_campaign_recipients_provider ON campaign_recipients(provider);
```

---

### **PHASE 2: Backend - Provider Abstraction Layer** (Priority: HIGH)

#### 2.1. Telegram API Integration Module

**New File**: `functions/lib/telegram.js`

```javascript
/**
 * Telegram Bot API Integration
 * Handles message sending via Telegram Bot API
 */

/**
 * Send a message via Telegram Bot API
 * @param {string} chatId - Telegram chat ID (numeric or @username)
 * @param {string} message - Message text content
 * @param {string} botToken - Telegram Bot Token from BotFather
 * @param {string} apiUrl - Telegram API base URL
 * @returns {Promise<object>} Result object with messageId, status, and response
 */
export async function sendTelegramMessage(chatId, message, botToken, apiUrl = 'https://api.telegram.org') {
    const url = `${apiUrl}/bot${botToken}/sendMessage`;

    const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML' // Support for basic HTML formatting
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Telegram API error: ${response.status} - ${errorData.description || 'Unknown error'}`);
        }

        const data = await response.json();

        if (!data.ok) {
            throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
        }

        return {
            messageId: data.result.message_id.toString(),
            status: 'sent',
            response: data
        };
    } catch (error) {
        console.error('Telegram send error:', error);
        throw error;
    }
}

/**
 * Validate and format Telegram chat identifier
 * @param {string|number} identifier - Chat ID or username
 * @returns {string|number|null} Formatted identifier or null if invalid
 */
export function formatTelegramIdentifier(identifier) {
    if (!identifier) return null;

    // Numeric chat ID
    if (typeof identifier === 'number') return identifier;

    // String chat ID (convert to number)
    if (typeof identifier === 'string') {
        // Username format: @username
        if (identifier.startsWith('@')) {
            return identifier;
        }

        // Numeric string: convert to number
        const parsed = parseInt(identifier, 10);
        if (!isNaN(parsed)) return parsed;
    }

    return null; // Invalid identifier
}

/**
 * Send messages to multiple Telegram chats in batches
 * @param {Array} contacts - Array of contact objects with telegram_id
 * @param {string} message - Message content
 * @param {string} botToken - Telegram Bot Token
 * @param {string} apiUrl - Telegram API base URL
 * @param {string} userGoogleId - User's Google ID for logging
 * @param {number|null} campaignId - Optional campaign ID
 * @returns {Promise<Array>} Array of results
 */
export async function sendTelegramMessages(
    contacts,
    message,
    botToken,
    apiUrl,
    userGoogleId,
    campaignId = null
) {
    const results = [];
    const batchSize = 10; // Telegram rate limit: ~30 messages/second, we use 10 for safety
    const delayBetweenBatches = 1000; // 1 second

    for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        const batchPromises = batch.map(async (contact) => {
            try {
                const chatId = formatTelegramIdentifier(contact.telegram_id || contact.telegram_username);

                if (!chatId) {
                    return {
                        contactId: contact.id,
                        contactName: contact.name,
                        success: false,
                        error: 'Invalid Telegram identifier'
                    };
                }

                const result = await sendTelegramMessage(chatId, message, botToken, apiUrl);

                return {
                    contactId: contact.id,
                    contactName: contact.name,
                    success: true,
                    messageId: result.messageId,
                    provider: 'telegram'
                };
            } catch (error) {
                return {
                    contactId: contact.id,
                    contactName: contact.name,
                    success: false,
                    error: error.message,
                    provider: 'telegram'
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Delay between batches to respect rate limits
        if (i + batchSize < contacts.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }

    return results;
}
```

---

#### 2.2. Provider Router Module

**New File**: `functions/lib/providerRouter.js`

```javascript
/**
 * Multi-Provider Message Router
 * Abstracts message sending across different providers
 */

import { sendTelegramMessages } from './telegram.js';

/**
 * Send messages via WhatsApp (existing Infobip integration)
 * This function wraps the existing WhatsApp logic
 */
async function sendWhatsAppMessages(contacts, message, env, userGoogleId, campaignId) {
    // This will be extracted from the existing send.js implementation
    // to maintain backward compatibility
    const { sendWhatsAppMessages: originalSend } = await import('../api/message/send.js');
    return originalSend(contacts, message, env.INFOBIP_API_KEY, env.INFOBIP_BASE_URL, env.INFOBIP_WHATSAPP_SENDER, userGoogleId, campaignId);
}

/**
 * Route message sending to the appropriate provider
 * @param {string} provider - 'whatsapp' or 'telegram'
 * @param {Array} contacts - Array of contact objects
 * @param {string} message - Message content
 * @param {object} env - Environment variables
 * @param {string} userGoogleId - User's Google ID
 * @param {number|null} campaignId - Optional campaign ID
 * @returns {Promise<Array>} Array of send results
 */
export async function sendMessageViaProvider(provider, contacts, message, env, userGoogleId, campaignId = null) {
    switch (provider) {
        case 'whatsapp':
            return sendWhatsAppMessages(contacts, message, env, userGoogleId, campaignId);

        case 'telegram':
            if (!env.TELEGRAM_BOT_TOKEN) {
                throw new Error('Telegram Bot Token not configured');
            }
            return sendTelegramMessages(
                contacts,
                message,
                env.TELEGRAM_BOT_TOKEN,
                env.TELEGRAM_API_URL || 'https://api.telegram.org',
                userGoogleId,
                campaignId
            );

        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

/**
 * Validate provider and contacts compatibility
 * @param {string} provider - Provider name
 * @param {Array} contacts - Array of contacts
 * @returns {object} Validation result
 */
export function validateProviderContacts(provider, contacts) {
    const invalidContacts = [];

    for (const contact of contacts) {
        switch (provider) {
            case 'whatsapp':
                if (!contact.phone_number) {
                    invalidContacts.push({ id: contact.id, name: contact.name, reason: 'Missing phone number' });
                }
                break;

            case 'telegram':
                if (!contact.telegram_id && !contact.telegram_username) {
                    invalidContacts.push({ id: contact.id, name: contact.name, reason: 'Missing Telegram ID' });
                }
                break;
        }
    }

    return {
        valid: invalidContacts.length === 0,
        invalidContacts
    };
}
```

---

#### 2.3. Update Message Send API

**File**: `functions/api/message/send.js`

**Changes**:

1. **Add import** (at the top of file):
```javascript
import { sendMessageViaProvider, validateProviderContacts } from '../../lib/providerRouter.js';
```

2. **Update request validation** (around lines 7-39):
```javascript
// Add provider validation
const provider = request.provider || 'whatsapp'; // Default to WhatsApp for backward compatibility

if (!['whatsapp', 'telegram'].includes(provider)) {
    return new Response(JSON.stringify({
        success: false,
        error: 'Invalid provider. Must be "whatsapp" or "telegram"'
    }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

3. **Update contact validation** (after line 42):
```javascript
// Validate contacts have required provider fields
const providerValidation = validateProviderContacts(provider, contacts);
if (!providerValidation.valid) {
    return new Response(JSON.stringify({
        success: false,
        error: `${providerValidation.invalidContacts.length} contacts missing ${provider} information`,
        invalidContacts: providerValidation.invalidContacts
    }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

4. **Replace message sending call** (instead of lines 69-77):
```javascript
// Send messages via selected provider
const sendResults = await sendMessageViaProvider(
    provider,
    contacts,
    message,
    env,
    user.google_id,
    campaign?.id
);
```

5. **Update database logging** (add provider to logMessage function):
```javascript
// Update lines 279-293: Add provider column
await env.CF_INFOBIP_DB.prepare(`
    INSERT INTO message_logs (
        user_google_id, contact_id, campaign_id, message_content,
        provider_message_id, provider, status, error_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`).bind(
    userGoogleId,
    contactId,
    campaignId,
    messageContent,
    messageId,
    provider, // NEW: Add provider
    status,
    errorMessage
).run();
```

---

### **PHASE 3: Configuration Updates** (Priority: HIGH)

#### 3.1. Update Wrangler Configuration

**File**: `wrangler.toml`

**Update lines 19-26**:
```toml
[vars]
GOOGLE_CLIENT_ID = ""
GOOGLE_CLIENT_SECRET = ""

# WhatsApp Provider (Infobip)
INFOBIP_API_KEY = ""
INFOBIP_BASE_URL = "https://api.infobip.com"
INFOBIP_WHATSAPP_SENDER = ""

# Telegram Provider
TELEGRAM_BOT_TOKEN = ""
TELEGRAM_API_URL = "https://api.telegram.org"

JWT_SECRET = "your-jwt-secret-here"
```

#### 3.2. Environment Variables Documentation

**New File**: `docs/telegram-setup.md`

```markdown
# Telegram Bot Setup Guide

## Prerequisites
- Active Telegram account
- Basic understanding of Telegram Bot API

## Step 1: Create Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow prompts:
   - Enter bot name (e.g., "My Broadcaster Bot")
   - Enter bot username (must end with 'bot', e.g., "mybroadcaster_bot")
4. Save the **Bot Token** (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Step 2: Configure Bot

### Set Bot Description (Optional)
```
/setdescription
Select your bot
Enter description: "Bulk message broadcaster for Telegram"
```

### Set Bot About (Optional)
```
/setabouttext
Select your bot
Enter text: "Send bulk messages to your contacts"
```

## Step 3: Get Chat IDs

To send messages to users, you need their **Chat ID**:

### Method 1: Use @userinfobot
1. Add @userinfobot to a chat
2. Forward a message from the target user
3. Bot will reply with their Chat ID

### Method 2: Use getUpdates API
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

## Step 4: Add to Environment

Add to `wrangler.toml` or Cloudflare dashboard:

```toml
TELEGRAM_BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
TELEGRAM_API_URL = "https://api.telegram.org"
```

## Step 5: Import Contacts with Telegram IDs

Contacts must have `telegram_id` or `telegram_username`:

- **telegram_id**: Numeric (e.g., 123456789)
- **telegram_username**: With @ (e.g., @username)

## Testing Your Bot

```bash
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "<CHAT_ID>", "text": "Test message"}'
```

## Rate Limits

- **Group chats**: 20 messages per minute
- **Private chats**: 30 messages per second (per chat)
- **Broadcast limit**: ~1 message per user per hour for new bots

## Security Best Practices

1. ✅ Never share your Bot Token
2. ✅ Store token in environment variables (not in code)
3. ✅ Use HTTPS for webhook (if using webhooks)
4. ✅ Validate incoming updates
5. ✅ Implement rate limiting

## Troubleshooting

### "Unauthorized" Error
- Check Bot Token is correct
- Ensure no extra spaces in token

### "Chat not found"
- User must start a conversation with your bot first
- Send `/start` command to your bot

### "Too Many Requests"
- You're hitting rate limits
- Implement delays between messages (already handled in code)

## Additional Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)
- [Telegram Bot Limits](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this)
```

---

### **PHASE 4: Frontend Updates** (Priority: MEDIUM)

#### 4.1. Provider Selection UI

**File**: `public/index.html`

**Add after line 164** (below Compose Message heading):

```html
<!-- Provider Selection -->
<div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 mb-2">
        Messaging Provider
    </label>
    <div class="flex space-x-4">
        <label class="inline-flex items-center">
            <input type="radio"
                   name="provider"
                   value="whatsapp"
                   checked
                   class="form-radio h-4 w-4 text-blue-600">
            <span class="ml-2 text-sm text-gray-700">
                <svg class="inline w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp
            </span>
        </label>
        <label class="inline-flex items-center">
            <input type="radio"
                   name="provider"
                   value="telegram"
                   class="form-radio h-4 w-4 text-blue-600">
            <span class="ml-2 text-sm text-gray-700">
                <svg class="inline w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Telegram
            </span>
        </label>
    </div>
</div>
```

**Update lines 189-197** (Message Preview):

```html
<!-- Message Preview -->
<div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 mb-2">
        Preview
        <span id="preview-provider-label" class="text-xs text-gray-500">(WhatsApp)</span>
    </label>
    <div id="message-preview-container" class="relative">
        <!-- WhatsApp Preview -->
        <div id="whatsapp-preview" class="preview-box">
            <div class="p-3 bg-green-50 rounded-md border border-green-200 min-h-[100px]">
                <div id="message-preview-whatsapp" class="text-sm">
                    <p class="text-gray-500">Message preview will appear here...</p>
                </div>
            </div>
        </div>

        <!-- Telegram Preview -->
        <div id="telegram-preview" class="preview-box hidden">
            <div class="p-3 bg-blue-50 rounded-md border border-blue-200 min-h-[100px]">
                <div id="message-preview-telegram" class="text-sm">
                    <p class="text-gray-500">Message preview will appear here...</p>
                </div>
            </div>
        </div>
    </div>
</div>
```

---

#### 4.2. Frontend JavaScript Updates

**File**: `public/app.js`

**Add after line 1** (Global variables):
```javascript
// Provider management
let selectedProvider = 'whatsapp'; // Default provider

// Character limits per provider
const PROVIDER_LIMITS = {
    whatsapp: 4096,
    telegram: 4096
};
```

**Add around line 40** (after DOM elements):
```javascript
// Provider elements
const providerRadios = document.querySelectorAll('input[name="provider"]');
const previewProviderLabel = document.getElementById('preview-provider-label');
const whatsappPreview = document.getElementById('whatsapp-preview');
const telegramPreview = document.getElementById('telegram-preview');
const messagePreviewWhatsApp = document.getElementById('message-preview-whatsapp');
const messagePreviewTelegram = document.getElementById('message-preview-telegram');
```

**Add around line 75** (after event listeners):
```javascript
// Provider change handlers
providerRadios.forEach(radio => {
    radio.addEventListener('change', handleProviderChange);
});
```

**Add new function** (around line 250):
```javascript
// Provider management functions
function handleProviderChange(e) {
    selectedProvider = e.target.value;

    // Update preview label
    const providerName = selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1);
    previewProviderLabel.textContent = `(${providerName})`;

    // Toggle preview visibility
    if (selectedProvider === 'whatsapp') {
        whatsappPreview.classList.remove('hidden');
        telegramPreview.classList.add('hidden');
    } else {
        whatsappPreview.classList.add('hidden');
        telegramPreview.classList.remove('hidden');
    }

    // Re-render message preview for new provider
    handleMessageInput();
}
```

**Update lines 252-277** (handleMessageInput function):
```javascript
function handleMessageInput() {
    const content = messageContent.value;
    const length = content.length;
    const limit = PROVIDER_LIMITS[selectedProvider];

    // Update character count
    messageCount.textContent = `${length} / ${limit} characters`;

    // Update character count color
    if (length > limit) {
        messageCount.classList.add('text-red-500');
        messageCount.classList.remove('text-gray-500');
    } else {
        messageCount.classList.remove('text-red-500');
        messageCount.classList.add('text-gray-500');
    }

    // Update preview based on provider
    const previewElement = selectedProvider === 'whatsapp'
        ? messagePreviewWhatsApp
        : messagePreviewTelegram;

    if (content.trim()) {
        // Telegram supports HTML formatting, WhatsApp plain text
        if (selectedProvider === 'telegram') {
            previewElement.innerHTML = `<p class="whitespace-pre-wrap">${renderTelegramPreview(content)}</p>`;
        } else {
            previewElement.innerHTML = `<p class="whitespace-pre-wrap">${escapeHtml(content)}</p>`;
        }
    } else {
        previewElement.innerHTML = '<p class="text-gray-500">Message preview will appear here...</p>';
    }

    // Update send button state
    updateSendButtonState();
}

function renderTelegramPreview(text) {
    // Simple HTML rendering for Telegram (supports <b>, <i>, <code>, etc.)
    // For now, just escape HTML but preserve line breaks
    return escapeHtml(text);
}
```

**Update lines 279-285** (updateSendButtonState):
```javascript
function updateSendButtonState() {
    const hasMessage = messageContent.value.trim().length > 0;
    const hasRecipients = selectedContacts.size > 0;
    const limit = PROVIDER_LIMITS[selectedProvider];
    const isValidLength = messageContent.value.length <= limit;

    sendMessageBtnMain.disabled = !(hasMessage && hasRecipients && isValidLength);
}
```

**Update lines 292-307** (sendMessage validation):
```javascript
async function sendMessage() {
    if (selectedContacts.size === 0) {
        showNotification('Please select at least one contact', 'error');
        return;
    }

    const message = messageContent.value.trim();
    if (!message) {
        showNotification('Please enter a message', 'error');
        return;
    }

    const limit = PROVIDER_LIMITS[selectedProvider];
    if (message.length > limit) {
        showNotification(`Message is too long (max ${limit} characters)`, 'error');
        return;
    }

    // ... rest remains same
}
```

**Update lines 315-321** (API call):
```javascript
const response = await authenticatedFetch('/api/message/send', {
    method: 'POST',
    body: JSON.stringify({
        message,
        recipients,
        provider: selectedProvider // ADD THIS LINE
    })
});
```

---

### **PHASE 5: Contact Management Updates** (Priority: LOW)

#### 5.1. Contact List API Update

**File**: `functions/api/contacts/list.js`

**Update lines 47-58** (SELECT query):
```javascript
const result = await env.CF_INFOBIP_DB.prepare(`
    SELECT
        id,
        name,
        phone_number,
        email,
        telegram_id,
        telegram_username,
        preferred_provider,
        created_at
    FROM contacts
    WHERE user_google_id = ?
    ORDER BY ${orderColumn} ${orderDirection}
    LIMIT ? OFFSET ?
`).bind(user.google_id, limit, offset).all();
```

#### 5.2. Contact Import Enhancement (Optional)

**New API Endpoint**: `functions/api/contacts/update-telegram.js`

```javascript
/**
 * Update contact with Telegram information
 * PUT /api/contacts/update-telegram
 */
export async function onRequest(context) {
    const { request, env } = context;

    // Authenticate user
    const user = await authenticateUser(request, env);
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { contactId, telegramId, telegramUsername, preferredProvider } = body;

        if (!contactId) {
            return new Response(JSON.stringify({ error: 'Contact ID required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update contact
        await env.CF_INFOBIP_DB.prepare(`
            UPDATE contacts
            SET
                telegram_id = ?,
                telegram_username = ?,
                preferred_provider = ?,
                updated_at = datetime('now')
            WHERE id = ? AND user_google_id = ?
        `).bind(
            telegramId || null,
            telegramUsername || null,
            preferredProvider || 'whatsapp',
            contactId,
            user.google_id
        ).run();

        return new Response(JSON.stringify({
            success: true,
            message: 'Contact updated successfully'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Update contact error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
```

---

### **PHASE 6: Testing & Quality Assurance** (Priority: HIGH)

#### 6.1. Unit Tests

**New File**: `tests/unit/telegram.test.js`

```javascript
import { describe, it, expect, vi } from 'vitest';
import { sendTelegramMessage, formatTelegramIdentifier } from '../../functions/lib/telegram.js';

describe('Telegram Integration', () => {
    describe('formatTelegramIdentifier', () => {
        it('should format numeric chat ID', () => {
            expect(formatTelegramIdentifier(123456789)).toBe(123456789);
        });

        it('should format username with @', () => {
            expect(formatTelegramIdentifier('@testuser')).toBe('@testuser');
        });

        it('should convert numeric string to number', () => {
            expect(formatTelegramIdentifier('123456789')).toBe(123456789);
        });

        it('should return null for invalid identifier', () => {
            expect(formatTelegramIdentifier('')).toBe(null);
            expect(formatTelegramIdentifier('invalid')).toBe(null);
        });
    });

    describe('sendTelegramMessage', () => {
        it('should send message successfully', async () => {
            // Mock fetch
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    ok: true,
                    result: { message_id: 12345 }
                })
            });

            const result = await sendTelegramMessage(
                123456789,
                'Test message',
                'test_bot_token',
                'https://api.telegram.org'
            );

            expect(result.messageId).toBe('12345');
            expect(result.status).toBe('sent');
        });
    });
});
```

#### 6.2. Integration Tests

**New File**: `tests/integration/multi-provider.test.js`

```javascript
import { describe, it, expect } from 'vitest';

describe('Multi-Provider Integration', () => {
    it('should send message via WhatsApp', async () => {
        // Test WhatsApp message sending
    });

    it('should send message via Telegram', async () => {
        // Test Telegram message sending
    });

    it('should validate provider-specific contact fields', async () => {
        // Test validation logic
    });
});
```

---

### **PHASE 7: Documentation Updates** (Priority: MEDIUM)

#### 7.1. README.md Update

**File**: `README.md`

**Update line 13**:
```markdown
- 📱 **Multi-platform messaging** - Send messages via WhatsApp or Telegram
```

**Add after lines 79-88**:
```markdown
# Telegram Configuration (Optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_API_URL=https://api.telegram.org
```

**Add after line 124**:
```markdown
- 📱 [Telegram Setup](docs/telegram-setup.md) - Telegram Bot configuration
```

---

## 📊 IMPLEMENTATION TIMELINE

| Phase | Description | Estimated Time | Priority |
|-------|-------------|----------------|----------|
| **Phase 1** | Database schema updates | 2-3 hours | 🔴 HIGH |
| **Phase 2** | Backend provider abstraction | 4-6 hours | 🔴 HIGH |
| **Phase 3** | Configuration updates | 1 hour | 🔴 HIGH |
| **Phase 4** | Frontend UI and JavaScript | 3-4 hours | 🟡 MEDIUM |
| **Phase 5** | Contact management updates | 2-3 hours | 🟢 LOW |
| **Phase 6** | Testing & QA | 3-4 hours | 🔴 HIGH |
| **Phase 7** | Documentation | 1-2 hours | 🟡 MEDIUM |
| **TOTAL** | | **16-23 hours** | |

---

## ✅ CHECKLIST

### Database
- [ ] Create `db/migrations/001_add_telegram_support.sql`
- [ ] Test migration on local database
- [ ] Apply migration to production database

### Backend
- [ ] Create `functions/lib/telegram.js`
- [ ] Create `functions/lib/providerRouter.js`
- [ ] Update `functions/api/message/send.js`
- [ ] Update `functions/api/contacts/list.js`
- [ ] Create `functions/api/contacts/update-telegram.js` (optional)

### Configuration
- [ ] Update `wrangler.toml`
- [ ] Update `.env.example` (if exists)
- [ ] Set environment variables in Cloudflare dashboard

### Frontend
- [ ] `public/index.html` - Add provider selection UI
- [ ] `public/index.html` - Update message preview
- [ ] `public/app.js` - Add provider management
- [ ] `public/app.js` - Update message sending
- [ ] `public/styles.css` - Add necessary styles (optional)

### Documentation
- [ ] Create `docs/telegram-setup.md`
- [ ] Update `README.md`
- [ ] Update `TECHNICAL_STACK.md`
- [ ] Update API documentation

### Testing
- [ ] Write unit tests (`tests/unit/telegram.test.js`)
- [ ] Write integration tests
- [ ] Manual testing - WhatsApp (regression test)
- [ ] Manual testing - Telegram (new feature)
- [ ] Load testing - Both providers

### Deployment
- [ ] Deploy to staging environment
- [ ] Test on staging
- [ ] Deploy to production
- [ ] Production monitoring

---

## 🚨 IMPORTANT NOTES

### To Avoid Breaking Existing Functionality:

1. **Backward Compatibility**:
   - All API endpoints must have `provider` parameter as OPTIONAL
   - Default value should always be `'whatsapp'`
   - Old clients should continue working without any changes

2. **Database Migration**:
   - New columns must accept NULL values or have default values
   - Existing records should not be affected
   - Migration should be reversible (rollback capability)

3. **Error Handling**:
   - Provider-specific errors should be clear
   - WhatsApp errors should not affect Telegram
   - Rate limiting should be applied per provider

4. **Testing Strategy**:
   - Test WhatsApp functionality before each deployment
   - Automate regression tests
   - Comprehensive testing on staging environment

---

## 🎯 SUCCESS CRITERIA

Integration will be considered successful if:

✅ Users can choose between WhatsApp or Telegram
✅ Messages can be sent via both providers
✅ Message preview displays differently for each provider
✅ Existing WhatsApp functionality works 100%
✅ No breaking changes
✅ Database migration applies smoothly
✅ Test coverage above 80%
✅ Documentation is complete

---

## 📞 SUPPORT AND RESOURCES

- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Cloudflare D1 Docs**: https://developers.cloudflare.com/d1/
- **Infobip API**: https://www.infobip.com/docs/api

---

**Plan Prepared By**: Claude (Sonnet 4.5)
**Date**: 2025-11-02
**Project**: CF-Infobip Broadcaster - Telegram Integration

This plan demonstrates the best approach to add Telegram support without breaking the existing project architecture. You can implement it step-by-step with Roo code.
