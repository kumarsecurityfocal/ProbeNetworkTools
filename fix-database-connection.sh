#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}ProbeOps Database Connection Fixer${NC}"
echo -e "This script updates your database connection settings to work correctly in both local and Docker environments."

# Check if .env.backend exists
if [ -f "backend/.env.backend" ]; then
    echo -e "${YELLOW}Backing up existing backend/.env.backend to backend/.env.backend.bak${NC}"
    cp backend/.env.backend backend/.env.backend.bak
else
    echo -e "${YELLOW}No existing backend/.env.backend found${NC}"
fi

# Ask about environment
echo
echo -e "${GREEN}Select your deployment environment:${NC}"
echo "1) AWS RDS (production/staging)"
echo "2) Local Docker PostgreSQL"
echo -n "Enter choice [1-2]: "
read env_choice

if [ "$env_choice" == "1" ]; then
    # AWS RDS settings
    echo
    echo -e "${GREEN}Enter your AWS RDS connection details:${NC}"
    
    echo -n "RDS Hostname (e.g. mydb.abc123xyz.us-east-1.rds.amazonaws.com): "
    read rds_host
    
    echo -n "RDS Port (usually 5432): "
    read rds_port
    
    echo -n "RDS Database name: "
    read rds_dbname
    
    echo -n "RDS Username: "
    read rds_user
    
    echo -n "RDS Password: "
    read -s rds_password
    echo # Add a newline after password entry
    
    # Generate the connection string
    DB_URL="postgresql+psycopg2://${rds_user}:${rds_password}@${rds_host}:${rds_port}/${rds_dbname}"
    
    # Create new .env.backend file
    cat > backend/.env.backend <<EOF
# Database connection
# AWS RDS Connection - Updated by fix-database-connection.sh
DATABASE_URL=${DB_URL}

# JWT Authentication
SECRET_KEY=${SECRET_KEY:-your-secret-key-here}
ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES:-30}

# CORS Settings
CORS_ORIGINS=${CORS_ORIGINS:-http://localhost,http://localhost:3000,http://127.0.0.1,http://frontend,https://probeops.com,https://www.probeops.com}

# Diagnostic tool settings
PROBE_TIMEOUT=${PROBE_TIMEOUT:-5}
EOF

    echo -e "${GREEN}Successfully updated backend/.env.backend with AWS RDS settings${NC}"
    
elif [ "$env_choice" == "2" ]; then
    # Local PostgreSQL settings
    cat > backend/.env.backend <<EOF
# Database connection
# Local Docker PostgreSQL - Updated by fix-database-connection.sh
DATABASE_URL=postgresql+psycopg2://postgres:postgres@db:5432/probeops

# JWT Authentication
SECRET_KEY=${SECRET_KEY:-your-secret-key-here}
ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES:-30}

# CORS Settings
CORS_ORIGINS=${CORS_ORIGINS:-http://localhost,http://localhost:3000,http://127.0.0.1,http://frontend,https://probeops.com,https://www.probeops.com}

# Diagnostic tool settings
PROBE_TIMEOUT=${PROBE_TIMEOUT:-5}
EOF

    echo -e "${GREEN}Successfully updated backend/.env.backend with local Docker PostgreSQL settings${NC}"
    echo "Make sure the PostgreSQL service is uncommented in your docker-compose.yml file"
    
else
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
fi

# Update docker-compose.yml to include db dependency
if [ "$env_choice" == "2" ] && grep -q "# Database service" docker-compose.yml; then
    echo -e "${YELLOW}Ensuring the database service is enabled in docker-compose.yml...${NC}"
    
    # Check if db service is commented out and uncomment it
    sed -i 's/# \+db:/  db:/g' docker-compose.yml
    
    # Make sure backend depends on db
    if ! grep -q "depends_on:" docker-compose.yml || ! grep -A3 "depends_on:" docker-compose.yml | grep -q "db"; then
        echo -e "${YELLOW}Adding database dependency to backend service...${NC}"
        sed -i '/backend:/,/command:/ s/networks:.*/networks:\n      - probeops-network\n    depends_on:\n      - db/g' docker-compose.yml
    fi
    
    echo -e "${GREEN}Docker Compose configuration updated${NC}"
fi

echo
echo -e "${GREEN}Database connection setup complete!${NC}"
echo -e "Next steps:"
echo "1. If using local development, run: docker-compose up -d"
echo "2. If using AWS RDS, make sure your security groups allow connections from your server"
echo
echo -e "${YELLOW}Your original configuration has been backed up to backend/.env.backend.bak${NC}"