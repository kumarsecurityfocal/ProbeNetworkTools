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

### Important Production Deployment Notes

#### Frontend Asset Handling
⚠️ **WARNING**: Do not manually mount the `./frontend/dist` directory to the NGINX container in production. 
- The frontend container builds assets using a multi-stage Dockerfile
- These assets are then copied to the NGINX container during the build process
- Mounting a host directory can override this and cause empty directories to be served

#### SSL Certificate Persistence
- SSL certificates issued by Let's Encrypt must persist across container rebuilds
- Never override the SSL certificate volumes when rebuilding containers
- The following volume mounts should always be preserved:
  ```yaml
  volumes:
    - ./nginx/ssl:/etc/letsencrypt
    - ./nginx/ssl/webroot:/var/www/certbot
    - ./nginx/ssl/ssl-dhparams.pem:/etc/letsencrypt/ssl-dhparams.pem
  ```
- Always back up the `./nginx/ssl` directory before major deployments

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

#### Production Deployment

For production, use the standard docker-compose.yml without any overrides:

```bash
# Build and start the containers
docker compose up -d --build

# Check if all containers are running
docker compose ps
```

#### Development Deployment

For development, use the docker-compose.dev.yml override file:

```bash
# Build and start the containers with development overrides
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Check if all containers are running
docker compose ps
```

The development override provides these benefits:
- Hot reloading for the frontend and backend
- Volume mounts for development convenience
- Development mode for all services
- Exposed development ports for direct access

### 3.4 Run Database Migrations

```bash
# Run Alembic migrations
docker compose exec backend alembic upgrade head

# Alternatively, if the container name is different
docker exec -it probeops-backend alembic upgrade head
```

### 3.5 Verify Deployment

```bash
# Check if the backend API is accessible
curl http://localhost:8000/

# Check the logs for any issues
docker compose logs
```

## 4. Setting Up Domain and SSL

### 4.1 Configure DNS for Your Domain

1. In your domain registrar's DNS settings:
   - Create an A record pointing to your EC2 instance's public IP
   - Example: `probeops.com` → `your-ec2-ip`
   - Example: `www.probeops.com` → `your-ec2-ip`

2. Wait for DNS propagation (can take up to 24-48 hours)

### 4.2 SSL Certificates with Docker

Since NGINX is running in a container, we need a special approach for SSL certificate management:

#### 4.2.1 Create SSL Directory Structure

```bash
# Create directory structure for SSL certificates
mkdir -p ./nginx/ssl/live/probeops.com
mkdir -p ./nginx/ssl/archive/probeops.com
mkdir -p ./nginx/ssl/renewal
```

#### 4.2.2 Using Certbot with Docker

We'll use the official Certbot Docker image to generate certificates:

```bash
# Stop nginx container temporarily to free port 80
docker compose stop nginx

# Run Certbot Docker container using standalone mode
docker run -it --rm \
  -v ./nginx/ssl:/etc/letsencrypt \
  -v ./nginx/ssl/webroot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --preferred-challenges http \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d probeops.com -d www.probeops.com

# Start nginx again
docker compose start nginx
```

#### 4.2.3 Update NGINX Configuration

Now, update the NGINX configuration to use SSL certificates:

```bash
# Edit the NGINX configuration
nano nginx/nginx.conf
```

Add the following configuration:

```nginx
# Example SSL configuration block to add to nginx.conf
server {
    listen 80;
    server_name probeops.com www.probeops.com;
    
    # Redirect all HTTP requests to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }

    # For certbot challenges (renewal process)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

server {
    listen 443 ssl;
    server_name probeops.com www.probeops.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/probeops.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/probeops.com/privkey.pem;
    
    # Include SSL settings
    include /etc/nginx/ssl-params.conf;  # Optional, if you have additional SSL settings
    
    # Rest of your server configuration...
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

After updating the NGINX configuration:

```bash
# Restart NGINX container to apply the changes
docker compose restart nginx
```

#### 4.2.4 Setting Up Certificate Auto-Renewal

Create a renewal script:

```bash
nano cert-renewal.sh
```

Add the following content:

```bash
#!/bin/bash

# Stop nginx container temporarily
docker compose stop nginx

# Run certbot renewal
docker run --rm \
  -v ./nginx/ssl:/etc/letsencrypt \
  -v ./nginx/ssl/webroot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot renew

# Start nginx again
docker compose start nginx
```

Make the script executable:

```bash
chmod +x cert-renewal.sh
```

Set up a cron job to run the renewal script twice a day:

```bash
(crontab -l 2>/dev/null; echo "0 3,15 * * * /path/to/probeops/cert-renewal.sh >> /path/to/probeops/ssl-renewal.log 2>&1") | crontab -
```

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