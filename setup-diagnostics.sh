#!/bin/bash
# Setup script for ProbeOps Diagnostic Dashboard
# This script installs dependencies and sets up the diagnostic dashboard

echo "Setting up ProbeOps Diagnostic Dashboard..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    echo "You can install it with: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

# Copy package.json for the diagnostic dashboard
cp diagnostics-package.json package.json

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if port 8888 is open in firewall
echo "Checking if port 8888 is open..."
if ! sudo iptables -L | grep -q "dpt:8888"; then
    echo "Opening port 8888 in the firewall..."
    sudo iptables -A INPUT -p tcp --dport 8888 -j ACCEPT
    echo "Port 8888 opened in the firewall"
else
    echo "Port 8888 is already open"
fi

echo "Installing pm2 for running the diagnostic dashboard as a service..."
npm install -g pm2

echo "Setting up the diagnostic dashboard as a service..."
pm2 start diagnostic-dashboard.js --name "probeops-diagnostics"
pm2 save
pm2 startup

echo "Setup complete!"
echo "You can access the diagnostic dashboard at: http://YOUR_SERVER_IP:8888"
echo "To check the logs: pm2 logs probeops-diagnostics"
echo "To stop the service: pm2 stop probeops-diagnostics"
echo "To start the service: pm2 start probeops-diagnostics"