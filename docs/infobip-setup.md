# Infobip WhatsApp API Setup Guide

This guide will walk you through setting up Infobip WhatsApp Business API for the CF-Infobip Broadcaster application.

## Prerequisites

- An Infobip account
- Verified WhatsApp Business account
- Cloudflare Pages project (already set up)

## Step 1: Create Infobip Account

1. Go to the [Infobip website](https://www.infobip.com/)
2. Click "Sign Up" and create your account
3. Verify your email address
4. Complete the onboarding process

## Step 2: Set Up WhatsApp Business API

1. Log in to your Infobip dashboard
2. Navigate to "Channels" > "WhatsApp"
3. Click "Get Started" or "Add Number"
4. Follow the WhatsApp Business verification process:
   - Provide your business information
   - Verify your phone number
   - Submit required documentation
   - Wait for approval (this can take 1-3 business days)

## Step 3: Get API Credentials

1. Once your WhatsApp Business API is approved, navigate to "Developer" > "API Keys"
2. Click "Create API Key"
3. Give it a descriptive name (e.g., "CF-Infobip Broadcaster")
4. Select the required permissions:
   - WhatsApp API
   - SMS API (optional, for fallback)
5. Copy the API key - you'll need this for your application

## Step 4: Get WhatsApp Sender Information

1. Navigate to "Channels" > "WhatsApp"
2. Find your approved WhatsApp number
3. Note down the sender number (in format: `447860099099` or similar)
4. This will be your `INFOBIP_WHATSAPP_SENDER`

## Step 5: Configure Environment Variables

Update your `wrangler.toml` file with the Infobip credentials:

```toml
[vars]
INFOBIP_API_KEY = "your-infobip-api-key-here"
INFOBIP_BASE_URL = "https://api.infobip.com"
INFOBIP_WHATSAPP_SENDER = "your-whatsapp-sender-number"
```

Or set them as secrets in Cloudflare (recommended for production):

```bash
wrangler secret put INFOBIP_API_KEY
wrangler secret put INFOBIP_WHATSAPP_SENDER
```

## Step 6: Test the Integration

1. Deploy your application to Cloudflare Pages
2. Import some contacts from Google
3. Compose a test message
4. Send it to a test contact
5. Verify the message is received on WhatsApp

## API Configuration Details

### Base URL
- Production: `https://api.infobip.com`
- Sandbox: `https://api.infobip.com` (same URL, different behavior based on account)

### API Key Format
Your API key should be used in the Authorization header as:
```
Authorization: App YOUR_API_KEY_HERE
```

### WhatsApp Sender Format
The sender number should be in E.164 format without the `+` symbol:
- Correct: `447860099099`
- Incorrect: `+447860099099`

## Message Templates

WhatsApp requires message templates for business-initiated conversations. However, for user-initiated conversations (replies within 24 hours), you can send free-form messages.

### Template Requirements
- Templates must be pre-approved by WhatsApp
- Each template has a specific format and variables
- Templates are used for notifications, marketing, and other business-initiated messages

### Session Messages
- After a user messages you first, you have 24 hours to send free-form messages
- This is perfect for our use case where users initiate contact
- No template approval needed for session messages

## Rate Limits

Infobip implements rate limits to prevent spam:

- **Messages per second**: Varies by account level
- **Messages per day**: Varies by account level
- **Concurrent connections**: Limited

Our application implements:
- Batch processing (10 messages per batch)
- 1-second delay between batches
- Retry logic for failed messages

## Error Handling

Common error scenarios and their meanings:

### 401 Unauthorized
- Invalid API key
- Expired API key
- Insufficient permissions

### 402 Payment Required
- Insufficient account balance
- Payment method issues

### 403 Forbidden
- Account suspended
- Violation of WhatsApp policies
- Sender number not approved

### 429 Too Many Requests
- Rate limit exceeded
- Too many messages in short time

### 500 Internal Server Error
- Temporary Infobip issue
- Try again after a few seconds

## Best Practices

### Message Content
- Keep messages under 4096 characters
- Use proper formatting
- Avoid spam-like content
- Include opt-out information when appropriate

### Phone Number Formatting
- Always use E.164 format
- Validate phone numbers before sending
- Handle international numbers correctly

### Error Handling
- Implement retry logic
- Log all errors for debugging
- Provide user feedback for failed sends
- Monitor delivery status

### Compliance
- Follow WhatsApp Business Policies
- Respect opt-out requests
- Maintain proper record-keeping
- Be transparent about data usage

## Monitoring and Analytics

### Infobip Dashboard
- Monitor message delivery rates
- Track costs and usage
- View error reports
- Analyze performance metrics

### Application Monitoring
- Log all send attempts
- Track success/failure rates
- Monitor API response times
- Set up alerts for issues

## Troubleshooting

### Common Issues

1. **Messages Not Delivered**
   - Check phone number format
   - Verify sender is approved
   - Check account balance
   - Review error logs

2. **API Authentication Errors**
   - Verify API key is correct
   - Check permissions
   - Ensure environment variables are set

3. **Rate Limiting**
   - Implement proper delays
   - Reduce batch sizes
   - Monitor usage patterns

4. **Template Rejection**
   - Follow WhatsApp template guidelines
   - Avoid promotional language
   - Include proper opt-out information

### Debugging Tips

1. Check browser console for JavaScript errors
2. Review Cloudflare Functions logs
3. Test with small batches first
4. Use Infobip's API testing tools
5. Verify phone numbers manually

## Security Considerations

1. **API Key Protection**
   - Never expose API keys in frontend code
   - Use environment variables or secrets
   - Rotate keys regularly

2. **Data Privacy**
   - Comply with GDPR/CCPA
   - Secure user data
   - Implement proper consent mechanisms

3. **Message Security**
   - Use HTTPS for all API calls
   - Validate all inputs
   - Sanitize message content

## Scaling Considerations

### High Volume Sending
- Implement queue systems
- Use multiple API keys if needed
- Consider dedicated IP addresses
- Monitor performance metrics

### Geographic Distribution
- Use Cloudflare's global network
- Consider regional API endpoints
- Optimize for latency

## Support Resources

- [Infobip Documentation](https://www.infobip.com/docs)
- [WhatsApp Business API Guide](https://developers.facebook.com/docs/whatsapp)
- [Infobip Support Portal](https://support.infobip.com/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)

## Conclusion

Setting up Infobip WhatsApp API requires careful attention to configuration, compliance, and best practices. Once properly configured, it provides a reliable platform for business messaging at scale.

Remember to test thoroughly before going to production and monitor your usage to avoid unexpected costs or service interruptions.