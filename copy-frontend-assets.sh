#!/bin/bash

# Script to copy frontend assets to the NGINX container's image
# This script is intended to be run during the Docker build process

set -e

echo "========================="
echo "⚠️ IMPORTANT: If this script is being run, it means the build process is working properly"
echo "========================="

# Variables
SRC_DIR="./frontend/dist"
DEST_DIR="./nginx/frontend-build"

# Ensure the destination directory exists
mkdir -p "$DEST_DIR"

# Check if the frontend's dist directory exists
if [ ! -d "$SRC_DIR" ]; then
    echo "❌ ERROR: Frontend build directory ($SRC_DIR) does not exist."
    echo "❌ Please build the frontend before running this script."
    echo "❌ You can build the frontend by running: cd frontend && npm run build"
    exit 1
fi

# Check if the frontend's dist directory contains index.html
if [ ! -f "$SRC_DIR/index.html" ]; then
    echo "❌ ERROR: Frontend build directory does not contain index.html."
    echo "❌ This suggests that the frontend build process did not complete successfully."
    exit 1
fi

# Remove any existing files in the destination directory
rm -rf "$DEST_DIR"/*

# Copy the frontend build files to the nginx directory
echo "🔄 Copying frontend build files to $DEST_DIR..."
cp -r "$SRC_DIR"/* "$DEST_DIR/"
cp -r "$SRC_DIR/.probeops-build-ok" "$DEST_DIR/" 2>/dev/null || :

# Create a marker file
echo "ProbeOps frontend build copied at $(date)" > "$DEST_DIR/.probeops-build-copied"

# List files in destination directory for verification
echo "✅ Successfully copied frontend assets to $DEST_DIR"
echo "📂 Files in destination directory:"
ls -la "$DEST_DIR"

echo "========================="
echo "✅ FRONTEND ASSETS COPY COMPLETE"
echo "========================="