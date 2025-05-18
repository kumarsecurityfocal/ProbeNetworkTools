#!/bin/bash
# ProbeOps Development Environment Setup
# This script sets up a clean development environment with auth bypass

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}ProbeOps Development Environment Setup${NC}"
echo -e "${BLUE}==============================================${NC}"

echo -e "\n${YELLOW}This script will:${NC}"
echo -e "1. Back up your current configuration files"
echo -e "2. Enable auth bypass in the backend server"
echo -e "3. Set up a clean proxy server"
echo -e "4. Create Docker configurations for your development environment"

read -p "Continue with setup? (y/n): " confirm
if [[ "$confirm" != "y" ]]; then
  echo "Setup cancelled."
  exit 0
fi

# Create backup directory
BACKUP_DIR="./dev_environment_backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Backup important files
echo -e "\n${YELLOW}Step 1: Creating backups of important files...${NC}"

# Backup server.js
if [ -f server.js ]; then
  cp server.js "$BACKUP_DIR/server.js.backup-$TIMESTAMP"
  echo "✅ Backed up server.js"
fi

# Backup auth.py
if [ -f backend/app/auth.py ]; then
  cp backend/app/auth.py "$BACKUP_DIR/auth.py.backup-$TIMESTAMP"
  echo "✅ Backed up auth.py"
fi

# Step 2: Apply auth bypass to backend
echo -e "\n${YELLOW}Step 2: Applying auth bypass to backend...${NC}"
cp backend/app/auth_bypass.py backend/app/auth.py
echo "✅ Auth bypass applied to backend"

# Step 3: Replace server.js with clean proxy version
echo -e "\n${YELLOW}Step 3: Replacing server.js with clean proxy version...${NC}"
if [ -f server.clean.js ]; then
  cp server.clean.js server.js
  echo "✅ Server.js replaced with clean proxy version"
else
  # Generate server.clean.js if it doesn't exist
  echo -e "${YELLOW}server.clean.js not found. Creating a clean proxy server...${NC}"
  cat > server.clean.js << 'EOF'
// Clean Express server with simple API proxying to backend
const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Create express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});

