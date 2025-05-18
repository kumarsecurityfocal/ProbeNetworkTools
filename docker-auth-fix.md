# ProbeOps Docker Authentication Fix

Based on the diagnostic data from your AWS environment and considering your Docker-based architecture, here's a revised approach to fix the authentication issues.

## Issues Identified

1. **Path Handling Issues**: All API paths returning 404 or 401 errors
2. **Login Endpoints Not Working**: Login attempts resulting in 422 validation errors
3. **Duplicate API Prefixes**: Issues with /api/api in request paths

## Solution for Docker Environment

Since you're using containers, we need to update the appropriate container configuration instead of placing files directly in the host filesystem.

### 1. Update the Express Server Container

The issues appear to be in the Express server that acts as a proxy between the frontend and backend. We need to modify this container:

```bash
# First, create a directory for the updated files
mkdir -p probeops-fix

# Copy the fix-server.js to this directory
cp fix-server.js probeops-fix/server.js

# Create a Dockerfile for the updated Express server
cat > probeops-fix/Dockerfile <<EOF
FROM node:18-alpine

WORKDIR /app

COPY package.json .
COPY server.js .

RUN npm install express jsonwebtoken

EXPOSE 5000

CMD ["node", "server.js"]
EOF

# Create a package.json file
cat > probeops-fix/package.json <<EOF
{
  "name": "probeops-server",
  "version": "1.0.0",
  "description": "ProbeOps Express Server",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0"
  }
}
EOF
```

### 2. Update Docker Compose Configuration

Next, we need to update your docker-compose.yml file to use this new Express server container:

```yaml
# Add or replace the existing express server in your docker-compose.yml
services:
  express-server:
    build: ./probeops-fix
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - BACKEND_PORT=8000
      - BACKEND_HOST=backend  # Use the service name of your FastAPI backend
      - JWT_SECRET=your-secret-key-here
    volumes:
      - ./logs:/app/logs
    depends_on:
      - backend
```

### 3. Environment Variables Configuration

Make sure the following environment variables are properly set in your Docker Compose configuration:

- `BACKEND_HOST`: This should be the service name of your FastAPI backend container
- `BACKEND_PORT`: This should match the port your FastAPI backend is listening on (typically 8000)
- `JWT_SECRET`: This should be set to the same secret key used by your backend

### 4. Restarting the Containers

After updating the configuration:

```bash
# Stop the current containers
docker-compose down

# Rebuild and start the containers with the fix
docker-compose up -d --build
```

## Modifications to fix-server.js

The `fix-server.js` file has been modified to:

1. Handle Docker networking (using service names instead of localhost)
2. Support proper container environment variables
3. Fix the path handling issues identified in the diagnostic data
4. Handle login/authentication directly to avoid reliance on unstable backend endpoints

## Verification

After deploying, verify the fix by:

1. Testing login:
   ```bash
   curl -X POST http://your-server-ip:5000/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin@probeops.com","password":"adminpassword"}'
   ```

2. Checking that other API endpoints work:
   ```bash
   # Get the token from the login response, then:
   curl http://your-server-ip:5000/api/users/me \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

3. Monitor logs:
   ```bash
   docker-compose logs -f express-server
   ```