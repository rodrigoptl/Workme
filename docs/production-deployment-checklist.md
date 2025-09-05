# 🚀 Production Deployment Checklist - WorkMe

## 📋 Pre-Deployment Checklist

### 🏗️ Infrastructure Setup
- [ ] **DigitalOcean Droplets** provisioned (staging + production)
  - [ ] Staging: 2GB RAM, 1 vCPU, 50GB SSD
  - [ ] Production: 4GB RAM, 2 vCPU, 80GB SSD
  - [ ] Ubuntu 22.04 LTS installed
  - [ ] SSH keys configured
  - [ ] Firewall rules configured (SSH, HTTP, HTTPS)

- [ ] **Domain Configuration**
  - [ ] Domain `workme.com.br` registered and configured
  - [ ] DNS A records: `api.workme.com.br` → Production IP
  - [ ] DNS A records: `api-staging.workme.com.br` → Staging IP
  - [ ] DNS propagation verified

- [ ] **SSL Certificates**
  - [ ] Let's Encrypt certificates issued for both domains
  - [ ] Auto-renewal configured
  - [ ] Certificate validity verified

### 🗄️ Database Setup
- [ ] **MongoDB Atlas Clusters**
  - [ ] Staging cluster (M10 tier) in São Paulo region
  - [ ] Production cluster (M10 tier) in São Paulo region
  - [ ] Database users created with appropriate permissions
  - [ ] IP allowlisting configured for Droplet IPs
  - [ ] Connection strings tested
  - [ ] Daily backups enabled

### 🔑 Environment Variables
- [ ] **Staging Environment** (`.env.staging`)
  - [ ] `MONGO_URL` with staging cluster connection string
  - [ ] `SECRET_KEY` generated (256-bit random key)
  - [ ] `STRIPE_SECRET_KEY` (test mode)
  - [ ] `STRIPE_PUBLISHABLE_KEY` (test mode)
  - [ ] `STRIPE_WEBHOOK_SECRET` for staging webhook
  - [ ] `EMERGENT_LLM_KEY` configured
  - [ ] `SENTRY_DSN` for staging project
  - [ ] `REDIS_PASSWORD` generated

- [ ] **Production Environment** (`.env.production`)
  - [ ] `MONGO_URL` with production cluster connection string
  - [ ] `SECRET_KEY` generated (different from staging)
  - [ ] `STRIPE_SECRET_KEY` (live mode) ⚠️
  - [ ] `STRIPE_PUBLISHABLE_KEY` (live mode) ⚠️
  - [ ] `STRIPE_WEBHOOK_SECRET` for production webhook
  - [ ] `EMERGENT_LLM_KEY` configured
  - [ ] `SENTRY_DSN` for production project
  - [ ] `REDIS_PASSWORD` generated (different from staging)

### 💳 Stripe Configuration
- [ ] **Stripe Account**
  - [ ] Business verification completed
  - [ ] Bank account added and verified
  - [ ] PIX payment method enabled
  - [ ] Brazilian market settings configured

- [ ] **API Keys**
  - [ ] Test keys working in staging
  - [ ] Live keys generated for production
  - [ ] Keys properly secured and not in version control

- [ ] **Webhooks**
  - [ ] Staging webhook: `https://api-staging.workme.com.br/api/payment/stripe/webhook`
  - [ ] Production webhook: `https://api.workme.com.br/api/payment/stripe/webhook`
  - [ ] Webhook secrets configured in environment variables
  - [ ] Event types configured: `payment_intent.succeeded`, `payment_intent.payment_failed`, etc.

### 📊 Monitoring & Logging
- [ ] **Sentry Configuration**
  - [ ] Staging project created
  - [ ] Production project created
  - [ ] Error tracking tested
  - [ ] Performance monitoring enabled
  - [ ] Alert rules configured

- [ ] **System Monitoring**
  - [ ] Health check endpoints working
  - [ ] Metrics collection enabled
  - [ ] Log rotation configured
  - [ ] Disk space monitoring
  - [ ] Memory usage monitoring
  - [ ] CPU monitoring

### 🔒 Security Configuration
- [ ] **Server Security**
  - [ ] Fail2ban configured for API endpoints
  - [ ] UFW firewall enabled with proper rules
  - [ ] SSH key-only authentication
  - [ ] Regular security updates enabled
  - [ ] Non-root user for application processes

- [ ] **Application Security**
  - [ ] CORS configured for production domains only
  - [ ] Rate limiting implemented
  - [ ] JWT secret keys properly generated
  - [ ] Input validation on all endpoints
  - [ ] File upload size limits configured
  - [ ] SQL injection prevention (MongoDB)

## 🚀 Deployment Process

### 📦 1. Staging Deployment
```bash
# On staging server
cd /var/www/workme/staging
git pull origin develop
docker-compose -f docker-compose.staging.yml build
docker-compose -f docker-compose.staging.yml up -d
```

- [ ] Staging deployment successful
- [ ] Health checks passing
- [ ] API endpoints responding
- [ ] Database connectivity verified
- [ ] Stripe integration working (test mode)
- [ ] Sentry errors being captured

### 🧪 2. Staging Testing
- [ ] **API Testing**
  - [ ] Authentication endpoints working
  - [ ] User registration and login
  - [ ] Payment processing (test mode)
  - [ ] File uploads working
  - [ ] AI endpoints responding

