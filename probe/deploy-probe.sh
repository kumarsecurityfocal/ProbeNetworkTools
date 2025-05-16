#!/bin/bash

# ProbeOps Probe Node Deployment Script
# This script automates the deployment of a ProbeOps probe node on the target system
# It can accept either individual environment variables or a configuration token

set -e

# Colors for prettier output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REPO_URL="https://github.com/yourusername/probeops-probe.git"
PROBE_DIR="$HOME/probeops-probe"
BACKEND_URL="https://probeops.com"
AUTH_TYPE="token"
LOG_LEVEL="info"
TOKEN=""

# Function to print usage information
function print_usage {
  echo -e "${BLUE}ProbeOps Probe Node Deployment Script${NC}"
  echo
  echo "Usage:"
  echo "  $0 [options]"
  echo
  echo "Options:"
  echo "  --token TOKEN           Configuration token that contains all necessary settings"
  echo "  --uuid UUID             Node UUID assigned by the ProbeOps server"
  echo "  --key KEY               API key for authentication with the ProbeOps server"
  echo "  --backend URL           URL of the ProbeOps backend (default: https://probeops.com)"
  echo "  --repo URL              URL of the probe repository (default: uses public repo)"
  echo "  --dir PATH              Directory to install probe (default: ~/probeops-probe)"
  echo "  --help                  Show this help message"
  echo
  echo "Examples:"
  echo "  $0 --token \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\""
  echo "  $0 --uuid \"probe-123\" --key \"api-key-456\" --backend \"https://probeops.com\""
}

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --token) TOKEN="$2"; shift ;;
    --uuid) NODE_UUID="$2"; shift ;;
    --key) API_KEY="$2"; shift ;;
    --backend) BACKEND_URL="$2"; shift ;;
    --repo) REPO_URL="$2"; shift ;;
    --dir) PROBE_DIR="$2"; shift ;;
    --help) print_usage; exit 0 ;;
    *) echo "Unknown parameter: $1"; print_usage; exit 1 ;;
  esac
  shift
done

# If token is provided, we'll use it instead of individual settings
if [ ! -z "$TOKEN" ]; then
  echo -e "${GREEN}Token provided. Using token-based configuration...${NC}"
else
  # Check for required parameters
  if [ -z "$NODE_UUID" ] || [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: Node UUID and API Key are required.${NC}"
    echo "Please provide either a configuration token or both NODE_UUID and API_KEY."
    print_usage
    exit 1
  fi
fi

echo -e "${BLUE}=== ProbeOps Probe Node Deployment ===${NC}"
echo -e "${BLUE}Starting deployment process...${NC}"

# Create or update the probe directory
if [ -d "$PROBE_DIR" ]; then
  echo -e "${YELLOW}Probe directory already exists. Updating...${NC}"
  cd "$PROBE_DIR"
  git pull
else
  echo -e "${GREEN}Cloning probe repository...${NC}"
  git clone "$REPO_URL" "$PROBE_DIR" --depth 1
  cd "$PROBE_DIR"
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
  echo -e "${RED}Python 3 is not installed. Installing...${NC}"
  if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip python3-venv
  elif command -v yum &> /dev/null; then
    sudo yum install -y python3 python3-pip
  else
    echo -e "${RED}Could not install Python 3. Please install it manually.${NC}"
    exit 1
  fi
fi

# Set up Python virtual environment
echo -e "${GREEN}Setting up Python virtual environment...${NC}"
python3 -m venv venv
source venv/bin/activate

# Install requirements
echo -e "${GREEN}Installing dependencies...${NC}"
pip install -r requirements.txt

# Create or update the environment file
ENV_FILE="$PROBE_DIR/.env"
echo -e "${GREEN}Creating environment configuration...${NC}"

if [ ! -z "$TOKEN" ]; then
  # Token-based configuration
  echo "PROBEOPS_TOKEN=$TOKEN" > "$ENV_FILE"
  echo "AUTH_TYPE=token" >> "$ENV_FILE"
else
  # Individual environment variables
  cat > "$ENV_FILE" << EOF
PROBEOPS_NODE_UUID=$NODE_UUID
PROBEOPS_API_KEY=$API_KEY
PROBEOPS_BACKEND_URL=$BACKEND_URL
AUTH_TYPE=$AUTH_TYPE
LOG_LEVEL=$LOG_LEVEL
EOF
fi

# Create a systemd service file if running as root or sudo
if [ "$EUID" -eq 0 ] || [ $(id -u) -eq 0 ]; then
  echo -e "${GREEN}Creating systemd service...${NC}"
  
  cat > /etc/systemd/system/probeops.service << EOF
[Unit]
Description=ProbeOps Probe Node
After=network.target

[Service]
ExecStart=$PROBE_DIR/venv/bin/python $PROBE_DIR/run_probe_node.py
WorkingDirectory=$PROBE_DIR
Restart=always
User=$(logname)
Environment=PYTHONUNBUFFERED=1
EnvironmentFile=$ENV_FILE

[Install]
WantedBy=multi-user.target
EOF

  # Reload systemd and enable/start the service
  systemctl daemon-reload
  systemctl enable probeops.service
  systemctl start probeops.service
  
  echo -e "${GREEN}ProbeOps service is now running.${NC}"
  systemctl status probeops.service
else
  # Create a startup script for non-root users
  echo -e "${YELLOW}Not running as root, creating user-level startup script...${NC}"
  
  STARTUP_SCRIPT="$PROBE_DIR/start-probe.sh"
  cat > "$STARTUP_SCRIPT" << EOF
#!/bin/bash
cd "$PROBE_DIR"
source venv/bin/activate
source "$ENV_FILE"
python run_probe_node.py
EOF

  chmod +x "$STARTUP_SCRIPT"
  
  # Add to user's crontab for autostart
  echo -e "${GREEN}Adding to user crontab for autostart on reboot...${NC}"
  (crontab -l 2>/dev/null | grep -v "$STARTUP_SCRIPT"; echo "@reboot $STARTUP_SCRIPT") | crontab -
  
  echo -e "${GREEN}Starting the probe node...${NC}"
  nohup "$STARTUP_SCRIPT" > "$PROBE_DIR/probe.log" 2>&1 &
  
  echo -e "${GREEN}ProbeOps probe node is now running in the background.${NC}"
  echo -e "${YELLOW}You can check the logs at: $PROBE_DIR/probe.log${NC}"
fi

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${BLUE}=== ProbeOps Probe Node is now connected to $BACKEND_URL ===${NC}"