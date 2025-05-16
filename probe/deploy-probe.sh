#!/bin/bash
# ProbeOps Probe Node Deployment Script
# This script deploys a ProbeOps probe node with token-based configuration

# Default values
PROBE_REPO="https://github.com/probeops/probe-node.git"
INSTALL_DIR="/opt/probeops/probe"
PYTHON_VERSION="3.9"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --token)
      TOKEN="$2"
      shift
      shift
      ;;
    --node-uuid)
      NODE_UUID="$2"
      shift
      shift
      ;;
    --api-key)
      API_KEY="$2"
      shift
      shift
      ;;
    --backend-url)
      BACKEND_URL="$2"
      shift
      shift
      ;;
    --install-dir)
      INSTALL_DIR="$2"
      shift
      shift
      ;;
    --help)
      echo "ProbeOps Probe Node Deployment Script"
      echo ""
      echo "Usage:"
      echo "  ./deploy-probe.sh --token TOKEN"
      echo "  OR"
      echo "  ./deploy-probe.sh --node-uuid UUID --api-key KEY --backend-url URL"
      echo ""
      echo "Options:"
      echo "  --token TOKEN        Use token-based configuration (recommended)"
      echo "  --node-uuid UUID     Node UUID for registration (if not using token)"
      echo "  --api-key KEY        API key for authentication (if not using token)"
      echo "  --backend-url URL    Backend URL (if not using token)"
      echo "  --install-dir DIR    Installation directory (default: /opt/probeops/probe)"
      echo "  --help               Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $key"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check for token OR individual parameters
if [ -z "$TOKEN" ] && ([ -z "$NODE_UUID" ] || [ -z "$API_KEY" ] || [ -z "$BACKEND_URL" ]); then
  echo "Error: You must provide either a token OR all of: node-uuid, api-key, and backend-url"
  echo "Use --help for usage information"
  exit 1
fi

# Create installation directory
echo "Creating installation directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR" || exit 1

# Install dependencies
echo "Installing system dependencies..."
if command -v apt-get >/dev/null; then
  # Debian/Ubuntu
  apt-get update
  apt-get install -y python3 python3-pip python3-venv git
elif command -v yum >/dev/null; then
  # CentOS/RHEL
  yum install -y python3 python3-pip git
elif command -v apk >/dev/null; then
  # Alpine
  apk add --no-cache python3 py3-pip git
else
  echo "Unsupported package manager. Please install Python 3, pip, and git manually."
  exit 1
fi

# Clone repository (public access, no credentials needed)
echo "Cloning probe repository..."
if [ -d ".git" ]; then
  echo "Repository already exists, updating..."
  git pull
else
  git clone --depth 1 "$PROBE_REPO" .
fi

# Set up Python virtual environment
echo "Setting up Python virtual environment..."
python3 -m venv venv
# shellcheck disable=SC1091
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -U pip
pip install -r requirements.txt
pip install websockets pyjwt requests

# Create service configuration file
echo "Creating service configuration..."
if [ -n "$TOKEN" ]; then
  # Token-based configuration
  cat > config.env << EOF
PROBEOPS_TOKEN=$TOKEN
EOF
  RUN_COMMAND="python run_probe_node_token.py --token \"\$PROBEOPS_TOKEN\""
else
  # Individual parameter configuration
  cat > config.env << EOF
PROBEOPS_NODE_UUID=$NODE_UUID
PROBEOPS_API_KEY=$API_KEY
PROBEOPS_BACKEND_URL=$BACKEND_URL
EOF
  RUN_COMMAND="python run_probe_node.py --uuid \"\$PROBEOPS_NODE_UUID\" --key \"\$PROBEOPS_API_KEY\" --backend \"\$PROBEOPS_BACKEND_URL\""
fi

# Create systemd service file
if command -v systemctl >/dev/null; then
  echo "Creating systemd service..."
  cat > /etc/systemd/system/probeops-node.service << EOF
[Unit]
Description=ProbeOps Probe Node
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/config.env
ExecStart=$INSTALL_DIR/venv/bin/python $INSTALL_DIR/run_probe_node_token.py --token "\${PROBEOPS_TOKEN}"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

  # Enable and start the service
  echo "Enabling and starting service..."
  systemctl daemon-reload
  systemctl enable probeops-node
  systemctl start probeops-node
  
  echo "Service status:"
  systemctl status probeops-node
else
  # Create a simple init script for systems without systemd
  echo "Creating init script..."
  cat > /etc/init.d/probeops-node << EOF
#!/bin/bash
### BEGIN INIT INFO
# Provides:          probeops-node
# Required-Start:    \$network \$remote_fs \$syslog
# Required-Stop:     \$network \$remote_fs \$syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: ProbeOps Probe Node
# Description:       ProbeOps network diagnostics probe
### END INIT INFO

INSTALL_DIR=$INSTALL_DIR
PIDFILE=/var/run/probeops-node.pid
LOGFILE=/var/log/probeops-node.log

start() {
    echo "Starting ProbeOps Probe Node"
    if [ -f \$PIDFILE ]; then
        echo "Already running (PID: \$(cat \$PIDFILE))"
        return 1
    fi
    
    cd \$INSTALL_DIR || exit 1
    source venv/bin/activate
    source config.env
    
    nohup $RUN_COMMAND > \$LOGFILE 2>&1 &
    echo \$! > \$PIDFILE
    echo "Started with PID: \$(cat \$PIDFILE)"
}

stop() {
    echo "Stopping ProbeOps Probe Node"
    if [ -f \$PIDFILE ]; then
        PID=\$(cat \$PIDFILE)
        kill \$PID
        rm \$PIDFILE
        echo "Stopped (PID: \$PID)"
    else
        echo "Not running"
    fi
}

status() {
    if [ -f \$PIDFILE ]; then
        PID=\$(cat \$PIDFILE)
        if ps -p \$PID > /dev/null; then
            echo "Running (PID: \$PID)"
            return 0
        else
            echo "Not running (stale PID file)"
            return 1
        fi
    else
        echo "Not running"
        return 1
    fi
}

case "\$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        start
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: \$0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0
EOF

  chmod +x /etc/init.d/probeops-node
  
  # Try to enable with update-rc.d if available
  if command -v update-rc.d >/dev/null; then
    update-rc.d probeops-node defaults
  elif command -v chkconfig >/dev/null; then
    chkconfig --add probeops-node
  fi
  
  # Start the service
  /etc/init.d/probeops-node start
fi

echo ""
echo "ProbeOps Probe Node deployed successfully!"
echo "Installation directory: $INSTALL_DIR"
if [ -n "$TOKEN" ]; then
  echo "Using token-based configuration"
else
  echo "Using parameter-based configuration"
  echo "Node UUID: $NODE_UUID"
  echo "Backend URL: $BACKEND_URL"
fi
echo ""
echo "To check the status of the service:"
if command -v systemctl >/dev/null; then
  echo "  systemctl status probeops-node"
  echo "To view logs:"
  echo "  journalctl -u probeops-node -f"
else
  echo "  /etc/init.d/probeops-node status"
  echo "To view logs:"
  echo "  cat /var/log/probeops-node.log"
fi
echo ""
echo "The probe node will automatically connect to the backend and register."