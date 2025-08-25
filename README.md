# Shelfie - Digital Library Management

A full-stack digital library management application with advanced subscription management and barcode scanning.

## Deployment to Vercel

### Prerequisites
1. Build the client application locally first:
   ```bash
   npm run build:client
   ```

2. Ensure all environment variables are set in Vercel dashboard:
   - `DATABASE_URL` - PostgreSQL connection string
   - `STRIPE_SECRET_KEY` - Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (production)
   - `RAINFOREST_API_KEY` - Book metadata API key
   - `SESSION_SECRET` - Session encryption key

### Vercel Configuration
The project includes:
- `vercel.json` - Deployment configuration
- `api/index.ts` - Serverless function entry point
- `.vercelignore` - Files to exclude from deployment

### Build Process
1. Client builds to `client/dist/`
2. Vercel serves static files from `client/dist/`
3. API routes handled by `api/index.ts` serverless function
4. Database and external services work in production environment

### Deployment Steps
1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy - Vercel will automatically:
   - Build the client application
   - Deploy the serverless API function
   - Serve static files

## Local Development
```bash
npm run dev
```

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: Stripe subscriptions
- **Deployment**: Vercel serverless functions