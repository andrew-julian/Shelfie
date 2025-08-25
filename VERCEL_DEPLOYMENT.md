# Vercel Deployment Guide for Shelfie

## Database Setup

Your Shelfie app requires a PostgreSQL database. Here are your options for Vercel deployment:

### Option 1: Neon (Recommended)
1. Go to https://neon.tech
2. Create a new project or use your existing one
3. Get your connection string from the Neon dashboard
4. It should look like: `postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/database?sslmode=require`

### Option 2: Vercel Postgres
1. In your Vercel dashboard, go to your project
2. Go to Storage tab
3. Create a Postgres database
4. Vercel will automatically set the DATABASE_URL environment variable

## Environment Variables Setup

After deploying, you need to configure these environment variables in your Vercel dashboard:

### Required Variables:
- `DATABASE_URL` - Your PostgreSQL connection string
- `SESSION_SECRET` - A random string for session encryption
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET_PROD` - Your production Stripe webhook secret
- `VITE_STRIPE_PUBLIC_KEY` - Your Stripe publishable key
- `RAINFOREST_API_KEY` - Your Rainforest API key
- `REPL_ID` - Your Replit app ID
- `REPLIT_DOMAINS` - Your Vercel domain (e.g., "yourapp.vercel.app,workspace-92txorcdz-andrew-8095s-projects.vercel.app")
- `ISSUER_URL` - "https://replit.com/oidc"

### How to Set Environment Variables:
1. Go to your Vercel project dashboard
2. Click "Settings" tab
3. Click "Environment Variables"
4. Add each variable with its value
5. Make sure to set them for "Production" environment

## Database Migration

After setting up your database, you need to push your schema:

```bash
# Install dependencies locally if not already done
npm install

# Push database schema to production database
DATABASE_URL="your-production-database-url" npm run db:push
```

## Webhook Configuration

For Stripe webhooks to work in production:
1. Go to your Stripe dashboard
2. Add webhook endpoint: `https://yourapp.vercel.app/api/stripe-webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the webhook secret and set it as `STRIPE_WEBHOOK_SECRET_PROD`

## Deployment Command

```bash
vercel --prod
```

## Post-Deployment Checklist
- [ ] Database connection working
- [ ] Authentication flow working
- [ ] Stripe payments working
- [ ] Book scanning working
- [ ] Webhook receiving events

## Troubleshooting

### "Cannot GET /" Error
- Check if all environment variables are set in Vercel
- Verify DATABASE_URL is correctly configured
- Ensure REPLIT_DOMAINS includes your Vercel domain

### 401/404 API Errors
- Check that SESSION_SECRET is set
- Verify REPL_ID and ISSUER_URL are correct
- Make sure database tables exist (run db:push)

### Database Connection Issues
- Verify DATABASE_URL format: `postgresql://user:pass@host/db?sslmode=require`
- Check if database is accessible from Vercel
- Ensure sessions table exists

### Authentication Not Working
- Check REPLIT_DOMAINS matches your domain exactly
- Verify callback URL in Replit Auth settings
- Ensure cookies are working in production