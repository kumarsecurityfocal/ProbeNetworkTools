# ProbeOps Backend Logging Configuration Fix

## Issue Description

The backend container was failing to start due to a missing logging configuration file. This resulted in 404 errors across multiple pages in the application because NGINX was unable to proxy requests to the backend (which was continuously restarting).

Error observed in the backend container logs:
```
Error: Invalid value for '--log-config': Path '/app/logging_config.json' does not exist.
```

This caused NGINX to return 404 errors with the following log entries:
```
connect() failed (113: Host is unreachable) while connecting to upstream, client: [IP], server: probeops.com, request: "GET /api/[endpoint] HTTP/1.1", upstream: "http://172.18.0.4:8000/[endpoint]"
```

## Solution

The solution is to create the missing logging configuration file and update the Docker Compose configuration to mount this file into the backend container.

### Fix Implementation

1. **Create logging configuration file**:
   - A properly formatted `logging_config.json` file has been added to the repository
   - This file provides structured logging for the FastAPI backend with proper rotation and formatting

2. **Update deployment process**:
   - The `deploy.sh` script has been modified to include these changes
   - It ensures the logging configuration is properly mounted to the container
   - It verifies the backend starts successfully after applying the changes

### How It Works

The deployment script performs the following steps:

1. Ensures the `logging_config.json` file exists in the `/opt/probeops/config/` directory
2. Updates the Docker Compose configuration to mount this file into the backend container
3. Creates necessary log directories with appropriate permissions
4. Restarts the backend container
5. Verifies that the backend is running correctly
6. Checks that NGINX is configured to proxy to the correct backend IP

## How to Apply the Fix

The fix is automatically applied when you run the standard deployment process:

```bash
git pull  # Pull the latest changes from the repository
./deploy.sh  # Run the deployment script
```

The `deploy.sh` script will handle all the necessary steps including:
- Creating/updating the logging configuration file
- Applying changes to Docker Compose
- Restarting the necessary containers

## Verification

After running the deployment script, you should verify:

1. The backend container is running without restarting:
   ```bash
   docker ps | grep probeops-backend
   ```
   It should show the container running without frequent restarts.

2. The backend container has a valid IP address:
   ```bash
   docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' probeops-backend
   ```
   This should return a valid IP address.

3. The NGINX logs no longer show connection errors:
   ```bash
   tail -f /opt/probeops/logs/nginx/error.log
   ```
   You should not see any "Host is unreachable" errors.

4. API endpoints are now working correctly - test through the browser

## Troubleshooting

If problems persist after applying the fix:

1. Check the backend container logs:
   ```bash
   docker logs probeops-backend
   ```
   Look for any new errors that might be occurring.

2. Verify the logging configuration is mounted correctly:
   ```bash
   docker exec probeops-backend ls -la /app/logging_config.json
   ```
   This should show the file exists in the container.

3. Check NGINX configuration to ensure it's correctly proxying to the backend:
   ```bash
   cat /etc/nginx/conf.d/default.conf
   ```
   Look for the proxy_pass directive pointing to the backend.

4. Verify network connectivity between NGINX and the backend:
   ```bash
   docker exec nginx ping [backend-ip]
   ```
   This should show network connectivity is working.

## References

- [FastAPI Logging Documentation](https://fastapi.tiangolo.com/tutorial/handling-errors/#logging)
- [Uvicorn Logging Configuration](https://www.uvicorn.org/settings/#logging)
- [Docker Compose Volume Mounts](https://docs.docker.com/compose/compose-file/compose-file-v3/#volumes)