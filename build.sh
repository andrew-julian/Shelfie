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

# Create dist directory and copy client build
echo "Copying client build to dist directory..."
mkdir -p dist
cp -r client/dist/* dist/

echo "Build complete!"