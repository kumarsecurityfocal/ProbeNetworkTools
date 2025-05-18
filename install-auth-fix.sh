#!/bin/bash
# ProbeOps Authentication Fix Installation Script
# This script installs and configures the authentication fix on the AWS server

# Create directories if they don't exist
mkdir -p /opt/probeops/logs
mkdir -p /opt/probeops/scripts

# Copy files
cp aws-auth-fix.js /opt/probeops/scripts/
chmod +x /opt/probeops/scripts/aws-auth-fix.js

# Install dependencies
echo "Installing required npm packages..."
cd /opt/probeops/scripts
npm install jsonwebtoken

# Set up service for automatic startup
echo "Creating systemd service..."
cat > /etc/systemd/system/probeops-auth.service <<EOF
[Unit]
Description=ProbeOps Authentication Fix
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/probeops/scripts
ExecStart=/usr/bin/node /opt/probeops/scripts/aws-auth-fix.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=probeops-auth

[Install]
WantedBy=multi-user.target
EOF

# Configure service to start on boot
systemctl daemon-reload
systemctl enable probeops-auth.service
systemctl start probeops-auth.service

echo "=====================================================
ProbeOps Authentication Fix installed successfully!
=====================================================

The auth fix is now running as a service and will start automatically on boot.

Logs are available at:
- /opt/probeops/logs/auth.log
- /opt/probeops/logs/proxy.log
- /opt/probeops/logs/errors.log

You can check the service status with:
  systemctl status probeops-auth.service

To view logs in real-time:
  tail -f /opt/probeops/logs/auth.log
"