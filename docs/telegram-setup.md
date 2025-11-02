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