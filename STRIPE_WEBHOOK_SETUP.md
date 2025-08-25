# Stripe Webhook Configuration Guide

## Environment-Specific Webhook Setup

### Development (Replit)
- **Webhook URL**: `https://[your-replit-domain]/api/stripe-webhook`
- **Environment Variable**: `STRIPE_WEBHOOK_SECRET`

### Production (shelfie.site)
- **Webhook URL**: `https://www.shelfie.site/api/stripe-webhook`
- **Environment Variable**: `STRIPE_WEBHOOK_SECRET_PROD`

## Required Webhook Events

When adding the webhook destination in your Stripe dashboard, select these specific events:

### Essential Events:
1. **`checkout.session.completed`**
   - Triggered when a customer completes the checkout process
   - Used to activate subscriptions and process one-time payments

2. **`customer.subscription.updated`**
   - Triggered when subscription details change (status, billing cycle, etc.)
   - Used to update subscription status and expiration dates

3. **`customer.subscription.deleted`**
   - Triggered when a subscription is canceled or deleted
   - Used to handle subscription cancellations

### Optional (Recommended) Events:
4. **`invoice.payment_succeeded`**
   - Triggered when subscription renewal payments succeed
   - Used for renewal confirmations and extending subscription periods

5. **`invoice.payment_failed`**
   - Triggered when subscription payments fail
   - Used to handle failed payments and notify users

6. **`customer.subscription.created`**
   - Triggered when a new subscription is created
   - Used for additional subscription setup logic

## Stripe Dashboard Configuration Steps

### 1. Add Development Webhook
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. **Endpoint URL**: `https://[your-replit-domain]/api/stripe-webhook`
4. **Events to send**: Select the events listed above
5. **API Version**: Use latest (recommended)
6. Click "Add endpoint"
7. Copy the "Signing secret" (starts with `whsec_`)
8. Add to Replit Secrets as `STRIPE_WEBHOOK_SECRET`

### 2. Add Production Webhook
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. **Endpoint URL**: `https://www.shelfie.site/api/stripe-webhook`
4. **Events to send**: Select the same events as development
5. **API Version**: Use latest (recommended)
6. Click "Add endpoint"
7. Copy the "Signing secret" (starts with `whsec_`)
8. Add to production environment as `STRIPE_WEBHOOK_SECRET_PROD`

## Environment Variables Required

### Development (Replit Secrets):
```
STRIPE_WEBHOOK_SECRET=whsec_[development_secret]
```

### Production (Server Environment):
```
STRIPE_WEBHOOK_SECRET_PROD=whsec_[production_secret]
NODE_ENV=production
```

## Webhook Event Details

### checkout.session.completed
**Purpose**: Process successful checkout completions
**Required Data**:
- `session.id` - Checkout session identifier
- `session.customer` - Stripe customer ID
- `session.subscription` - Subscription ID (for subscriptions)
- `session.metadata.userId` - Your application user ID

### customer.subscription.updated
**Purpose**: Handle subscription status changes
**Required Data**:
- `subscription.status` - Current subscription status
- `subscription.current_period_end` - Subscription expiration timestamp
- `subscription.customer` - Stripe customer ID

### customer.subscription.deleted
**Purpose**: Handle subscription cancellations
**Required Data**:
- `subscription.customer` - Stripe customer ID
- `subscription.status` - Final status (should be "canceled")

## Testing Webhooks

### Development Testing:
1. Use Stripe CLI for local testing: `stripe listen --forward-to localhost:5000/api/stripe-webhook`
2. Test with Stripe's webhook testing tool in dashboard
3. Use test mode transactions

### Production Testing:
1. Create test transactions in Stripe test mode
2. Verify webhook delivery in Stripe dashboard
3. Monitor server logs for successful processing

## Security Considerations

1. **Signature Verification**: Always verify webhook signatures using Stripe's libraries
2. **Environment Separation**: Use different webhook secrets for development and production
3. **Logging**: Log webhook events for debugging but never log sensitive data
4. **Error Handling**: Implement proper error handling and return appropriate HTTP status codes

## Troubleshooting

### Common Issues:
1. **Signature Verification Failed**: Check webhook secret configuration
2. **Raw Body Required**: Ensure request body is not parsed as JSON before signature verification
3. **Environment Mismatch**: Verify correct webhook secret is used for each environment

### Debug Steps:
1. Check webhook delivery attempts in Stripe dashboard
2. Verify endpoint URL is accessible
3. Review server logs for error details
4. Test webhook signature verification independently