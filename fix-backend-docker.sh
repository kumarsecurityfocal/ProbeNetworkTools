#!/bin/bash

# Color output functions
function log_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

function log_warning() {
    echo -e "\033[0;33m[WARNING]\033[0m $1"
}

function log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

function log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

echo "==== ProbeOps Backend Docker Deployment Fix ===="
echo "This script will fix issues with the backend Docker container's database connection."
echo ""

# Step 1: Update backend/app/config.py
log_info "Step 1: Updating backend/app/config.py to support multiple env file locations..."

CONFIG_FILE="backend/app/config.py"
if [ -f "$CONFIG_FILE" ]; then
    # Check if config.py already has the multi-location env_file setting
    if grep -q "env_file = \[" "$CONFIG_FILE"; then
        log_success "Config.py already has multiple env file locations configured."
    else
        # Update the env_file setting to check multiple locations
        sed -i 's/env_file = ".env.backend"/env_file = [".env.backend", "\/app\/.env.backend", "..\/\.env.backend"]/' "$CONFIG_FILE"
        log_success "Updated Config.py to search for .env.backend in multiple locations"
    fi
else
    log_error "Config.py not found at $CONFIG_FILE"
    exit 1
fi

# Step 2: Update docker-compose.yml to ensure proper env file mounting
log_info "Step 2: Checking docker-compose.yml configuration..."

DOCKER_COMPOSE="docker-compose.yml"
if [ -f "$DOCKER_COMPOSE" ]; then
    # Check if env_file directive exists
    if grep -q "env_file:" "$DOCKER_COMPOSE" && grep -q "- ./backend/.env.backend" "$DOCKER_COMPOSE"; then
        log_success "docker-compose.yml already has env_file directive configured."
    else
        log_error "Please ensure your docker-compose.yml has the following env_file directive:"
        echo "  env_file:"
        echo "    - ./backend/.env.backend"
    fi
    
    # Check if Docker is explicitly setting DATABASE_URL
    if grep -q "DATABASE_URL=postgresql" "$DOCKER_COMPOSE"; then
        log_warning "docker-compose.yml is using hardcoded DATABASE_URL, which might override .env.backend"
        log_info "If you continue to see issues, consider changing this to: DATABASE_URL=\${DATABASE_URL}"
    fi
else
    log_error "docker-compose.yml not found in current directory"
    exit 1
fi

# Step 3: Create backup Dockerfile for backend to debug issues
log_info "Step 3: Creating debug Dockerfile for backend..."

DOCKER_DEBUG="backend/Dockerfile.debug"
cat > "$DOCKER_DEBUG" << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create a debug script to verify environment variables
RUN echo '#!/bin/bash\necho "DEBUG: Checking environment variables"\necho "DATABASE_URL=$DATABASE_URL"\necho "PWD=$(pwd)"\necho "PYTHONPATH=$PYTHONPATH"\necho "Contents of .env.backend:"\ncat .env.backend 2>/dev/null || echo "File not found"\necho "\nContents of /app/.env.backend:"\ncat /app/.env.backend 2>/dev/null || echo "File not found"\necho "\nExecuting command: $@"\nexec "$@"' > /app/debug-entrypoint.sh \
    && chmod +x /app/debug-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/debug-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
EOF

log_success "Created debug Dockerfile at $DOCKER_DEBUG"

# Step 4: Ensure backend/.env.backend has correct DATABASE_URL
log_info "Step 4: Checking backend/.env.backend file..."

ENV_BACKEND="backend/.env.backend"
if [ -f "$ENV_BACKEND" ]; then
    # Check if DATABASE_URL exists and is not using variable substitution
    if grep -q "DATABASE_URL=\${DATABASE_URL}" "$ENV_BACKEND"; then
        log_warning "DATABASE_URL in $ENV_BACKEND is using variable substitution which may not work in Docker"
        log_info "Consider updating to use the full connection string directly:"
        
        if [ -n "$DATABASE_URL" ]; then
            log_info "  DATABASE_URL=$DATABASE_URL"
        else
            log_info "  DATABASE_URL=postgresql://username:password@hostname:port/database"
        fi
    else
        log_success "$ENV_BACKEND appears to be properly configured"
    fi
else
    log_error "$ENV_BACKEND not found. This file is required."
    
    if [ -n "$DATABASE_URL" ]; then
        log_info "Creating $ENV_BACKEND with current DATABASE_URL"
        mkdir -p backend
        echo "# Database connection" > "$ENV_BACKEND"
        echo "DATABASE_URL=$DATABASE_URL" >> "$ENV_BACKEND"
        log_success "Created $ENV_BACKEND with database settings"
    else
        log_error "DATABASE_URL environment variable not set. Cannot create .env.backend automatically."
        exit 1
    fi
fi

echo ""
echo "==== Backend Docker Fix Complete ===="
echo "Follow these steps to use the fixes:"
echo ""
echo "1. To use the debug Dockerfile:"
echo "   - Update your docker-compose.yml to use the debug Dockerfile:"
echo "     build:"
echo "       context: ./backend"
echo "       dockerfile: Dockerfile.debug"
echo ""
echo "2. To test without Docker:"
echo "   - Run the backend directly with: cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo ""
echo "3. If issues persist:"
echo "   - Check Docker logs: docker logs probeops-backend"
echo "   - Verify database connectivity: psql \"\$DATABASE_URL\""
echo ""
echo "Remember to rebuild your Docker container after making these changes:"
echo "docker-compose build backend && docker-compose up -d backend"