- [ ] **Integration Testing**
  - [ ] Stripe webhooks being received
  - [ ] MongoDB operations working
  - [ ] Redis caching functional
  - [ ] Email notifications (if configured)

- [ ] **Performance Testing**
  - [ ] Load testing completed
  - [ ] Response times acceptable (<500ms for API calls)
  - [ ] Memory usage within limits
  - [ ] No memory leaks detected

### 🏭 3. Production Deployment
```bash
# Create snapshot before deployment
doctl compute droplet-action snapshot DROPLET_ID --snapshot-name "pre-deploy-$(date +%Y%m%d)"

# On production server
cd /var/www/workme/production
git pull origin main
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

- [ ] Production snapshot created (rollback point)
- [ ] Production deployment successful
- [ ] Health checks passing
- [ ] All services running
- [ ] Database connectivity verified
- [ ] Stripe integration working (live mode)

### ✅ 4. Post-Deployment Verification
- [ ] **Critical Path Testing**
  - [ ] User can register with beta code
  - [ ] User can complete profile
  - [ ] Professional can upload documents
  - [ ] Client can search for services
  - [ ] Booking process works end-to-end
  - [ ] Payment processing works (small test transaction)

- [ ] **Monitoring Verification**
  - [ ] Sentry receiving events
  - [ ] Health check endpoints responding
  - [ ] Metrics being collected
  - [ ] Log files being written
  - [ ] SSL certificates valid

## 📈 Go-Live Process

### 🎯 1. Beta Launch Preparation
- [ ] **Beta User Management**
  - [ ] Beta access code activated: `WORKME2025BETA`
  - [ ] User limit set to 50 beta testers
  - [ ] Beta admin dashboard functional
  - [ ] Feedback collection system working

- [ ] **Communication**
  - [ ] Beta tester invites prepared
  - [ ] Onboarding documentation ready
  - [ ] Support channels configured
  - [ ] Emergency contact procedures defined

### 🚨 2. Emergency Procedures
- [ ] **Rollback Plan**
  - [ ] Droplet snapshots available
  - [ ] Database backup restoration tested
  - [ ] DNS rollback procedure documented
  - [ ] Emergency contact list updated

- [ ] **Monitoring Alerts**
  - [ ] High error rate alerts
  - [ ] Server resource alerts
  - [ ] Payment failure alerts
  - [ ] Database connectivity alerts

### 📞 3. Support Setup
- [ ] **Support Channels**
  - [ ] Email: beta-support@workme.com.br
  - [ ] Support ticket system
  - [ ] Emergency phone number
  - [ ] Response time SLAs defined

## 🔍 Post-Launch Monitoring

### 📊 Key Metrics to Track
- [ ] **Technical Metrics**
  - [ ] API response times
  - [ ] Error rates
  - [ ] Server resource usage
  - [ ] Database performance

- [ ] **Business Metrics**
  - [ ] User registration rate
  - [ ] Profile completion rate
  - [ ] Booking conversion rate
  - [ ] Payment success rate

- [ ] **User Experience Metrics**
  - [ ] App crash rate
  - [ ] Feature usage analytics
  - [ ] User feedback scores
  - [ ] Support ticket volume

### 🚨 Alert Thresholds
- [ ] **Critical Alerts** (Immediate Response)
  - [ ] API error rate > 5%
  - [ ] Payment failure rate > 10%
  - [ ] Database downtime
  - [ ] Server resource usage > 90%

- [ ] **Warning Alerts** (1 hour response)
  - [ ] API response time > 1 second
  - [ ] Registration failure rate > 15%
  - [ ] File upload failure rate > 20%

## 📝 Documentation Updates
- [ ] **Technical Documentation**
  - [ ] API documentation updated
  - [ ] Deployment procedures documented
  - [ ] Troubleshooting guides created
  - [ ] Architecture diagrams updated

- [ ] **User Documentation**
  - [ ] Beta tester onboarding guide
  - [ ] FAQ updated
  - [ ] Feature documentation
  - [ ] Privacy policy updated

## 🎉 Launch Day Checklist

### Morning of Launch (T-0)
- [ ] **Final Checks** (2 hours before)
  - [ ] All systems green in monitoring
  - [ ] Database backups completed
  - [ ] Team on standby
  - [ ] Emergency procedures reviewed

- [ ] **Go-Live** (T-0)
  - [ ] Beta code activation confirmed
  - [ ] First test user registration
  - [ ] Payment system tested with real transaction
  - [ ] Monitoring dashboards active

### First 24 Hours
- [ ] **Continuous Monitoring**
  - [ ] Error rates tracked
  - [ ] User registration flow monitored
  - [ ] Payment success rates tracked
  - [ ] Support tickets addressed

- [ ] **Daily Review**
  - [ ] Key metrics analysis
  - [ ] User feedback review
  - [ ] System performance assessment
  - [ ] Action items for day 2

## ✅ Sign-off

### Technical Lead
- [ ] All technical requirements met
- [ ] Performance benchmarks achieved
- [ ] Security requirements satisfied
- [ ] Monitoring and alerting functional

**Signature**: _________________ **Date**: _________

### Product Owner
- [ ] All features tested and working
- [ ] User experience validated
- [ ] Business requirements met
- [ ] Beta testing plan ready

**Signature**: _________________ **Date**: _________

### DevOps/Infrastructure
- [ ] Infrastructure stable and monitored
- [ ] Deployment process validated
- [ ] Backup and recovery tested
- [ ] Security measures implemented

**Signature**: _________________ **Date**: _________