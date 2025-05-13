#!/bin/sh

# NGINX entrypoint script for ProbeOps
# This script ensures the frontend assets are correctly handled

# Set to exit on error
set -e

echo "=== Starting NGINX with proper configuration ==="

# Check if we have any files in the html directory
if [ -f "/usr/share/nginx/html/index.html" ]; then
    echo "✅ Frontend assets found in /usr/share/nginx/html"
    ls -la /usr/share/nginx/html
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