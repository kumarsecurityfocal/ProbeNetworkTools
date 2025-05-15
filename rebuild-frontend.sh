#!/bin/bash
set -e

echo "Starting frontend rebuild process..."
cd frontend

# Use our improved build process if available
if [ -f "docker-build.sh" ]; then
    chmod +x docker-build.sh
    ./docker-build.sh
else
    # Fallback to standard approach, but with better dependency handling
    echo "Installing required dependencies..."
    npm install --legacy-peer-deps
    npm install autoprefixer postcss tailwindcss --no-save --legacy-peer-deps
    
    echo "Building frontend..."
    npm run build -- --outDir=../public
fi

cd ..
echo "Frontend rebuilt successfully"
echo "Output files are in the ./public directory"