#!/bin/bash

# Simplified script to copy frontend assets to NGINX directory
# This script is used during deployment to copy built frontend assets

set -e

echo "========================="
echo "⚠️ IMPORTANT: Copying frontend assets to NGINX"
echo "========================="

# Variables
SRC_DIR="./public"
DEST_DIR="./nginx/frontend-build"

# Ensure the destination directory exists
mkdir -p "$DEST_DIR"

# Check if the frontend's build directory exists
if [ ! -d "$SRC_DIR" ]; then
    echo "❌ ERROR: Frontend build directory ($SRC_DIR) does not exist."
    echo "   Creating a placeholder index.html in the destination directory."
    echo '<html><head><title>ProbeOps</title></head><body><h1>ProbeOps</h1><p>Frontend assets not found. This is a placeholder.</p></body></html>' > "$DEST_DIR/index.html"
    echo "ProbeOps placeholder created at $(date)" > "$DEST_DIR/.probeops-build-copied"
    exit 0
fi

# Check if the frontend's build directory contains index.html
if [ ! -f "$SRC_DIR/index.html" ]; then
    echo "❌ WARNING: Frontend build directory does not contain index.html."
    echo "   Creating a placeholder index.html in the destination directory."
    echo '<html><head><title>ProbeOps</title></head><body><h1>ProbeOps</h1><p>Frontend assets not found. This is a placeholder.</p></body></html>' > "$DEST_DIR/index.html"
    echo "ProbeOps placeholder created at $(date)" > "$DEST_DIR/.probeops-build-copied"
    exit 0
fi

# Remove any existing files in the destination directory
rm -rf "$DEST_DIR"/*

# Copy the frontend build files to the nginx directory
echo "🔄 Copying frontend build files to $DEST_DIR..."

# Use a more explicit cp command
cp -rv "$SRC_DIR"/* "$DEST_DIR/" || {
    echo "❌ ERROR: Failed to copy files with cp -rv. Trying different approach..."
    find "$SRC_DIR" -type f -exec cp {} "$DEST_DIR/" \;
}

# Create a marker file
echo "ProbeOps frontend build copied at $(date)" > "$DEST_DIR/.probeops-build-copied"

# List files in destination directory for verification
echo "✅ Successfully copied frontend assets to $DEST_DIR"
echo "📂 Files in destination directory:"
ls -la "$DEST_DIR"

echo "========================="
echo "✅ FRONTEND ASSETS COPY COMPLETE"
echo "========================="