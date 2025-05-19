#!/bin/bash
# ProbeOps Authentication Rebuild - EC2 Deployment Script
# This script automates the deployment of the ProbeOps containerized authentication system on AWS EC2

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}ProbeOps Authentication Rebuild Deployment${NC}"
echo -e "${BLUE}=============================================${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Installing Docker...${NC}"
    
    # Check the Linux distribution
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        
        if [[ "$ID" == "amzn" ]]; then
            # Amazon Linux 2
            sudo yum update -y
            sudo amazon-linux-extras install docker -y
            sudo service docker start
            sudo systemctl enable docker
            sudo usermod -a -G docker $USER
            
            echo -e "${GREEN}Docker installed successfully on Amazon Linux 2!${NC}"
        elif [[ "$ID" == "ubuntu" ]]; then
            # Ubuntu
            sudo apt update
            sudo apt install -y docker.io
            sudo systemctl enable --now docker
            sudo usermod -aG docker $USER
            
            echo -e "${GREEN}Docker installed successfully on Ubuntu!${NC}"
        else
            echo -e "${RED}Unsupported Linux distribution. Please install Docker manually.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Unable to determine the Linux distribution. Please install Docker manually.${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Please log out and log back in to apply Docker group changes.${NC}"
    echo -e "${YELLOW}Then run this script again.${NC}"
    exit 0
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Installing Docker Compose...${NC}"
    
    # Check the Linux distribution
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        
        if [[ "$ID" == "amzn" ]]; then
            # Amazon Linux 2
            sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            
            echo -e "${GREEN}Docker Compose installed successfully on Amazon Linux 2!${NC}"
        elif [[ "$ID" == "ubuntu" ]]; then
            # Ubuntu
            sudo apt install -y docker-compose
            
            echo -e "${GREEN}Docker Compose installed successfully on Ubuntu!${NC}"
        else
            echo -e "${RED}Unsupported Linux distribution. Please install Docker Compose manually.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Unable to determine the Linux distribution. Please install Docker Compose manually.${NC}"
        exit 1
    fi
fi

# Create deployment directory if it doesn't exist
DEPLOY_DIR="/opt/probeops"
if [ ! -d "$DEPLOY_DIR" ]; then
    echo -e "${YELLOW}Creating deployment directory at $DEPLOY_DIR...${NC}"
    sudo mkdir -p $DEPLOY_DIR
    sudo chown $USER:$USER $DEPLOY_DIR
    echo -e "${GREEN}Deployment directory created!${NC}"
fi

# Navigate to the deployment directory
cd $DEPLOY_DIR

# Ask if this is a fresh installation or an update
echo -e "${YELLOW}Is this a fresh installation or an update? (fresh/update)${NC}"
read -p "> " installation_type

if [[ "$installation_type" == "fresh" ]]; then
    # Fresh installation - Clone the repository
    echo -e "${YELLOW}Performing a fresh installation...${NC}"
    
    if [ -d "$DEPLOY_DIR/probeops" ]; then
        echo -e "${RED}Existing installation found at $DEPLOY_DIR/probeops${NC}"
        echo -e "${YELLOW}Do you want to remove it and continue? (yes/no)${NC}"
        read -p "> " remove_existing
        
        if [[ "$remove_existing" == "yes" ]]; then
            echo -e "${YELLOW}Removing existing installation...${NC}"
            rm -rf $DEPLOY_DIR/probeops
        else
            echo -e "${YELLOW}Installation aborted.${NC}"
            exit 0
        fi
    fi
    
    echo -e "${YELLOW}Cloning the ProbeOps repository...${NC}"
    git clone https://github.com/your-org/probeops.git
    cd probeops
    
    # Create .env file
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
# Database Configuration
POSTGRES_USER=probeops
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=probeops_db

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600

# Auth Bypass (Development Only)
AUTH_BYPASS=false

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Proxy Configuration
PROXY_HOST=0.0.0.0
PROXY_PORT=5000

# Probe Configuration
PROBE_HOST=0.0.0.0
PROBE_PORT=9000

# AWS Configuration
AWS_REGION=us-east-1

