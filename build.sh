#!/bin/bash

# Build script for Vercel deployment
echo "Starting build process..."

# Install dependencies
npm install

# Build the client (Vite frontend) - it outputs directly to dist/public
echo "Building client..."
cd client
npm run build
cd ..

echo "Build complete! Files built to dist/public/"