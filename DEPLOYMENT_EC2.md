# ProbeOps Authentication Rebuild: AWS EC2 Deployment Guide

This guide provides step-by-step instructions for deploying the ProbeOps containerized authentication rebuild on AWS EC2.

## Prerequisites

- AWS account with EC2 permissions
- SSH key pair for EC2 instance access
- Docker and Docker Compose installed on your local machine
- Git access to ProbeOps repository

## EC2 Instance Setup

1. **Launch EC2 Instance**

   - Amazon Linux 2 or Ubuntu Server 22.04 LTS
   - t2.medium or larger recommended (2+ vCPUs, 4+ GB RAM)
   - At least 30GB of storage
   - Security group with the following rules:
     - SSH (port 22) - Your IP only
     - HTTP (port 80) - All traffic
     - HTTPS (port 443) - All traffic
     - Custom TCP (port 5000) - All traffic (API Proxy)
     - Custom TCP (port 8000) - All traffic (Backend API)
     - Custom TCP (port 9000) - All traffic (Probe Node)

2. **Connect to the Instance**

   ```bash
   ssh -i /path/to/key.pem ec2-user@your-instance-ip
   ```

3. **Install Docker and Docker Compose**

   For Amazon Linux 2:
   ```bash
   sudo yum update -y
   sudo amazon-linux-extras install docker -y
   sudo service docker start
   sudo systemctl enable docker
   sudo usermod -a -G docker ec2-user
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

   For Ubuntu Server:
   ```bash
   sudo apt update
   sudo apt install -y docker.io
   sudo systemctl enable --now docker
   sudo usermod -aG docker ubuntu
   
   # Install Docker Compose
   sudo apt install -y docker-compose
   ```

   Logout and log back in to apply group changes.

## Deployment Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-org/probeops.git
   cd probeops
   ```

2. **Configure Environment Variables**

   Create `.env` file with the following variables:
   ```
   # Database Configuration
   POSTGRES_USER=probeops
   POSTGRES_PASSWORD=secure_password
   POSTGRES_DB=probeops_db
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
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
   DATABASE_URL=postgresql://probeops:secure_password@db:5432/probeops_db
   ```

3. **Set Up Docker Compose Files**

   Ensure you have the following Docker Compose files:
   
   - `docker-compose.yml` - Production deployment
   - `docker-compose.auth-bypass.yml` - Development with auth bypass

4. **Start the Services**

   For production (standard authentication):
   ```bash
   docker-compose up -d
   ```
   
   For development (with auth bypass):
   ```bash
   docker-compose -f docker-compose.auth-bypass.yml up -d
   ```

5. **Verify Deployment**

   Check if all containers are running:
   ```bash
   docker-compose ps
   ```

   Test the API endpoints:
   ```bash
   curl http://localhost:5000/api/health
   ```

## Deployment Architecture

The architecture follows a containerized approach with the following components:

1. **Backend API Container** - FastAPI application
   - Port: 8000
   - Handles core business logic
   - Manages database interactions
   - Implements authentication logic

2. **API Proxy Container** - Node.js Express application
   - Port: 5000
   - Routes requests to backend
   - Handles authentication token processing
   - Provides API request logging

3. **Frontend Container** - React application
   - Served via NGINX
   - Communicates with API Proxy

4. **Probe Node Container** - Network diagnostic agent
   - Port: 9000
   - Performs network diagnostics
   - Communicates securely with API

5. **PostgreSQL Database Container** - Data storage
   - Port: 5432
   - Stores user data and application state

## Authentication Bypass Mode

For development purposes, you can activate authentication bypass mode:

1. **Using Scripts**:
   ```bash
   # Activate auth bypass
   ./activate_auth_bypass.sh
   
   # Restart services with auth bypass
   ./restart_dev_workflows.sh
   ```

2. **Using Docker Compose**:
   ```bash
   docker-compose -f docker-compose.auth-bypass.yml up -d
   ```

## Monitoring and Logging

1. **View Container Logs**:
   ```bash
   # All containers
   docker-compose logs
   
   # Specific container
   docker-compose logs backend
   ```

2. **Monitor Container Resources**:
   ```bash
   docker stats
   ```

## Troubleshooting

1. **Database Connection Issues**
   - Verify the DATABASE_URL environment variable
   - Check if the PostgreSQL container is running
   - Ensure the database user has proper permissions

2. **Auth Bypass Not Working**
   - Verify AUTH_BYPASS=true is set in the environment
   - Check if the auth_bypass.py file is correctly implemented
   - Restart the backend container

3. **API Proxy Connection Errors**
   - Ensure the backend API is running and accessible
   - Check the BACKEND_URL configuration in the proxy
   - Verify network connectivity between containers

## Security Considerations

1. **Production Deployment**
   - Never enable AUTH_BYPASS in production
   - Use strong, unique passwords for all services
   - Store JWT_SECRET securely using AWS Secrets Manager
   - Enable HTTPS using AWS Certificate Manager

2. **Database Security**
   - Use a dedicated RDS instance in production
   - Enable database encryption at rest
   - Configure proper backup schedules

3. **Network Security**
   - Restrict security group access to necessary ports only
   - Use private subnets for database and backend services
   - Implement AWS WAF for additional protection

## Maintenance and Updates

1. **Backend Updates**
   ```bash
   docker-compose pull backend
   docker-compose up -d backend
   ```

2. **Full System Update**
   ```bash
   docker-compose pull
   docker-compose down
   docker-compose up -d
   ```

## Rollback Procedure

If issues are encountered after deployment:

1. Identify the problematic component
2. Check logs to understand the issue
3. Roll back to the previous version:
   ```bash
   docker-compose down
   git checkout <previous-commit>
   docker-compose up -d
   ```

## Contact and Support

For additional support, contact the DevOps team at devops@probeops.com or create an issue in the repository.