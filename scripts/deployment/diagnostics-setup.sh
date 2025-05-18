#!/bin/bash
#
# ProbeOps Diagnostics Deployment Script
# 
# This script integrates the diagnostics tool into the main deployment pipeline.
# It should be called from deploy.sh to enable diagnostic tools.
#
# Usage: ./scripts/deployment/diagnostics-setup.sh [ENV]
# ENV: production, staging (default: production)

set -e

ENV=${1:-production}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DIAG_PORT=${DIAGNOSTIC_PORT:-7777}
DIAG_PASSWORD=${DIAGNOSTIC_PASSWORD:-"probeops-diagnostics"}

echo "Setting up ProbeOps Diagnostics for $ENV environment..."

# Create diagnostics directory if it doesn't exist
mkdir -p ${REPO_ROOT}/diagnostics/debug-logs

# Copy diagnostic scripts to the diagnostics directory
echo "Installing diagnostic tools..."
cp ${REPO_ROOT}/debug-collector.js ${REPO_ROOT}/diagnostics/
cp ${REPO_ROOT}/diagnostic-dashboard.js ${REPO_ROOT}/diagnostics/

# Create Docker Compose override file for diagnostics
cat > ${REPO_ROOT}/docker-compose.diagnostics.yml << EOF
services:
  diagnostics:
    image: node:20-alpine
    container_name: probenetworktools-diagnostics
    working_dir: /app
    volumes:
      - ./diagnostics:/app
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - DIAGNOSTIC_PORT=${DIAG_PORT}
      - DIAGNOSTIC_PASSWORD=${DIAG_PASSWORD}
      - NODE_ENV=${ENV}
    ports:
      - "${DIAG_PORT}:${DIAG_PORT}"
    command: sh -c "npm init -y && npm install express pg && node diagnostic-dashboard.js"
    restart: unless-stopped
    # Use the default network created by docker-compose
EOF

# Add diagnostics to .gitignore if not already there
if ! grep -q "diagnostics/debug-logs" ${REPO_ROOT}/.gitignore; then
  echo "diagnostics/debug-logs" >> ${REPO_ROOT}/.gitignore
fi

# Create an instruction file for Nginx configuration
cat > ${REPO_ROOT}/nginx/conf.d/diagnostics.conf << EOF
# ProbeOps Diagnostics Dashboard
# This configuration provides access to the diagnostics dashboard
# through /diagnostics path with basic IP restrictions

location /diagnostics/ {
    # Restrict access to private networks (customize as needed)
    allow 127.0.0.1;
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    allow 192.168.0.0/16;
    
    proxy_pass http://diagnostics:${DIAG_PORT}/diagnostics/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF

# Make sure the conf.d directory exists
mkdir -p ${REPO_ROOT}/nginx/conf.d

echo "Starting diagnostics service..."
cd ${REPO_ROOT}

# Check if any containers are running
if [ "$(docker ps -q)" != "" ]; then
    # Use the bridge network which is guaranteed to exist
    echo "Using default bridge network for diagnostics container"
    docker compose -f docker-compose.diagnostics.yml up -d diagnostics
else
    # If this is a first-time deployment with no containers, start with main compose file first
    echo "No containers running. Starting diagnostics with main services"
    docker compose up -d
    docker compose -f docker-compose.diagnostics.yml up -d diagnostics
fi

echo "================================================"
echo "ProbeOps Diagnostics setup complete!"
echo "Access the dashboard at: https://your-domain.com/diagnostics"
echo "Default password: $DIAG_PASSWORD"
echo "================================================"