#!/bin/bash
set -e

echo "Starting frontend build process..."

# Clean npm cache and remove node_modules to start fresh
echo "Cleaning environment..."
rm -rf node_modules package-lock.json
npm cache clean --force

# Install dependencies with legacy-peer-deps to avoid peer dependency conflicts
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Install PostCSS and Tailwind plugins explicitly
echo "Installing PostCSS and Tailwind plugins..."
npm install autoprefixer postcss tailwindcss --no-save --legacy-peer-deps

# Build the frontend
echo "Building frontend..."
npm run build -- --outDir=../public

echo "Frontend build completed successfully!"