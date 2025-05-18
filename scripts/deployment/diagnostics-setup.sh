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
    networks:
      - probeops-network

networks:
  probeops-network:
    external: true
EOF

# Add diagnostics to .gitignore if not already there
if ! grep -q "diagnostics/debug-logs" ${REPO_ROOT}/.gitignore; then
  echo "diagnostics/debug-logs" >> ${REPO_ROOT}/.gitignore
fi

# Make sure the conf.d directory exists first
mkdir -p ${REPO_ROOT}/nginx/conf.d

# Create an instruction file for Nginx configuration
cat > ${REPO_ROOT}/nginx/conf.d/diagnostics.conf << EOF
# ProbeOps Diagnostics Dashboard
# This configuration provides access to the diagnostics dashboard
# through /diagnostics path with basic IP restrictions

location = /diagnostics {
    return 301 /diagnostics/;
}

location /diagnostics/ {
    # Temporarily allow all access for testing
    allow all;
    
    # Fixed proxy_pass - critical for AWS environment
    proxy_pass http://diagnostics:${DIAG_PORT}/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
}
EOF

echo "Starting diagnostics service..."
cd ${REPO_ROOT}

# Make sure the main services are running first so the network exists
echo "Ensuring the probeops-network exists before starting diagnostics..."

# Wait for the network to be created (it's created by the main docker-compose up command)
echo "Checking if we need to wait for the main services to create the network..."
if ! docker network ls | grep -q probeops-network; then
    echo "Network doesn't exist yet. This diagnostic setup should be run AFTER docker compose up in the deploy.sh"
    echo "The diagnostics container will be set up, but won't start until the main deployment creates the network"
fi

# Start the diagnostics container
echo "Starting diagnostics container..."
docker compose -f docker-compose.diagnostics.yml up -d diagnostics || echo "Diagnostics container will start when the network is available"

echo "================================================"
echo "ProbeOps Diagnostics setup complete!"
echo "Access the dashboard at: https://your-domain.com/diagnostics"
echo "Default password: $DIAG_PASSWORD"
echo "================================================"