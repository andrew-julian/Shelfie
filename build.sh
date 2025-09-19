#!/bin/bash

# Build script for Vercel deployment
echo "Starting build process..."

# Install dependencies
npm install

# Build the client (Vite frontend) and backend
echo "Building client..."
vite build

# For production, we don't need to build the server as Vercel handles serverless functions
# Just ensure the client build is complete
echo "Client build complete! Files built to dist/public/"