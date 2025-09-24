#!/bin/bash

# Build script for Vercel deployment
echo "Starting build process..."

# Install dependencies
npm install

# Use the standard npm run build command
echo "Building application..."
npm run build

echo "Build complete! Files built to dist/"