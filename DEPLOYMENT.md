# ProbeOps Deployment Guide

This document provides step-by-step instructions for deploying the ProbeOps application on AWS EC2 with an AWS RDS PostgreSQL database.

## Prerequisites

- An AWS account with access to EC2 and RDS services
- A domain name (optional, but recommended for production)
- Basic knowledge of AWS, Docker, and Linux

## 1. Setting Up AWS Resources

### 1.1 Create an RDS PostgreSQL Database

1. Log in to the AWS Console and navigate to RDS
2. Click "Create Database"
3. Select "PostgreSQL"
4. Choose your preferred version (12 or higher recommended)
5. Select "Production" template for production deployment
6. Configure settings:
   - DB instance identifier: `probeops-db`
   - Master username: Choose a username (e.g., `probeops_admin`)
   - Master password: Create a secure password
7. Choose instance type (t3.micro for development, larger for production)
8. Configure storage (20GB minimum recommended)
9. Select appropriate VPC and security groups
   - Create a new security group for the database
   - Allow inbound PostgreSQL (port 5432) from your EC2 security group only
10. Create database

### 1.2 Launch an EC2 Instance

1. Navigate to EC2 in the AWS Console
2. Click "Launch Instance"
3. Choose Amazon Linux 2 or Ubuntu Server (20.04 LTS or newer)
4. Select instance type (t2.medium recommended minimum for production)
5. Configure instance details:
   - VPC: Same as your RDS instance
   - Auto-assign Public IP: Enable
6. Add storage (at least 30GB recommended)
7. Configure security group:
   - Allow SSH (port 22) from your IP
   - Allow HTTP (port 80) from anywhere
   - Allow HTTPS (port 443) from anywhere
8. Review and launch with your key pair
9. Note the public IP address of your instance

## 2. Preparing the EC2 Instance

SSH into your EC2 instance:

```bash
ssh -i /path/to/your-key.pem ec2-user@your-instance-public-ip
```

### 2.1 Install Docker

For Amazon Linux 2:

```bash
# Update packages
sudo yum update -y

# Install Docker
sudo amazon-linux-extras install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Log out and back in for group changes to take effect
exit
```

For Ubuntu:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ubuntu

# Log out and back in for group changes to take effect
exit
```

### 2.2 Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Apply executable permissions
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

## 3. Deploying ProbeOps

### 3.1 Clone the Repository

```bash
# Install Git if not already installed
sudo yum install git -y   # Amazon Linux
# or
sudo apt install git -y   # Ubuntu

# Clone the repository
git clone https://github.com/your-username/ProbeNetworkTools.git probeops
cd probeops
```

### 3.2 Configure Environment Variables

Create the necessary environment files:

```bash
# Create backend environment file
nano backend/.env.backend
```

Add the following content to `.env.backend`, replacing the placeholders with your actual RDS details:

```
# Database connection
DATABASE_URL=postgresql+psycopg2://your_username:your_password@your-rds-endpoint.rds.amazonaws.com:5432/your_db_name

# JWT Authentication
SECRET_KEY=your-secure-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Settings
CORS_ORIGINS=http://localhost,http://localhost:3000,http://127.0.0.1,http://frontend,https://probeops.com,https://www.probeops.com

# Diagnostic tool settings
PROBE_TIMEOUT=5
```

Create the probe environment file:

```bash
# Create probe environment file
nano probe/.env.probe
```

Add the following content to `.env.probe`:

```
# Probe configuration
BACKEND_URL=http://backend:8000
PROBE_INTERVAL=300  # 5 minutes between probe runs
LOG_LEVEL=INFO
```

### 3.3 Deploy with Docker Compose

```bash
# Build and start the containers
docker-compose up -d --build

# Check if all containers are running
docker-compose ps
```

### 3.4 Run Database Migrations

```bash
# Run Alembic migrations
docker-compose exec backend alembic upgrade head

# Alternatively, if the container name is different
docker exec -it probeops-backend alembic upgrade head
```

### 3.5 Verify Deployment

```bash
# Check if the backend API is accessible
curl http://localhost:8000/

# Check the logs for any issues
docker-compose logs
```

## 4. Setting Up Domain and SSL (Optional)

### 4.1 Configure DNS for Your Domain

1. In your domain registrar's DNS settings:
   - Create an A record pointing to your EC2 instance's public IP
   - Example: `probeops.com` → `your-ec2-ip`
   - Example: `www.probeops.com` → `your-ec2-ip`

2. Wait for DNS propagation (can take up to 24-48 hours)

### 4.2 Set Up SSL with Certbot

```bash
# Install Certbot
sudo amazon-linux-extras install epel -y  # Amazon Linux
sudo yum install certbot -y
# or
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu

# Get SSL certificate
sudo certbot --nginx -d probeops.com -d www.probeops.com

# Follow the prompts to complete the SSL setup
```

### 4.3 Update NGINX Configuration

After obtaining SSL certificates, update the NGINX configuration if needed:

```bash
# Edit the NGINX configuration
nano nginx/nginx.conf
```

The necessary SSL configuration should already be handled by Certbot, but verify the configuration looks correct.

## 5. Automating Deployments

### 5.1 Using the Deployment Script

The repository includes a `deploy.sh` script for automating deployments:

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

The script will:
1. Pull the latest code
2. Stop and remove existing containers
3. Rebuild and deploy all services
4. Apply database migrations
5. Verify the deployment

### 5.2 Setting Up Continuous Deployment (Optional)

For a more automated workflow, consider setting up a CI/CD pipeline using GitHub Actions or AWS CodePipeline. An example GitHub Actions workflow could:

1. Test the application
2. Build Docker images
3. Push images to Amazon ECR
4. Deploy to EC2 using the deploy script

## 6. Monitoring and Maintenance

### 6.1 Monitoring

- Set up CloudWatch alarms for EC2 and RDS metrics
- Configure log forwarding to CloudWatch Logs
- Consider using a monitoring solution like Prometheus + Grafana

### 6.2 Backup Strategy

- Enable automated RDS backups
- Configure backup retention period based on your needs
- Test restoration procedures periodically

### 6.3 Updates and Maintenance

- Regularly update the EC2 instance OS
- Keep Docker and Docker Compose updated
- Schedule maintenance windows for application updates

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify the DATABASE_URL in `.env.backend`
   - Check the RDS security group allows access from the EC2 instance
   - Ensure the database exists and user has proper permissions

2. **Container Startup Issues**:
   - Check logs with `docker-compose logs`
   - Verify environment variables are set correctly
   - Ensure all required ports are available

3. **NGINX/SSL Issues**:
   - Check NGINX logs: `docker-compose logs nginx`
   - Verify SSL certificates are valid and correctly configured
   - Ensure DNS records are pointing to the correct IP

For further assistance, consult the application documentation or contact the development team.