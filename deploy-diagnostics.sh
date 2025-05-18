#!/bin/bash
#
# ProbeOps Deploy Script - Authentication Monitoring Enhancement
# 
# This script adds diagnostic capabilities to your production infrastructure
# by enhancing the existing deploy.sh script.
#
# Add the following to your deploy.sh script:
# 
# # Setup diagnostics if requested
# if [ "$SETUP_DIAGNOSTICS" = "true" ]; then
#   echo "Setting up diagnostics dashboard..."
#   ./scripts/diagnostics-setup.sh $ENVIRONMENT
# fi

set -e

# Copy this script and the diagnostics tools to your production server
echo "Copying diagnostic tools to deployment server..."

# Copy diagnostic files to repository
cp debug-collector.js /path/to/your/repo/
cp diagnostic-dashboard.js /path/to/your/repo/
cp scripts/diagnostics-setup.sh /path/to/your/repo/scripts/

# Make the setup script executable
chmod +x /path/to/your/repo/scripts/diagnostics-setup.sh

# Update deploy.sh to include diagnostic setup
if ! grep -q "SETUP_DIAGNOSTICS" /path/to/your/repo/deploy.sh; then
  echo "Updating deploy.sh with diagnostics support..."
  
  # Find the right place to insert the diagnostics setup
  # This is usually after environment setup and before starting services
  sed -i '/ENVIRONMENT=/a\
# Enable diagnostics setup (change to "true" to enable)\
SETUP_DIAGNOSTICS=${SETUP_DIAGNOSTICS:-"false"}\
' /path/to/your/repo/deploy.sh
  
  # Add the diagnostics setup section
  sed -i '/Starting services/i\
# Setup diagnostics if requested\
if [ "$SETUP_DIAGNOSTICS" = "true" ]; then\
  echo "Setting up diagnostics dashboard..."\
  ./scripts/diagnostics-setup.sh $ENVIRONMENT\
fi\
' /path/to/your/repo/deploy.sh
fi

echo "============================================================"
echo "Diagnostic tools have been installed and deploy.sh updated!"
echo "To enable diagnostics on your next deployment, run:"
echo "SETUP_DIAGNOSTICS=true ./deploy.sh"
echo "============================================================"