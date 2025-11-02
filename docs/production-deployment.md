# Production Deployment Guide

This guide covers the complete production deployment process for CF-Infobip Broadcaster with testing, monitoring, and operational procedures.

## 🚀 Pre-Deployment Checklist

### Testing Requirements
- [ ] All unit tests pass: `npm test`
- [ ] All E2E tests pass: `npm run test:e2e`
- [ ] Load testing completes successfully: `npm run test:load`
- [ ] Code quality checks pass: `npm run lint`
- [ ] Security review completed
- [ ] Performance benchmarks meet requirements

### Environment Setup
- [ ] Google OAuth production credentials configured
- [ ] Infobip production API credentials configured
- [ ] All environment variables set in production
- [ ] SSL certificates configured (handled by Cloudflare)
- [ ] Custom domain configured (if applicable)
- [ ] DNS settings updated

### Database Preparation
- [ ] Production D1 database created
- [ ] Database schema applied: `npm run db:migrate --env production`
- [ ] Database backups configured
- [ ] Database access restrictions configured

## 🏗️ Deployment Process

### 1. Environment Configuration

#### Production Environment Variables
```bash
# Set production secrets
wrangler secret put GOOGLE_CLIENT_ID --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production
wrangler secret put INFOBIP_API_KEY --env production
wrangler secret put INFOBIP_WHATSAPP_SENDER --env production
wrangler secret put JWT_SECRET --env production

# Set environment variables
wrangler secret put ENVIRONMENT --env production
wrangler secret put DEBUG --env production
```

#### Staging Environment Variables
```bash
# Set staging secrets
wrangler secret put GOOGLE_CLIENT_ID --env staging
wrangler secret put GOOGLE_CLIENT_SECRET --env staging
wrangler secret put INFOBIP_API_KEY --env staging
wrangler secret put INFOBIP_WHATSAPP_SENDER --env staging
wrangler secret put JWT_SECRET --env staging

# Set environment variables
wrangler secret put ENVIRONMENT --env staging
wrangler secret put DEBUG --env staging
```

### 2. Database Setup

#### Production Database
```bash
# Create production database
wrangler d1 create cf-infobip-db-prod

# Update wrangler.toml with production database ID
# Apply schema
wrangler d1 execute cf-infobip-db-prod --file=./db/schema.sql --env production
```

#### Staging Database
```bash
# Create staging database
wrangler d1 create cf-infobip-db-staging

# Apply schema
wrangler d1 execute cf-infobip-db-staging --file=./db/schema.sql --env staging
```

### 3. Deployment Steps

#### Staging Deployment
```bash
# Deploy to staging
npm run deploy:staging

# Verify staging deployment
curl https://cf-infobip-broadcaster-staging.pages.dev/api/health
```

#### Production Deployment
```bash
# Deploy to production
npm run deploy:production

# Verify production deployment
curl https://your-domain.com/api/health
```

## 🧪 Testing in Production

### Smoke Tests
```bash
# Test health endpoint
curl -f https://your-domain.com/api/health || echo "Health check failed"

# Test authentication
curl -X POST https://your-domain.com/auth/logout \
  -H "Content-Type: application/json" \
  -d '{}'

# Test API endpoints
curl -H "Cookie: session=test" https://your-domain.com/api/contacts/count
```

### Integration Tests
1. **Authentication Flow**
   - Test Google OAuth redirect
   - Verify session creation
   - Test logout functionality

2. **Contacts Management**
   - Test Google Contacts import
   - Verify contact listing
   - Test search functionality

3. **Message Sending**
   - Test message composition
   - Verify WhatsApp delivery
   - Check error handling

4. **Campaign Management**
   - Test campaign creation
   - Verify recipient management
   - Test scheduling

## 📊 Monitoring Setup

### Health Monitoring
```bash
# Set up health check monitoring
# Monitor /api/health endpoint
# Alert on 503 responses
# Alert on high response times
```

### Performance Monitoring
- **Response Time**: Alert if > 2 seconds
- **Error Rate**: Alert if > 5%
- **Database Performance**: Monitor query times
- **External APIs**: Monitor Google and Infobip API rates

### Log Monitoring
```javascript
// Configure log aggregation
// Monitor error logs
// Track performance metrics
// Set up alerts for critical errors
```

### Analytics Integration
- **Cloudflare Analytics**: Built-in traffic analytics
- **Custom Events**: Track user interactions
- **Conversion Metrics**: Message success rates
- **User Engagement**: Feature usage tracking

## 🔧 Operations Guide

### Database Maintenance

