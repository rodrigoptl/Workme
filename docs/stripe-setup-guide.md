# 💳 Stripe Configuration Guide - WorkMe

## 📋 Overview
This guide walks you through setting up Stripe for production payments in WorkMe, including PIX support for Brazilian users.

## 🇧🇷 Creating Stripe Account for Brazil

### 1. Account Creation
1. Go to [stripe.com](https://stripe.com) and click "Start now"
2. Select "Brazil" as your country
3. Choose "Business" account type
4. Fill in company details:
   - **Company Name**: Your company name
   - **Industry**: "Marketplace/Platform"
   - **Website**: workme.com.br
   - **Description**: "Professional services marketplace connecting clients to service providers"

### 2. Business Verification
Required documents for Brazil:
- **CNPJ** (Cadastro Nacional da Pessoa Jurídica)
- **Bank account details** (for payouts)
- **Representative ID** (CPF and RG/CNH)
- **Proof of address** (utility bill or bank statement)
- **Articles of incorporation** (if applicable)

### 3. Enable PIX Payments
1. Navigate to **Settings > Payment methods**
2. Enable **PIX** in the "Local payment methods" section
3. Configure PIX settings:
   - **Statement descriptor**: "WORKME"
   - **Receipt email**: enabled
   - **Capture method**: Automatic

## 🔑 API Keys Configuration

### 1. Development Keys (Already Configured)
```bash
# Test mode keys (current)
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
```

### 2. Production Keys Setup
1. Go to **Developers > API keys** in Stripe dashboard
2. Switch to "Live mode" (toggle in sidebar)
3. Copy the keys:

```bash
# Production environment (.env.production)
STRIPE_PUBLISHABLE_KEY=pk_live_51...
STRIPE_SECRET_KEY=sk_live_51...
```

⚠️ **Security Note**: Never commit live keys to version control!

## 🔄 Webhook Configuration

### 1. Create Webhook Endpoints

#### Staging Webhook
1. Go to **Developers > Webhooks**
2. Click "Add endpoint"
3. **URL**: `https://api-staging.workme.com.br/api/payment/stripe/webhook`
4. **Events to listen to**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.requires_action`
   - `account.updated`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

#### Production Webhook
1. Create another endpoint
2. **URL**: `https://api.workme.com.br/api/payment/stripe/webhook`
3. Same events as staging

### 2. Configure Webhook Secrets
Copy the webhook signing secrets to your environment files:

```bash
# Staging
STRIPE_WEBHOOK_SECRET=whsec_1234...

# Production  
STRIPE_WEBHOOK_SECRET=whsec_5678...
```

## 💰 Payment Configuration

### 1. Supported Payment Methods
- **Credit Cards**: Visa, Mastercard, American Express, Elo
- **Debit Cards**: Visa Electron, Mastercard Maestro
- **PIX**: Brazilian instant payment system
- **Bank Transfer**: Boleto bancário (coming soon)

### 2. Fee Structure
```javascript
// Platform fees (configured in backend)
const PLATFORM_FEE = 0.05; // 5%
const CASHBACK_RATE = 0.02; // 2%

// Stripe fees (Brazil)
// Credit card: 4.99% + R$0.40
// PIX: 0.99%
// International cards: 6.99% + R$0.40
```

### 3. Payout Schedule
- **Default**: Daily (T+2 for cards, T+1 for PIX)
- **Volume threshold**: R$50 minimum payout
- **Currency**: BRL (Brazilian Real)

## 🧪 Testing Payments

### 1. Test Cards (Brazil)
```javascript
// Approved cards
"4242424242424242" // Visa (approved)
"5555555555554444" // Mastercard (approved)
"378282246310005"  // American Express (approved)

// Declined cards
"4000000000000002" // Generic decline
"4000000000009995" // Insufficient funds
"4000000000009987" // Lost card
```

### 2. PIX Testing
PIX is automatically available in test mode. Use any valid CPF for testing.

### 3. Test Scenarios
```bash
# Test payment creation
curl -X POST https://api-staging.workme.com.br/api/payment/create-payment-intent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "payment_method": "pix",
    "service_id": "64a7f123456789abcdef0123"
  }'

# Test payment confirmation
curl -X POST https://api-staging.workme.com.br/api/payment/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_intent_id": "pi_1234567890abcdef",
    "payment_method_id": "pm_1234567890abcdef"
  }'
```

## 🔒 Security Configuration

### 1. IP Allowlisting
Add your server IPs to Stripe's IP allowlist:
1. Go to **Settings > Security**
2. Add production server IP addresses
3. Add staging server IP addresses

### 2. Rate Limiting
Configure in Stripe dashboard:
- **API rate limits**: 100 requests/second
- **Webhook rate limits**: 30 requests/second

### 3. Monitoring
Enable these alerts:
- **Failed payments** > 5% of volume
- **Disputed transactions** > 1% of volume
- **API errors** > 1% of requests

## 📊 Production Checklist

### Pre-Launch Verification
- [ ] Business verification complete
- [ ] Bank account added and verified
- [ ] Production API keys generated
- [ ] Webhook endpoints configured
- [ ] PIX enabled and tested
- [ ] Payment flows tested end-to-end
- [ ] Payout schedule configured
- [ ] Security settings reviewed
- [ ] Monitoring alerts set up

### Environment Variables
```bash
# Production environment
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Feature flags
ENABLE_PIX=true
ENABLE_CREDIT_CARDS=true
ENABLE_INTERNATIONAL_CARDS=false
```

## 🚨 Go-Live Requirements

### 1. Stripe Requirements
- [ ] Complete business verification
- [ ] Verify bank account
- [ ] Accept Stripe Services Agreement
- [ ] Complete tax information (if applicable)
- [ ] Review and accept processing limits

### 2. Technical Requirements
- [ ] HTTPS enabled on all endpoints
- [ ] Webhook signature verification implemented
- [ ] Error handling for all payment scenarios
- [ ] Idempotency keys implemented
- [ ] Proper logging for all transactions

### 3. Compliance
- [ ] PCI DSS compliance (handled by Stripe)
- [ ] Brazilian payment regulations compliance
- [ ] Privacy policy updated with payment data handling
- [ ] Terms of service updated with payment terms

## 📈 Monitoring & Analytics

### 1. Stripe Dashboard Metrics
Monitor these key metrics:
- **Payment success rate**: >95%
- **Dispute rate**: <1%
- **Chargeback rate**: <0.5%
- **Payout success rate**: >99%

### 2. Custom Analytics
Track in your app:
- **Transaction volume** by payment method
- **User payment preferences**
- **Failed payment reasons**
- **Refund rates** by service category

### 3. Alerts Setup
Configure alerts for:
- Payment failures spike
- Unusual transaction patterns
- Webhook delivery failures
- API error rate increases

## 📞 Support & Resources

### Stripe Support
- **Email**: support@stripe.com
- **Phone**: +55 11 4040-4040 (Brazil)
- **Chat**: Available in Stripe dashboard
- **Documentation**: https://stripe.com/docs

### Integration Resources
- **PIX Guide**: https://stripe.com/docs/payments/pix
- **Brazil Guide**: https://stripe.com/docs/brazil
- **Webhooks**: https://stripe.com/docs/webhooks
- **Testing**: https://stripe.com/docs/testing