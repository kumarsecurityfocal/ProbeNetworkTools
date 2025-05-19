# ProbeOps Authentication Rebuild: Phase 1 Deployment Guide

This guide provides step-by-step instructions for deploying Phase 1 of the authentication rebuild to your production environment.

## Prerequisites

- AWS EC2 instance with SSH access
- Docker and Docker Compose installed
- Database backup of your current system

## Step 1: Environment Preparation

1. **Create a Deployment Directory**:
   ```bash
   sudo mkdir -p /opt/probeops
   sudo chown $USER:$USER /opt/probeops
   cd /opt/probeops
   ```

2. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-org/probeops.git
   cd probeops
   ```

3. **Backup Current Configuration**:
   ```bash
   # Create backup directories
   mkdir -p auth_backups
   
   # Backup authentication files
   cp backend/app/auth.py auth_backups/auth.py.original
   cp server.js auth_backups/server.js.original
   
   # Backup database (if using PostgreSQL)
   pg_dump -U your_db_user -h your_db_host -d your_db_name > auth_backups/database_backup_$(date +%Y%m%d).sql
   ```

## Step 2: Configuration Setup

1. **Create Environment File**:
   ```bash
   cat > .env << EOF
   # Database Configuration
   POSTGRES_USER=your_db_user
   POSTGRES_PASSWORD=your_secure_password
   POSTGRES_DB=your_db_name
   DATABASE_URL=postgresql://your_db_user:your_secure_password@your_db_host:5432/your_db_name
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   JWT_ALGORITHM=HS256
   JWT_EXPIRATION=3600
   
   # Auth Bypass (IMPORTANT: Set to false for production)
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
   EOF
   ```

2. **Copy Necessary Files**:
   ```bash
   # Ensure all required files exist
   cp auth_bypass.py backend/app/auth_bypass.py
   cp server.clean.js .
   ```

## Step 3: Docker Configuration

1. **Create Docker Directory**:
   ```bash
   mkdir -p docker
   ```

2. **Copy Dockerfiles**:
   ```bash
   # Copy the Dockerfiles from your development environment
   cp path/to/backend-auth-bypass.Dockerfile docker/
   cp path/to/proxy-auth-bypass.Dockerfile docker/
   cp path/to/frontend.Dockerfile docker/
   cp path/to/probe.Dockerfile docker/
   
   # Copy the entrypoint scripts
   cp path/to/backend-entrypoint.sh docker/
   cp path/to/proxy-entrypoint.sh docker/
   
   # Make the entrypoint scripts executable
   chmod +x docker/backend-entrypoint.sh
   chmod +x docker/proxy-entrypoint.sh
   ```

3. **Copy Docker Compose File**:
   ```bash
   cp path/to/docker-compose.auth-bypass.yml .
   ```

## Step 4: Toggle Scripts Setup

1. **Copy Toggle Scripts**:
   ```bash
   cp path/to/activate_auth_bypass.sh .
   cp path/to/deactivate_auth_bypass.sh .
   cp path/to/toggle_auth_bypass.sh .
   
   # Make the scripts executable
   chmod +x activate_auth_bypass.sh
   chmod +x deactivate_auth_bypass.sh
   chmod +x toggle_auth_bypass.sh
   ```

## Step 5: Production Deployment

1. **Start with Standard Authentication**:
   ```bash
   # Make sure AUTH_BYPASS=false in .env
   sed -i 's/AUTH_BYPASS=true/AUTH_BYPASS=false/' .env
   
   # Start the containers
   docker-compose up -d
   ```

2. **Verify Deployment**:
   ```bash
   # Check if all containers are running
   docker-compose ps
   
   # Check logs for errors
   docker-compose logs
   ```

3. **Test Authentication**:
   ```bash
   # Test login endpoint
   curl -X POST http://localhost:5000/api/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@probeops.com","password":"your_admin_password"}'
   ```

## Step 6: Using Auth Bypass Mode (Development Only)

> ⚠️ **WARNING**: Auth bypass mode should NEVER be enabled in production environments. Use only for development and testing purposes.

If you need to enable auth bypass mode for debugging:

1. **Enable Auth Bypass**:
   ```bash
   ./activate_auth_bypass.sh
   ```

2. **Restart the Services**:
   ```bash
   ./restart_dev_workflows.sh
   ```

3. **Disable Auth Bypass When Done**:
   ```bash
   ./deactivate_auth_bypass.sh
   ```

4. **Restart with Standard Authentication**:
   ```bash
   ./restart_production_workflows.sh
   ```

## Step 7: Monitoring and Maintenance

1. **Check Container Logs**:
   ```bash
   docker-compose logs -f
   ```

2. **Monitor Authentication Metrics**:
   - Check for authentication errors in logs
   - Monitor login success/failure rates
   - Watch for suspicious activity

3. **Backup Regularly**:
   ```bash
   # Script to backup database daily
   cat > backup_db.sh << 'EOF'
   #!/bin/bash
   TIMESTAMP=$(date +%Y%m%d-%H%M%S)
   pg_dump -U $POSTGRES_USER -h $POSTGRES_HOST -d $POSTGRES_DB > /opt/probeops/backups/db_backup_$TIMESTAMP.sql
   # Keep only the last 7 backups
   ls -tp /opt/probeops/backups/db_backup_* | grep -v '/$' | tail -n +8 | xargs -I {} rm -- {}
   EOF
   
   chmod +x backup_db.sh
   
   # Add to crontab for daily execution
   (crontab -l 2>/dev/null; echo "0 2 * * * /opt/probeops/backup_db.sh") | crontab -
   ```

## Step 8: Rollback Procedure

If you encounter issues with the deployment:

1. **Stop the Containers**:
   ```bash
   docker-compose down
   ```

2. **Restore from Backup**:
   ```bash
   # Restore authentication files
   cp auth_backups/auth.py.original backend/app/auth.py
   cp auth_backups/server.js.original server.js
   
   # Restore database if needed
   psql -U your_db_user -h your_db_host -d your_db_name < auth_backups/database_backup_YYYYMMDD.sql
   ```

3. **Restart with Original Configuration**:
   ```bash
   docker-compose up -d
   ```

## Troubleshooting

1. **Authentication Errors**:
   - Check JWT secret configuration
   - Verify database connection
   - Check user table for correct user data

2. **Container Startup Issues**:
   - Check Docker logs: `docker-compose logs`
   - Verify port availability: `netstat -tulpn`
   - Check disk space: `df -h`

3. **Database Connection Problems**:
   - Verify DATABASE_URL in .env
   - Check database server is running: `pg_isready -h your_db_host`
   - Test connection: `psql -U your_db_user -h your_db_host -d your_db_name`

## Next Steps

After successfully deploying Phase 1, we will proceed to Phase 2 of the authentication rebuild:
- Implementing proper JWT authentication
- Setting up role-based access control
- Creating secure token management
- Implementing probe authentication

For more information, refer to the complete authentication rebuild plan in `auth_rebuild_plan.md`.