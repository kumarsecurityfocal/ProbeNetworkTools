#!/bin/bash
set -e

# Log auth bypass status
if [ "$AUTH_BYPASS" = "true" ]; then
    echo "⚠️  RUNNING PROXY WITH AUTH BYPASS ENABLED ⚠️"
    echo "⚠️  DO NOT USE THIS IN PRODUCTION ⚠️"
    
    # Ensure server.clean.js is copied to server.js
    if [ -f /app/server.clean.js ]; then
        echo "Ensuring auth bypass is active by copying server.clean.js to server.js"
        cp /app/server.clean.js /app/server.js
    else
        echo "Warning: server.clean.js not found!"
    fi
else
    echo "Running with standard authentication proxy (auth bypass disabled)"
    
    # If we have an original server.js, restore it
    if [ -f /app/auth_backups/server.js.original ]; then
        echo "Restoring original server.js from backup"
        cp /app/auth_backups/server.js.original /app/server.js
    fi
fi

# Run command
exec "$@"