// Handle direct access to frontend routes by returning the main app
app.get(['/login', '/admin', '/dashboard', '/troubleshooting', '/database', '/profile', '/settings'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API proxy to forward all backend requests
const apiProxy = createProxyMiddleware('/api', {
  target: 'http://127.0.0.1:8000',
  pathRewrite: {
    '^/api': '' // Remove /api prefix when forwarding to backend
  },
  changeOrigin: true,
  logLevel: 'debug'
});

// Use the proxy middleware for all /api routes
app.use('/api', apiProxy);

// Generic API handler function
function handleGenericApi(req, res) {
  console.log('Generic API request:', req.method, req.originalUrl);
  const backendPath = req.originalUrl.replace(/^\/api/, '');
  console.log('Generic API backendPath:', backendPath);
  
  // Forward the request to the proxy middleware
  req.url = req.url.replace(/^\/api/, '');
  apiProxy(req, res);
}

// Catch all other /api routes
app.use('/api/*', handleGenericApi);

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
EOF

  cp server.clean.js server.js
  echo "✅ Server.js created with clean proxy version"
fi

# Step 4: Make Docker directory if it doesn't exist
echo -e "\n${YELLOW}Step 4: Setting up Docker configurations...${NC}"
mkdir -p docker

# Create Docker files if they don't exist
if [ ! -f docker/auth-bypass.Dockerfile ]; then
  cat > docker/auth-bypass.Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend/ .

# Copy the auth bypass file to replace the regular auth file
COPY backend/app/auth_bypass.py /app/app/auth.py

# Expose the FastAPI port
EXPOSE 8000

# Set environment variables for auth bypass mode
ENV AUTH_BYPASS_MODE=true
ENV SQLALCHEMY_WARN_20=ignore
ENV LOG_LEVEL=DEBUG

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
  echo "✅ Created auth-bypass.Dockerfile"
fi

if [ ! -f docker/proxy.Dockerfile ]; then
  cat > docker/proxy.Dockerfile << 'EOF'
FROM node:20-slim

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the clean server file
COPY server.clean.js ./server.js

# Create public directory
RUN mkdir -p public

# Expose the API proxy port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=development
ENV PORT=5000

# Start the server
CMD ["node", "server.js"]
EOF
  echo "✅ Created proxy.Dockerfile"
fi

if [ ! -f docker/frontend.Dockerfile ]; then
  cat > docker/frontend.Dockerfile << 'EOF'
FROM node:20-slim

WORKDIR /app

# Copy package.json and install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Copy the frontend code
COPY frontend/ ./

# Expose the Vite development server port
EXPOSE 3000

# Set environment variables for development
ENV NODE_ENV=development
ENV VITE_DEV_MODE=true
ENV VITE_AUTH_BYPASS=true

# Start the Vite development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
EOF
  echo "✅ Created frontend.Dockerfile"
fi

if [ ! -f docker/probe.Dockerfile ]; then
  cat > docker/probe.Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for network tools
RUN apt-get update && apt-get install -y \
    iputils-ping \
    dnsutils \
    traceroute \
    nmap \
    net-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy probe requirements
COPY probe/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the probe code
COPY probe/ .

# Expose the probe service port
EXPOSE 9000

# Set environment variables for development mode
ENV DEV_MODE=true
ENV AUTH_BYPASS=true
ENV NODE_UUID=dev-probe-node
ENV NODE_NAME=Development Probe

# Command to run the probe service
CMD ["python", "run.py"]
EOF
  echo "✅ Created probe.Dockerfile"
fi

# Create Docker Compose file
if [ ! -f docker-compose.auth-bypass.yml ]; then
  cat > docker-compose.auth-bypass.yml << 'EOF'
version: '3.8'

services:
  # Backend API with Auth Bypass enabled
  backend:
    build:
      context: .
      dockerfile: docker/auth-bypass.Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - AUTH_BYPASS=true
      - JWT_SECRET_KEY=dev-jwt-secret-key
      - AUTH_BYPASS_MODE=true
      - SQLALCHEMY_WARN_20=ignore
      - LOG_LEVEL=DEBUG
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    networks:
      - probeops_network
    restart: unless-stopped

  # Clean API Proxy Server
  proxy:
    build:
      context: .
      dockerfile: docker/proxy.Dockerfile
    environment:
      - BACKEND_URL=http://backend:8000
      - PORT=5000
    ports:
      - "5000:5000"
    volumes:
      - ./public:/app/public
      - ./server.clean.js:/app/server.js
    networks:
      - probeops_network
    depends_on:
      - backend
    restart: unless-stopped

  # Direct Frontend Development
  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
    environment:
      - VITE_API_URL=http://localhost:5000/api
      - VITE_DIRECT_BACKEND_URL=http://localhost:8000
      - VITE_DEV_MODE=true
      - VITE_AUTH_BYPASS=true
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - probeops_network
    command: npm run dev
    depends_on:
      - proxy
    restart: unless-stopped

  # Probe Node (for development testing)
  probe:
    build:
      context: .
      dockerfile: docker/probe.Dockerfile
    environment:
      - API_URL=http://backend:8000
      - AUTH_BYPASS=true
      - DEV_MODE=true
      - NODE_UUID=dev-probe-node
      - NODE_NAME=Development Probe
    ports:
      - "9000:9000"
    volumes:
      - ./probe:/app
    networks:
      - probeops_network
    depends_on:
      - backend
    restart: unless-stopped

networks:
  probeops_network:
    driver: bridge
EOF
  echo "✅ Created docker-compose.auth-bypass.yml"
fi

# Step 5: Update .env file for development
echo -e "\n${YELLOW}Step 5: Updating .env configuration...${NC}"
cp .env "$BACKUP_DIR/.env.backup-$TIMESTAMP"

# Add development-specific environment variables
cat >> .env << EOF

# Development Environment Variables
AUTH_BYPASS=true
DEV_MODE=true
LOG_LEVEL=DEBUG
EOF
echo "✅ Updated .env file with development variables"

# Step 6: Set up dev environment start script
echo -e "\n${YELLOW}Step 6: Creating dev environment start script...${NC}"
cat > start_dev_env.sh << 'EOF'
#!/bin/bash
# Start the ProbeOps development environment

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting ProbeOps Development Environment${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Docker is not running or not installed. Please start Docker and try again.${NC}"
  exit 1
fi

# Start the development environment
echo -e "${YELLOW}Starting the containerized development environment...${NC}"
docker-compose -f docker-compose.auth-bypass.yml up -d

echo -e "${GREEN}Development environment is starting up!${NC}"
echo -e "Access the application at the following URLs:"
echo -e "- Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "- API Proxy: ${BLUE}http://localhost:5000${NC}"
echo -e "- Backend API: ${BLUE}http://localhost:8000${NC}"
echo -e "- Probe Node: ${BLUE}http://localhost:9000${NC}"

echo -e "\n${YELLOW}Development features:${NC}"
echo -e "- Authentication is bypassed (automatically logged in as admin)"
echo -e "- API proxy is running with debug logging"
echo -e "- Frontend is running in development mode with hot reloading"
echo -e "- Probe node is available for testing network diagnostics"

echo -e "\n${YELLOW}To stop the environment:${NC}"
echo -e "docker-compose -f docker-compose.auth-bypass.yml down"
EOF

chmod +x start_dev_env.sh
echo "✅ Created start_dev_env.sh script"

# Step 7: Make sure non-Docker workflows can use auth bypass too
echo -e "\n${YELLOW}Step 7: Setting up workflow restart script...${NC}"
cat > restart_workflows_with_auth_bypass.sh << 'EOF'
#!/bin/bash
# Restart workflows with auth bypass enabled

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Restarting ProbeOps Workflows with Auth Bypass${NC}"

# Kill any running server processes
echo -e "${YELLOW}Stopping any running servers...${NC}"
pkill -f "node server.js" || true
pkill -f "uvicorn app.main:app" || true

# Start Backend API with auth bypass
echo -e "${YELLOW}Starting Backend API with auth bypass...${NC}"
cd backend
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../backend_auth_bypass.log 2>&1 &
cd ..
echo "✅ Backend API started on port 8000"

# Wait for the backend to start
echo -e "${YELLOW}Waiting for Backend API to start...${NC}"
sleep 3

# Start Server with clean proxy
echo -e "${YELLOW}Starting Server with clean proxy...${NC}"
nohup node server.js > server_auth_bypass.log 2>&1 &
echo "✅ Server started on port 5000"

# Start Direct Frontend
echo -e "${YELLOW}Starting Direct Frontend...${NC}"
cd frontend
nohup npm run dev > ../frontend_auth_bypass.log 2>&1 &
cd ..
echo "✅ Direct Frontend started on port 3000"

echo -e "${GREEN}All workflows restarted with auth bypass!${NC}"
echo -e "Access the application at the following URLs:"
echo -e "- Frontend (Direct): ${BLUE}http://localhost:3000${NC}"
echo -e "- Frontend (via Server): ${BLUE}http://localhost:5000${NC}"
echo -e "- Backend API: ${BLUE}http://localhost:8000${NC}"

echo -e "\n${YELLOW}Log files:${NC}"
echo -e "- Backend API: backend_auth_bypass.log"
echo -e "- Server: server_auth_bypass.log"
echo -e "- Direct Frontend: frontend_auth_bypass.log"
EOF

chmod +x restart_workflows_with_auth_bypass.sh
echo "✅ Created restart_workflows_with_auth_bypass.sh script"

# Print setup complete message
echo -e "\n${GREEN}Development environment setup complete!${NC}"
echo -e "The following changes have been made:"
echo -e "1. ✅ Auth bypass applied to backend"
echo -e "2. ✅ Server.js replaced with clean proxy version"
echo -e "3. ✅ Docker configuration files created"
echo -e "4. ✅ Development environment variables added to .env"
echo -e "5. ✅ Start scripts created"

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "• For containerized development: ${BLUE}./start_dev_env.sh${NC}"
echo -e "• For workflow-based development: ${BLUE}./restart_workflows_with_auth_bypass.sh${NC}"

echo -e "\n${YELLOW}To revert these changes:${NC}"
echo -e "1. cp $BACKUP_DIR/auth.py.backup-$TIMESTAMP backend/app/auth.py"
echo -e "2. cp $BACKUP_DIR/server.js.backup-$TIMESTAMP server.js"
echo -e "3. cp $BACKUP_DIR/.env.backup-$TIMESTAMP .env"
echo -e "4. Restart the workflows"

echo -e "\n${BLUE}Happy development!${NC}"