#### Regular Backups
```bash
# Export database weekly
wrangler d1 export cf-infobip-db-prod --output=backup-$(date +%Y%m%d).sql

# Automate with cron job
0 2 * * 0 wrangler d1 export cf-infobip-db-prod --output=backup-$(date +\%Y\%m\%d).sql
```

#### Performance Optimization
```sql
-- Analyze slow queries
EXPLAIN QUERY PLAN SELECT * FROM contacts WHERE user_google_id = ?;

-- Rebuild indexes periodically
REINDEX;

-- Update statistics
ANALYZE;
```

### Security Maintenance

#### SSL Certificate Management
- Handled automatically by Cloudflare
- Monitor certificate expiration
- Set up renewal alerts

#### Access Control
```bash
# Review access logs
# Monitor failed authentication attempts
# Track unusual activity patterns
```

### Scaling Procedures

#### Horizontal Scaling
- Automatic with Cloudflare Pages
- Monitor usage metrics
- Adjust resource allocation as needed

#### Database Scaling
- Monitor D1 usage limits
- Implement data archiving for old logs
- Optimize queries for better performance

## 🚨 Incident Response

### Critical Issues
1. **Service Outage**
   - Check Cloudflare status
   - Verify database connectivity
   - Monitor external API status

2. **Authentication Failures**
   - Verify OAuth credentials
   - Check JWT secret configuration
   - Review Google OAuth settings

3. **Message Delivery Issues**
   - Verify Infobip API status
   - Check sender configuration
   - Review message content compliance

### Recovery Procedures
```bash
# Quick rollback to previous version
wrangler pages deploy --compatibility-date=2023-12-01 public --env production

# Database restore (if needed)
wrangler d1 import cf-infobip-db-prod --file=backup-YYYYMMDD.sql

# Clear cache if needed
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache"
```

## 📈 Performance Optimization

### Frontend Optimization
- **Bundle Size**: Minimize JavaScript and CSS
- **Image Optimization**: Compress and serve modern formats
- **Caching**: Implement proper cache headers
- **CDN**: Leverage Cloudflare's global network

### Backend Optimization
- **Database Indexing**: Ensure proper indexes
- **Query Optimization**: Use efficient queries
- **Connection Pooling**: Optimize database connections
- **Caching**: Implement Redis caching for frequent queries

### API Optimization
- **Rate Limiting**: Implement proper rate limits
- **Batch Processing**: Group similar operations
- **Async Processing**: Use background jobs for heavy tasks
- **Compression**: Enable response compression

## 🔒 Security Best Practices

### Application Security
- **Input Validation**: Validate all user inputs
- **SQL Injection Prevention**: Use parameterized queries
- **XSS Protection**: Sanitize output and use CSP
- **CSRF Protection**: Implement anti-CSRF tokens

### Infrastructure Security
- **Network Security**: Configure WAF rules
- **Access Control**: Implement proper IAM policies
- **Secrets Management**: Rotate secrets regularly
- **Monitoring**: Set up security alerts

### Compliance
- **GDPR**: Implement data protection measures
- **Data Retention**: Define and enforce retention policies
- **Audit Logging**: Maintain comprehensive audit trails
- **Privacy**: Ensure user privacy controls

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing in staging
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Backup procedures tested
- [ ] Monitoring configured
- [ ] Rollback plan prepared

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] User acceptance testing completed
- [ ] Performance metrics within thresholds
- [ ] Documentation updated

### Ongoing
- [ ] Regular security audits scheduled
- [ ] Performance reviews planned
- [ ] Backup procedures automated
- [ ] Incident response team trained

## 🔄 Continuous Deployment

### CI/CD Pipeline
```yaml
# Example GitHub Actions workflow
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Run load tests
        run: npm run test:load

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: cf-infobip-broadcaster
          directory: public
```

### Automated Testing
- **Unit Tests**: Run on every commit
- **Integration Tests**: Run on pull requests
- **E2E Tests**: Run on main branch
- **Load Tests**: Run before production deployment

## 📞 Support and Maintenance

### Support Channels
- **Documentation**: Comprehensive user and developer docs
- **Monitoring**: Real-time alerts and dashboards
- **Issue Tracking**: GitHub Issues for bug reports
- **Community**: Support forum or Discord channel

### Maintenance Schedule
- **Weekly**: Security updates and patches
- **Monthly**: Performance reviews and optimizations
- **Quarterly**: Security audits and compliance checks
- **Annually**: Architecture review and planning

This production deployment guide ensures a robust, secure, and maintainable deployment of the CF-Infobip Broadcaster application.
