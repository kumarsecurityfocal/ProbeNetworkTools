#!/bin/sh

# NGINX entrypoint script for ProbeOps
# This script ensures the frontend assets are correctly handled

# Set to exit on error
set -e

echo "=== Starting NGINX with proper configuration ==="
echo "Current working directory: $(pwd)"
echo "NGINX configuration directory: $(ls -la /etc/nginx/)"

# Check if the default conf exists and remove it to prevent conflicts
if [ -f "/etc/nginx/conf.d/default.conf" ]; then
    echo "⚠️ Removing default NGINX configuration to prevent conflicts"
    rm -f /etc/nginx/conf.d/default.conf
fi

# Check for default html directory that might be overriding our content
if [ -d "/var/www/html" ] && [ -f "/var/www/html/index.html" ]; then
    echo "⚠️ Default NGINX html directory found - this might be overriding our content"
    echo "Contents of /var/www/html:"
    ls -la /var/www/html
    
    echo "⚠️ Removing default NGINX welcome page"
    rm -f /var/www/html/index.html
fi

# Create .probeops-build-ok marker file
echo "ProbeOps build verification - $(date)" > /usr/share/nginx/html/.probeops-build-ok

# Check our custom html directory
echo "Checking /usr/share/nginx/html directory:"
mkdir -p /usr/share/nginx/html
ls -la /usr/share/nginx/html

# Verify NGINX configuration
echo "Verifying NGINX configuration:"
nginx -t

# Check if we have the React frontend assets in the html directory
if [ -f "/usr/share/nginx/html/index.html" ] && [ -d "/usr/share/nginx/html/assets" ]; then
    echo "✅ Frontend assets found in /usr/share/nginx/html"
    echo "Index file size: $(wc -c < /usr/share/nginx/html/index.html) bytes"
    
    # Check the content of index.html to confirm it's the React app
    if grep -q "<div id=\"root\"></div>" "/usr/share/nginx/html/index.html"; then
        echo "✅ Verified React app index.html is present"
    else
        echo "⚠️ Warning: index.html exists but doesn't appear to be the React app"
        echo "First 10 lines of index.html:"
        head -n 10 /usr/share/nginx/html/index.html
    fi
else
    echo "⚠️ Warning: No frontend assets found in /usr/share/nginx/html"
    echo "⚠️ Creating a placeholder index file"
    
    # Create directory if it doesn't exist
    mkdir -p /usr/share/nginx/html
    
    # Create a simple HTML page explaining the issue
    cat > /usr/share/nginx/html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>ProbeOps - Frontend Assets Missing</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .error {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .info {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        pre {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        h1 { color: #dc3545; }
    </style>
</head>
<body>
    <h1>ProbeOps - Frontend Assets Not Found</h1>
    
    <div class="error">
        <strong>Error:</strong> The NGINX container could not find the frontend assets.
    </div>
    
    <div class="info">
        <p><strong>Possible causes:</strong></p>
        <ul>
            <li>Frontend build failed or was not completed</li>
            <li>Incorrect volume mapping in docker-compose.yml</li>
            <li>Docker Compose dependency issue between nginx and frontend services</li>
        </ul>
        
        <p><strong>Resolution:</strong></p>
        <ol>
            <li>Ensure the frontend container builds successfully</li>
            <li>In production, DO NOT mount ./frontend/dist to nginx</li>
            <li>For development, use docker-compose.dev.yml which includes the proper volume mounts</li>
            <li>Rebuild with: <pre>docker compose down && docker compose up -d --build</pre></li>
        </ol>
    </div>
</body>
</html>
EOF
fi

# Check SSL certificates
if [ -f "/etc/letsencrypt/live/probeops.com/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/probeops.com/privkey.pem" ]; then
    echo "✅ SSL certificates found"
else
    echo "⚠️ Warning: SSL certificates not found in expected location"
    echo "⚠️ HTTPS will not work without valid certificates"
    echo "⚠️ Run the init-ssl.sh script to create certificates"
fi

# Start NGINX with daemon off
echo "✅ Starting NGINX server"
exec nginx -g "daemon off;"