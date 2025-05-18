#!/bin/bash
# Reset script for ProbeOps Diagnostic Dashboard
# Use this script to troubleshoot issues with the diagnostic dashboard

echo "Resetting ProbeOps Diagnostic Dashboard..."

# Stop existing dashboard service
echo "Stopping existing diagnostic dashboard service..."
sudo pm2 stop probeops-diagnostics 2>/dev/null || true
sudo pm2 delete probeops-diagnostics 2>/dev/null || true

# Make sure debug-logs directory exists
echo "Creating debug logs directory if it doesn't exist..."
mkdir -p debug-logs

# Install latest dependencies
echo "Installing latest dependencies..."
cp diagnostics-package.json package.json
npm install

# Check if port 8888 is in use
PORT_PID=$(sudo lsof -t -i:8888 2>/dev/null)
if [ -n "$PORT_PID" ]; then
    echo "Port 8888 is currently in use by process $PORT_PID, stopping it..."
    sudo kill -9 $PORT_PID 2>/dev/null
    sleep 1
fi

# Start the diagnostic dashboard
echo "Starting diagnostic dashboard service..."
sudo pm2 start diagnostic-dashboard.js --name probeops-diagnostics

echo "Checking dashboard status..."
if curl -s http://localhost:8888/ping > /dev/null; then
    echo "✅ Diagnostic dashboard is running successfully"
    echo "You can access it at: http://$(hostname -I | awk '{print $1}'):8888"
else
    echo "⚠️ Diagnostic dashboard is not responding to ping"
    echo "Check logs with: sudo pm2 logs probeops-diagnostics"
fi

echo "Diagnostic dashboard reset completed"