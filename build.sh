#!/bin/bash

# Build script for Vercel deployment
echo "Starting build process..."

# Install dependencies
npm install

# Build the client (Vite frontend) - it outputs directly to dist/public
echo "Building client..."
npm run build

echo "Build complete! Files built to dist/public/"