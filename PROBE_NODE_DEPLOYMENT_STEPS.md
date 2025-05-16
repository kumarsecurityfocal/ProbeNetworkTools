# ProbeOps Probe Node Deployment Guide

This document outlines the steps to deploy a ProbeOps probe node on a remote server.

## Prerequisites

- A Linux server with internet access
- Docker and Docker Compose (automatically installed if missing)
- A valid ProbeOps account with admin access
- A registration token generated from the ProbeOps admin panel

## Deployment Steps

### 1. Generate a Registration Token

1. Log in to your ProbeOps admin panel
2. Navigate to "Probe Node Management"
3. Click "Create Registration Token"
4. Set a description and expiry time
5. Save the token information for the next step

### 2. Set Environment Variables

On your target server, set the following environment variables:

```bash
# Required variables
export PROBEOPS_BACKEND_URL="https://yourdomain.probeops.com"
export PROBEOPS_NODE_UUID="node-uuid-from-registration"
export PROBEOPS_API_KEY="api-key-from-registration"

# Optional variables
export PROBEOPS_HEARTBEAT_INTERVAL="15"  # Seconds between heartbeats
export PROBEOPS_LOG_LEVEL="INFO"         # Log verbosity (DEBUG, INFO, WARNING, ERROR)
```

### 3. Run the Deployment Script

```bash
chmod +x deploy-probe.sh
./deploy-probe.sh
```

The script will:
- Verify environment variables
- Install Docker and Docker Compose if needed
- Create necessary configuration files
- Pull the latest probe node code
- Build and start the Docker container
- Verify the probe node's connection to the backend

### 4. Verify Deployment

After deployment, you can:

- Check container status: `docker ps`
- View logs: `docker-compose -f docker-compose.probe.yml logs -f`
- Monitor the probe in your ProbeOps admin panel

### 5. Post-Deployment Configuration

The probe node will automatically:
- Connect to your ProbeOps backend via WebSocket on port 443
- Authenticate using the provided API key
- Send regular heartbeats to indicate its status
- Execute diagnostic commands when instructed by the backend

### 6. Troubleshooting

If you encounter connectivity issues:

1. Run the verification script:
   ```bash
   ./verify-probe-connection.sh --url https://yourdomain.probeops.com
   ```

2. Check the probe logs:
   ```bash
   docker-compose -f docker-compose.probe.yml logs -f
   ```

3. Verify the backend is accessible:
   ```bash
   curl -v https://yourdomain.probeops.com/health
   ```

4. Ensure your firewall allows outbound connections on port 443

### 7. Updating the Probe Node

To update your probe node:

```bash
# Pull latest changes
docker-compose -f docker-compose.probe.yml pull

# Restart the container
docker-compose -f docker-compose.probe.yml up -d
```