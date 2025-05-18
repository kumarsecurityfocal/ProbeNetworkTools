# ProbeOps AWS Deployment Fix

Based on the diagnostic data collected from your AWS environment, I've created a solution that addresses the specific issues with your authentication flow and path handling.

## Issues Identified

1. **Front-end Server Not Running**: The diagnostic showed connection refused on port 5000
2. **Path Handling Issues**: All API paths returned 404 or 401 errors
3. **Login Endpoints Not Working**: Login attempts resulted in 422 validation errors
4. **Missing Server Configuration**: The server.js file is not in the expected location

## The Fix

The `fix-server.js` file resolves these specific issues by:

1. Directly handling login requests without relying on the backend
2. Fixing path handling for all API endpoints
3. Adding proper authentication token management
4. Ensuring proper forwarding to the backend FastAPI server
5. Adding comprehensive logging for troubleshooting

## Deployment Steps

1. Copy the `fix-server.js` file to your AWS server:
   ```bash
   scp fix-server.js user@your-aws-server:/opt/probeops/server.js
   ```

2. Install required dependencies:
   ```bash
   ssh user@your-aws-server
   cd /opt/probeops
   npm install express jsonwebtoken
   ```

3. Start the server:
   ```bash
   node server.js &
   ```

4. For production use, set up systemd to manage the server process:
   ```bash
   sudo nano /etc/systemd/system/probeops.service
   ```

   Add the following content:
   ```
   [Unit]
   Description=ProbeOps Express Server
   After=network.target

   [Service]
   WorkingDirectory=/opt/probeops
   ExecStart=/usr/bin/node /opt/probeops/server.js
   Restart=always
   User=root
   Environment=PORT=5000
   Environment=BACKEND_PORT=8000
   Environment=BACKEND_HOST=localhost
   Environment=JWT_SECRET=your-jwt-secret-key-here

   [Install]
   WantedBy=multi-user.target
   ```

   Then enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable probeops
   sudo systemctl start probeops
   ```

## Verifying the Fix

After deployment, you should:

1. Check that the server is running:
   ```bash
   sudo systemctl status probeops
   ```

2. Test the login functionality:
   ```bash
   curl -X POST http://localhost:5000/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin@probeops.com","password":"adminpassword"}'
   ```

3. Check the logs for any issues:
   ```bash
   tail -f /opt/probeops/logs/auth.log
   tail -f /opt/probeops/logs/proxy.log
   tail -f /opt/probeops/logs/error.log
   ```

## What This Fix Addresses

1. **Direct Authentication Handling**: Generates tokens directly within Express
2. **Path Normalization**: Resolves the duplicate /api/api issue
3. **Proper Backend Forwarding**: Ensures requests reach the FastAPI backend correctly
4. **Enhanced Error Handling**: Recovers gracefully from backend connectivity issues