#!/bin/bash

# ProbeOps Fix Database Connection Script
# This script helps fix database connection issues in Docker deployment

# Text formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Helper function for logging
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "ℹ️ $1"
}

echo "==== ProbeOps Database Connection Fix ===="
echo "This script will help fix PostgreSQL connection issues in Docker deployment."
echo ""

# Make sure we're in the project root
if [ ! -f "docker-compose.yml" ]; then
    log_error "This script must be run from the project root directory."
    exit 1
fi

# Step 1: Check environment variables
log_info "Step 1: Checking PostgreSQL environment variables..."
if [ -z "$DATABASE_URL" ]; then
    log_warning "DATABASE_URL environment variable is not set."
    if [ -n "$PGDATABASE" ] && [ -n "$PGUSER" ] && [ -n "$PGPASSWORD" ] && [ -n "$PGHOST" ] && [ -n "$PGPORT" ]; then
        log_info "Building DATABASE_URL from individual PostgreSQL variables..."
        export DATABASE_URL="postgresql+psycopg2://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}"
        log_success "Generated DATABASE_URL: ${DATABASE_URL}"
    else
        log_error "Missing PostgreSQL environment variables. Please make sure the Replit database is properly set up."
        exit 1
    fi
else
    log_success "DATABASE_URL is set: ${DATABASE_URL}"
fi

# Step 2: Update .env file with current DATABASE_URL
log_info "Step 2: Updating .env files with correct DATABASE_URL..."

# Create or update .env file
if [ -f ".env" ]; then
    # Check if DATABASE_URL already exists in .env
    if grep -q "DATABASE_URL=" .env; then
        log_info "Updating existing DATABASE_URL in .env"
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|g" .env
    else
        log_info "Adding DATABASE_URL to .env"
        echo "DATABASE_URL=${DATABASE_URL}" >> .env
    fi
else
    log_info "Creating new .env file with DATABASE_URL"
    echo "# ProbeOps Environment Variables" > .env
    echo "DATABASE_URL=${DATABASE_URL}" >> .env
fi
log_success "Updated .env file with correct DATABASE_URL"

# Step 3: Update backend/.env.backend file with current DATABASE_URL
if [ -f "backend/.env.backend" ]; then
    # Check if DATABASE_URL already exists in backend/.env.backend
    if grep -q "DATABASE_URL=" backend/.env.backend; then
        log_info "Updating existing DATABASE_URL in backend/.env.backend"
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|g" backend/.env.backend
    else
        log_info "Adding DATABASE_URL to backend/.env.backend"
        echo "DATABASE_URL=${DATABASE_URL}" >> backend/.env.backend
    fi
    log_success "Updated backend/.env.backend with correct DATABASE_URL"
else
    log_warning "backend/.env.backend file not found. Creating it..."
    mkdir -p backend
    echo "# Database connection" > backend/.env.backend
    echo "DATABASE_URL=${DATABASE_URL}" >> backend/.env.backend
    log_success "Created backend/.env.backend with DATABASE_URL"
fi

# Step 4: Check if PostgreSQL client is installed
log_info "Step 4: Checking if PostgreSQL client is installed..."
if ! command -v psql &> /dev/null; then
    log_warning "PostgreSQL client not installed. This might be useful for debugging."
else
    log_success "PostgreSQL client is installed"
    
    # Extract connection details from DATABASE_URL
    log_info "Testing database connection with psql..."
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    
    log_info "Connection details extracted:"
    log_info "Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME, User: $DB_USER"
    
    # Test connection
    export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\l" &> /dev/null; then
        log_success "Successfully connected to PostgreSQL database!"
    else
        log_error "Failed to connect to PostgreSQL database. Please check your credentials."
    fi
fi

# Step 5: Update docker-compose.yml to ensure correct DATABASE_URL
log_info "Step 5: Checking docker-compose.yml configuration..."
if grep -q "DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/probeops" docker-compose.yml; then
    log_warning "Found hardcoded database connection string in docker-compose.yml. Fixing..."
    sed -i "s|DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/probeops|DATABASE_URL=\${DATABASE_URL}|g" docker-compose.yml
    log_success "Updated docker-compose.yml to use DATABASE_URL environment variable"
fi

# Step 6: Restart docker containers if they're running
log_info "Step 6: Restarting Docker containers to apply changes..."
if docker ps | grep -q "probeops-backend"; then
    log_info "Stopping and restarting Docker containers..."
    docker compose down
    docker compose up -d --build
    log_success "Docker containers restarted with new database configuration"
else
    log_warning "Docker containers are not running. No restart needed."
    log_info "To start containers with the new configuration, run: docker compose up -d"
fi

echo ""
echo "==== Database Connection Fix Complete ===="
echo "Your database connection has been updated with the correct connection string."
echo "If problems persist, consider these troubleshooting steps:"
echo "1. Check if the database server is accessible from this machine"
echo "2. Verify database user credentials and permissions"
echo "3. Check if the database exists and the user has access"
echo "4. Check the Docker logs for any errors: docker compose logs backend"
echo ""