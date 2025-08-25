#!/bin/bash

# Build script for Vercel deployment
echo "Starting build process..."

# Install dependencies
npm install

# Build the client (Vite frontend)
echo "Building client..."
cd client
npm run build
cd ..

# Copy client build to server public directory
echo "Copying client build to server..."
mkdir -p server/public
cp -r client/dist/* server/public/

# Install production dependencies
echo "Installing production dependencies..."
npm ci --omit=dev

echo "Build complete!"