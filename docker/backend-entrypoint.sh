#!/bin/bash
set -e

# Log auth bypass status
if [ "$AUTH_BYPASS" = "true" ]; then
    echo "⚠️  RUNNING WITH AUTH BYPASS ENABLED ⚠️"
    echo "⚠️  DO NOT USE THIS IN PRODUCTION ⚠️"
    
    # Ensure auth_bypass.py is copied to auth.py
    if [ -f /app/app/auth_bypass.py ]; then
        echo "Ensuring auth bypass is active by copying auth_bypass.py to auth.py"
        cp /app/app/auth_bypass.py /app/app/auth.py
    else
        echo "Warning: auth_bypass.py not found!"
    fi
else
    echo "Running with standard authentication (auth bypass disabled)"
    
    # If we have an original auth.py, restore it
    if [ -f /app/auth_backups/auth.py.original ]; then
        echo "Restoring original auth.py from backup"
        cp /app/auth_backups/auth.py.original /app/app/auth.py
    fi
fi

# Run command
exec "$@"