# ProbeOps Probe Node Deployment Guide

This document outlines the steps to deploy a ProbeOps probe node on a remote server.

## Prerequisites

- A Linux server with internet access
- Python 3.8+ (or Docker for containerized deployment)
- A valid ProbeOps account with admin access
- A registration token generated from the ProbeOps admin panel

## Deployment Methods

ProbeOps now supports two deployment methods:

1. **Token-Based Deployment (Recommended)**: Uses a single JWT token that contains all configuration
2. **Parameter-Based Deployment**: Uses individual environment variables or command line parameters

## Token-Based Deployment (Recommended)

### 1. Generate a Probe Node Token

1. Log in to your ProbeOps admin panel
2. Navigate to "Probe Management" → "Generate Tokens" tab
3. Complete the token generation form:
   - Node Name: A friendly name for this probe node
   - Node Description: Optional details about this node
   - Expiry Period: How long the token should remain valid (30 days recommended)
   - Heartbeat Interval: How often the node sends status updates (15 seconds default)
   - Log Level: Verbosity of logging (INFO recommended)
4. Click "Generate Token"
5. Copy the displayed JWT token - you'll need this for deployment

### 2. Deploy Using Token

On your target server:

```bash
# Clone the repository
git clone https://github.com/your-organization/ProbeNetworkTools.git
cd ProbeNetworkTools/probe

# Option 1: Direct Python Execution
export PROBEOPS_TOKEN="your-jwt-token-from-step-1"
python run_probe_node_token.py --token "$PROBEOPS_TOKEN"

# Option 2: Using the Deployment Script
chmod +x deploy-probe.sh
./deploy-probe.sh --token "your-jwt-token-from-step-1"
```

The deployment script will:
- Install required dependencies
- Configure the probe as a system service (if applicable)
- Start the probe node process
- Verify connectivity to the backend

## Parameter-Based Deployment (Legacy Method)

### 1. Set Environment Variables

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

### 2. Run the Deployment Script

```bash
chmod +x deploy-probe.sh
./deploy-probe.sh
```

## Containerized Deployment

For Docker-based deployment:

```bash
# Clone the repository
git clone https://github.com/your-organization/ProbeNetworkTools.git
cd ProbeNetworkTools

# Create environment file
echo "PROBEOPS_TOKEN=your-jwt-token-from-step-1" > .env.probe

# Start the container
docker compose -f docker-compose.probe.yml up -d
```

## Verifying Deployment

After deployment, you can:

- Check service status (for systemd): `systemctl status probeops-node`
- View logs: `journalctl -u probeops-node -f`
- If using Docker: `docker compose -f docker-compose.probe.yml logs -f`
- Monitor the probe in your ProbeOps admin panel under "Probe Management" → "Probe Nodes"

## Managing Tokens

To manage existing probe node tokens:

1. Navigate to "Probe Management" → "Manage Tokens" tab
2. Here you can:
   - View all existing tokens and their status
   - Revoke tokens (disable them while keeping history)
   - Permanently delete tokens (completely remove them)
   - Copy token values for redeployment

## Troubleshooting

If you encounter connectivity issues:

1. Check the probe logs:
   ```bash
   # For systemd service
   journalctl -u probeops-node -f
   
   # For Docker deployment
   docker compose -f docker-compose.probe.yml logs -f
   ```

2. Verify the backend is accessible:
   ```bash
   curl -v https://yourdomain.probeops.com/health
   ```

3. Ensure your firewall allows outbound connections on port 443 (HTTPS)

4. Check token validity in the "Manage Tokens" interface

## Updating the Probe Node

To update your probe node:

```bash
# Stop the current service
systemctl stop probeops-node

# Pull latest code
git pull

# Update dependencies
pip install -r requirements.txt

# Restart the service
systemctl start probeops-node
```

For Docker deployment:

```bash
# Pull latest changes
docker compose -f docker-compose.probe.yml pull

# Restart the container
docker compose -f docker-compose.probe.yml up -d
```