# ProbeOps Fresh Deployment Guide

This guide provides step-by-step instructions for deploying the ProbeOps platform on a fresh server from scratch. The deployment uses the `fresh-deploy.sh` script for automated setup, followed by required post-deployment steps.

## Prerequisites

Before beginning deployment, ensure the server meets the following requirements:

1. **Operating System**: Ubuntu 20.04 LTS or newer
2. **Minimum Hardware**:
   - 2 CPU cores
   - 4GB RAM
   - 20GB free disk space
3. **Required Software**:
   - Docker (version 20.10 or newer)
   - Docker Compose (version 2.0 or newer)
   - Node.js (version 18 or newer)
   - npm (version 8 or newer)
   - Python 3.9 or newer
   
4. **Network Configuration**:
   - Open ports: 80, 443, 8000 (temporary during deployment)
   - Domain name configured with DNS A records pointing to server IP (for production)

5. **Database**:
   - PostgreSQL database access credentials
   - The script expects DATABASE_URL to be available in backend/.env.backend

## Preparation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/ProbeNetworkTools.git
   cd ProbeNetworkTools
   ```

2. **Prepare Environment Files**:
   - Create or update `.env.template` with the required environment variables
   - Create or update `backend/.env.backend.template` with the required backend configuration
   - Note: The deployment script will create actual .env files from templates

3. **Prepare Database**:
   - Ensure a PostgreSQL database is available
   - Have the database connection string ready in format:
     ```
     postgresql://username:password@hostname:port/database?sslmode=require
     ```

## Deployment Process

### 1. Execute the Fresh Deployment Script

The `fresh-deploy.sh` script performs a complete end-to-end deployment:

```bash
# Make the script executable
chmod +x fresh-deploy.sh

# Run the deployment script
./fresh-deploy.sh
```

### 2. What the Script Does

The script performs the following steps in sequence:

1. Collects system information for diagnostics
2. Verifies all required dependencies
3. Sets executable permissions on all scripts
4. Creates environment files from templates
5. Validates Docker Compose configuration 
6. Builds frontend assets using Docker
7. Copies frontend assets to NGINX directory
8. Creates and populates Docker volumes
9. Stops any existing containers
10. Rebuilds and starts all services with forced recreation
11. Waits for services to initialize
12. Collects container logs for diagnostics
13. Tests container health endpoints
14. Provides summary and endpoint information

### 3. Monitor the Deployment

The script creates detailed logs that you can monitor:

- **Main Log**: `deployment.log` in the root directory
- **Container Logs**: In the `container_logs` directory
- **Container Warnings**: `container_logs/container_warnings.log` 

## Post-Deployment Steps

After successful script execution, complete these additional steps:

### 1. Verify SSL Certificates

If using HTTPS in production:

```bash
# Check certificate status
docker compose exec nginx openssl x509 -in /etc/letsencrypt/live/probeops.com/fullchain.pem -text -noout | grep "Not After"
```

If certificates aren't present or valid, generate them:

```bash
# Generate certificates (modify domain as needed)
docker compose exec certbot certbot certonly --webroot -w /var/www/certbot -d probeops.com --email your-email@example.com --agree-tos --no-eff-email
```

### 2. Initialize the Database

The first-time deployment requires database initialization:

```bash
# Run database initialization script
docker compose exec backend python -m app.db.init_db

# Verify database initialization
docker compose exec backend python -m app.db.verify
```

### 3. Create Admin User

Create an initial admin user for ProbeOps:

```bash
# Create admin user
docker compose exec backend python -m app.scripts.create_admin --username admin --password your_secure_password --email admin@example.com
```

### 4. Configure Subscription Tiers

Ensure subscription tiers are properly configured:

```bash
# Initialize subscription tiers
docker compose exec backend python -m app.scripts.init_subscription_tiers

# Verify subscription tiers
docker compose exec backend python -m app.scripts.view_subscription_tiers
```

### 5. Set Up Health Monitoring

Configure regular health checks and status monitoring:

```bash
# Add a cron job to check application health every 15 minutes
(crontab -l 2>/dev/null; echo "*/15 * * * * curl -s https://probeops.com/health > /dev/null || echo 'Health check failed' | mail -s 'ProbeOps Health Alert' your-email@example.com") | crontab -
```

### 6. Set Up Regular Backups

Configure database backups:

```bash
# Create backup script
mkdir -p /opt/probeops/backups

cat > /opt/probeops/backup-db.sh << 'EOL'
#!/bin/bash
BACKUP_DIR="/opt/probeops/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker compose exec -T db pg_dump -U postgres probeops > "$BACKUP_DIR/probeops_$TIMESTAMP.sql"
find "$BACKUP_DIR" -name "probeops_*.sql" -type f -mtime +7 -delete
EOL

chmod +x /opt/probeops/backup-db.sh

# Add daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/probeops/backup-db.sh") | crontab -
```

### 7. Firewall Configuration

Secure the server with a proper firewall configuration:

```bash
# Configure UFW (Uncomplicated Firewall)
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### 8. Set Up Log Rotation

Configure log rotation to manage disk usage:

```bash
# Create log rotation config
sudo tee /etc/logrotate.d/probeops << EOF
/home/ubuntu/ProbeNetworkTools/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
}
EOF
```

## Troubleshooting

### Common Issues

1. **Database Connection Failures**:
   - Check DATABASE_URL in backend/.env.backend
   - Ensure the database server is accessible from the deployment server
   - Verify credentials and connection string format

2. **Frontend Build Failures**:
   - Check the frontend build logs in container_logs directory
   - Ensure Node.js and npm are properly installed
   - Check for package dependency issues in package.json

3. **NGINX Configuration Issues**:
   - Check nginx logs in container_logs directory
   - Verify SSL certificate paths and configuration
   - Check for conflicting port bindings

4. **Container Startup Failures**:
   - Look for specific error messages in container_logs
   - Check Docker and Docker Compose versions
   - Verify environment variables and configuration

### Log Files

In case of deployment issues, these log files contain valuable information:

1. `deployment.log` - Main deployment log
2. `container_logs/` - Contains logs for each container
3. `container_logs/container_warnings.log` - Summary of warnings and errors

## Security Best Practices

After deployment, ensure these security best practices are followed:

1. **Change Default Credentials**:
   - Update the admin password
   - Rotate any API keys or tokens

2. **Restrict Access**:
   - Configure firewall rules to allow only necessary ports
   - Use SSH key authentication instead of password
   - Disable root login over SSH

3. **Regular Updates**:
   - Keep the server OS updated with security patches
   - Regularly update Docker and other dependencies
   - Monitor security advisories for components used

4. **Backup Protocol**:
   - Verify backup process is working properly
   - Test backup restoration periodically
   - Store backups in a different location

## Maintenance

Regular maintenance tasks to keep the system running smoothly:

1. **Weekly Tasks**:
   - Check server disk space usage
   - Review application logs for errors
   - Verify database backups are working

2. **Monthly Tasks**:
   - Update SSL certificates (if needed)
   - Check for Docker updates
   - Verify firewall rules are still appropriate

3. **Quarterly Tasks**:
   - Test disaster recovery procedure
   - Review user access and permissions
   - Clean up old logs and temporary files