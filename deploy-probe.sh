#!/bin/bash
set -e

# ProbeOps Probe Node Deployment Script
# This script deploys a ProbeOps probe node to an AWS EC2 instance

# Check if required environment variables are set
if [ -z "$PROBEOPS_BACKEND_URL" ]; then
  echo "Error: PROBEOPS_BACKEND_URL environment variable is not set"
  echo "Example: export PROBEOPS_BACKEND_URL=https://probeops.com"
  exit 1
fi

if [ -z "$PROBEOPS_NODE_UUID" ]; then
  echo "Error: PROBEOPS_NODE_UUID environment variable is not set"
  echo "Example: export PROBEOPS_NODE_UUID=<uuid-from-admin-panel>"
  exit 1
fi

if [ -z "$PROBEOPS_API_KEY" ]; then
  echo "Error: PROBEOPS_API_KEY environment variable is not set"
  echo "Example: export PROBEOPS_API_KEY=<api-key-from-admin-panel>"
  exit 1
fi

# Print deployment information
echo "ProbeOps Probe Node Deployment"
echo "=============================="
echo "Backend URL: $PROBEOPS_BACKEND_URL"
echo "Node UUID: $PROBEOPS_NODE_UUID"
echo "API Key: ${PROBEOPS_API_KEY:0:5}..."
echo ""

# Create .env file for Docker Compose
echo "Creating .env file for Docker Compose..."
cat > .env << EOL
PROBEOPS_BACKEND_URL=$PROBEOPS_BACKEND_URL
PROBEOPS_NODE_UUID=$PROBEOPS_NODE_UUID
PROBEOPS_API_KEY=$PROBEOPS_API_KEY
PROBEOPS_HEARTBEAT_INTERVAL=${PROBEOPS_HEARTBEAT_INTERVAL:-15}
PROBEOPS_LOG_LEVEL=${PROBEOPS_LOG_LEVEL:-INFO}
EOL

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
  echo "Docker not found. Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  echo "Docker installed successfully."
  echo "Please log out and log back in to apply group changes, then run this script again."
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo "Docker Compose not found. Installing Docker Compose..."
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  echo "Docker Compose installed successfully."
fi

# Pull the latest code if repository exists, otherwise clone it
if [ -d "ProbeNetworkTools" ]; then
  echo "Repository exists, pulling latest changes..."
  cd ProbeNetworkTools
  git pull
else
  echo "Cloning repository..."
  git clone https://github.com/ProbeOps/ProbeNetworkTools.git
  cd ProbeNetworkTools
fi

# Copy the .env file
cp ../.env .

# Run Docker Compose
echo "Deploying probe node with Docker Compose..."
docker-compose -f docker-compose.probe.yml down
docker-compose -f docker-compose.probe.yml pull
docker-compose -f docker-compose.probe.yml up -d

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Probe node deployment successful!"
  echo "To check the logs, run: docker-compose -f docker-compose.probe.yml logs -f"
  echo "To stop the probe node, run: docker-compose -f docker-compose.probe.yml down"
else
  echo ""
  echo "❌ Probe node deployment failed!"
  echo "Please check the logs for more information."
  exit 1
fi

# Print connection status
echo ""
echo "Waiting for probe node to connect to the backend..."
sleep 5
docker-compose -f docker-compose.probe.yml logs | grep -i "connected" | tail -n 5

echo ""
echo "Probe node is now running and will automatically connect to the backend."
echo "You can monitor the node's status in the ProbeOps admin panel."