# Database URL
DATABASE_URL=postgresql://probeops:secure_password_here@db:5432/probeops_db
EOF
    
    echo -e "${GREEN}.env file created!${NC}"
    echo -e "${YELLOW}Please update the .env file with your actual settings before continuing.${NC}"
    
    # Ask if the user wants to use auth bypass mode for development
    echo -e "${YELLOW}Do you want to use authentication bypass mode for development? (yes/no)${NC}"
    read -p "> " use_auth_bypass
    
    if [[ "$use_auth_bypass" == "yes" ]]; then
        echo -e "${YELLOW}Setting up authentication bypass mode...${NC}"
        sed -i 's/AUTH_BYPASS=false/AUTH_BYPASS=true/' .env
        echo -e "${GREEN}Authentication bypass mode enabled!${NC}"
        
        # Start the containers with auth bypass
        echo -e "${YELLOW}Starting containers with authentication bypass...${NC}"
        docker-compose -f docker-compose.auth-bypass.yml up -d
    else
        echo -e "${YELLOW}Starting containers with standard authentication...${NC}"
        docker-compose up -d
    fi
    
elif [[ "$installation_type" == "update" ]]; then
    # Update existing installation
    echo -e "${YELLOW}Updating existing installation...${NC}"
    
    if [ ! -d "$DEPLOY_DIR/probeops" ]; then
        echo -e "${RED}No existing installation found at $DEPLOY_DIR/probeops${NC}"
        echo -e "${YELLOW}Would you like to perform a fresh installation instead? (yes/no)${NC}"
        read -p "> " do_fresh_install
        
        if [[ "$do_fresh_install" == "yes" ]]; then
            # Recursively call this script with fresh installation
            DEPLOY_DIR=$DEPLOY_DIR installation_type=fresh $0
            exit 0
        else
            echo -e "${YELLOW}Installation aborted.${NC}"
            exit 0
        fi
    fi
    
    cd $DEPLOY_DIR/probeops
    
    # Check if auth bypass is currently enabled
    if grep -q "AUTH_BYPASS=true" .env; then
        auth_bypass_enabled=true
    else
        auth_bypass_enabled=false
    fi
    
    # Backup the .env file
    cp .env .env.backup
    
    # Pull the latest changes
    echo -e "${YELLOW}Pulling latest changes from the repository...${NC}"
    git pull
    
    # Ask if the user wants to change the auth bypass setting
    echo -e "${YELLOW}Current auth bypass setting: $auth_bypass_enabled${NC}"
    echo -e "${YELLOW}Do you want to change the auth bypass setting? (yes/no)${NC}"
    read -p "> " change_auth_bypass
    
    if [[ "$change_auth_bypass" == "yes" ]]; then
        if [[ "$auth_bypass_enabled" == "true" ]]; then
            echo -e "${YELLOW}Disabling authentication bypass mode...${NC}"
            sed -i 's/AUTH_BYPASS=true/AUTH_BYPASS=false/' .env
            auth_bypass_enabled=false
        else
            echo -e "${YELLOW}Enabling authentication bypass mode...${NC}"
            sed -i 's/AUTH_BYPASS=false/AUTH_BYPASS=true/' .env
            auth_bypass_enabled=true
        fi
    fi
    
    # Stop the running containers
    echo -e "${YELLOW}Stopping running containers...${NC}"
    docker-compose down
    
    # Start the containers with the appropriate configuration
    if [[ "$auth_bypass_enabled" == "true" ]]; then
        echo -e "${YELLOW}Starting containers with authentication bypass...${NC}"
        docker-compose -f docker-compose.auth-bypass.yml up -d
    else
        echo -e "${YELLOW}Starting containers with standard authentication...${NC}"
        docker-compose up -d
    fi
    
else
    echo -e "${RED}Invalid option. Please specify 'fresh' or 'update'.${NC}"
    exit 1
fi

# Verify the deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
sleep 5  # Wait for containers to start

# Check if containers are running
running_containers=$(docker-compose ps --services --filter "status=running" | wc -l)
total_containers=$(docker-compose ps --services | wc -l)

if [ "$running_containers" -eq "$total_containers" ]; then
    echo -e "${GREEN}Deployment successful! All containers are running.${NC}"
    
    # Get the server's public IP
    public_ip=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    
    echo -e "${GREEN}ProbeOps is now accessible at:${NC}"
    echo -e "${BLUE}- API Proxy: http://$public_ip:5000${NC}"
    echo -e "${BLUE}- Backend API: http://$public_ip:8000${NC}"
    echo -e "${BLUE}- Probe Node: http://$public_ip:9000${NC}"
else
    echo -e "${RED}Deployment failed! Some containers are not running.${NC}"
    echo -e "${YELLOW}Running containers: $running_containers / $total_containers${NC}"
    
    # Show the status of all containers
    echo -e "${YELLOW}Container status:${NC}"
    docker-compose ps
    
    # Show logs for troubleshooting
    echo -e "${YELLOW}Please check the logs for more information:${NC}"
    echo -e "${BLUE}docker-compose logs${NC}"
fi

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}Deployment process completed!${NC}"
echo -e "${BLUE}=============================================${NC}"