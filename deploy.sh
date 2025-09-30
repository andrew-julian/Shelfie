#!/bin/bash

# Deployment script for Vercel using token authentication
echo "Starting Vercel deployment with token authentication..."

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
    echo "Error: VERCEL_TOKEN is not set. Please add it as a secret."
    echo "Get your token from: https://vercel.com/account/tokens"
    exit 1
fi

# Build the project first
echo "Building application..."
npm run build

# Deploy to Vercel using token authentication
echo "Deploying to Vercel..."
vercel --prod --token=$VERCEL_TOKEN --yes

echo "Deployment complete!"