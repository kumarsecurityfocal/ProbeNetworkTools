# ProbeOps Deployment Guide

This document provides comprehensive guidance for deploying, maintaining, and troubleshooting the ProbeOps platform in both development and production environments.

## Deployment Architecture

ProbeOps uses a containerized microservices architecture:

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│                │     │                │     │                │
│  NGINX Proxy   │────▶│  Express/React │────▶│  FastAPI       │
│  (Port 80/443) │     │  (Port 5000)   │     │  (Port 8000)   │
│                │     │                │     │                │
└────────────────┘     └────────────────┘     └────┬───────────┘
                                                   │
                                                   ▼
                                            ┌────────────────┐
                                            │                │
                                            │  PostgreSQL    │
                                            │  (Port 5432)   │
                                            │                │
                                            └────────────────┘
```

## Environment Setup

### Required Environment Variables

Create a `.env` file with these variables:

```
# Database Configuration
DATABASE_URL=postgresql://postgres:password@postgres:5432/probeops
PGUSER=postgres
PGPASSWORD=your_secure_password
PGDATABASE=probeops
PGHOST=postgres
PGPORT=5432

# JWT Authentication
JWT_SECRET=your_secure_jwt_secret_key

# Server Configuration
PORT=5000
NODE_ENV=production

# API Configuration
BACKEND_URL=http://backend:8000

# Deployment Settings
DEPLOY_ENV=production
```

### Production Security Considerations

For production environments:
1. Use strong, randomly generated secrets for JWT_SECRET
2. Store secrets in a secure vault system or environment variables
3. Never commit secrets to version control
4. Rotate passwords and tokens regularly

## Deployment Process

### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/probeops.git
   cd probeops
   ```

2. Create production environment file:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. Build and deploy with Docker Compose:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

### CI/CD Pipeline Integration

Our deployment pipeline consists of:

1. **Code Push/PR Merge**: Triggers the CI/CD pipeline
2. **Testing**: Runs unit and integration tests
3. **Build**: Creates Docker images
4. **Push**: Pushes images to container registry
5. **Deploy**: Executes deployment script on target server

#### GitHub Actions Workflow

```yaml
name: Deploy ProbeOps

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and test
        run: |
          npm install
          npm test
      
      - name: Build Docker images
        run: |
          docker-compose -f docker-compose.yml build
      
      - name: Push to registry
        run: |
          docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}
          docker-compose -f docker-compose.yml push
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/probeops
            ./deploy.sh
```

### Using the deploy.sh Script

The `deploy.sh` script handles:
- Pulling latest images
- Backing up the database
- Running migrations
- Restarting services
- Health checks

```bash
#!/bin/bash
# deploy.sh

# Configuration
BACKUP_DIR="/var/backups/probeops"
APP_DIR="/opt/probeops"
LOG_FILE="${APP_DIR}/deploy.log"

# Ensure log directory exists
mkdir -p $(dirname $LOG_FILE)

# Start logging
exec > >(tee -a $LOG_FILE) 2>&1
echo "===== Deployment started at $(date) ====="

# Pull latest code
cd $APP_DIR
git pull origin main

# Backup database
echo "Backing up database..."
mkdir -p $BACKUP_DIR
docker exec probeops_postgres pg_dump -U postgres probeops > $BACKUP_DIR/probeops_$(date +%Y%m%d_%H%M%S).sql

# Pull latest images
echo "Pulling latest images..."
docker-compose pull

# Run migrations
echo "Running database migrations..."
docker-compose run --rm backend alembic upgrade head

# Restart services
echo "Restarting services..."
docker-compose down
docker-compose up -d

# Health check
echo "Performing health check..."
for i in {1..10}; do
  if curl -sf http://localhost:5000/api/health > /dev/null; then
    echo "Health check passed!"
    echo "===== Deployment completed successfully at $(date) ====="
    exit 0
  fi
  echo "Waiting for service to become available... ($i/10)"
  sleep 5
done

echo "Health check failed after 10 attempts!"
echo "===== Deployment failed at $(date) ====="
exit 1
```

## Database Management

### Migrations

ProbeOps uses Alembic for database migrations. Always use migrations for schema changes:

```bash
# Generate migration
docker-compose exec backend alembic revision --autogenerate -m "Description of change"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback one migration
docker-compose exec backend alembic downgrade -1
```

### Backup and Restore

Regular backups are critical:

```bash
# Manual backup
docker-compose exec postgres pg_dump -U postgres probeops > backup.sql

# Restore from backup
cat backup.sql | docker-compose exec -T postgres psql -U postgres probeops
```

Set up automated daily backups:

```bash
# Add to crontab
0 2 * * * /opt/probeops/scripts/backup-db.sh
```

## Scaling Considerations

### Horizontal Scaling

For higher traffic environments:
1. Deploy multiple frontend instances behind a load balancer
2. Scale FastAPI backend horizontally
3. Use connection pooling for PostgreSQL
4. Implement caching layer with Redis

### Vertical Scaling

For resource-intensive operations:
1. Increase CPU/memory for backend containers
2. Optimize PostgreSQL for larger datasets
3. Increase connection pool sizes

## Environment-Specific Configuration

### Development

```yaml
# docker-compose.dev.yml
version: '3'
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend.dev
    ports:
      - "5000:5000"
    volumes:
      - ./frontend:/app/frontend
    environment:
      - NODE_ENV=development
  
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend.dev
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app/backend
    environment:
      - DEBUG=true
  
  postgres:
    image: postgres:13
    ports:
      - "5432:5432"
    volumes:
      - pg_data_dev:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=devpassword

volumes:
  pg_data_dev:
```

### Staging

```yaml
# docker-compose.staging.yml
version: '3'
services:
  nginx:
    image: probeops/nginx:latest
    ports:
      - "80:80"
    depends_on:
      - frontend
  
  frontend:
    image: probeops/frontend:staging
    environment:
      - NODE_ENV=staging
  
  backend:
    image: probeops/backend:staging
    environment:
      - ENV=staging
      - LOG_LEVEL=debug
  
  postgres:
    image: postgres:13
    volumes:
      - pg_data_staging:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${PGPASSWORD}

volumes:
  pg_data_staging:
```

### Production

```yaml
# docker-compose.prod.yml
version: '3'
services:
  nginx:
    image: probeops/nginx:${VERSION}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
    restart: always
  
  frontend:
    image: probeops/frontend:${VERSION}
    environment:
      - NODE_ENV=production
    restart: always
  
  backend:
    image: probeops/backend:${VERSION}
    environment:
      - ENV=production
      - LOG_LEVEL=info
    restart: always
  
  postgres:
    image: postgres:13
    volumes:
      - pg_data_prod:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=${PGPASSWORD}
    restart: always

volumes:
  pg_data_prod:
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Authentication Problems

1. **JWT Token Issues**:
   - Check JWT_SECRET matches between frontend and backend
   - Verify token expiration configuration
   - Examine token content with: `echo "token" | base64 -d`

2. **Login Failures**:
   - Verify credentials in database
   - Check account status (is_active flag)
   - Examine auth logs

#### API Connectivity

1. **Backend Connection Refused**:
   - Ensure backend container is running: `docker ps | grep backend`
   - Check backend logs: `docker-compose logs backend`
   - Verify network configuration allows communication between containers
   - Test direct connection: `curl http://backend:8000/docs`

2. **Database Connection Issues**:
   - Check DATABASE_URL environment variable
   - Verify PostgreSQL is running: `docker-compose ps postgres`
   - Test connection: `docker-compose exec backend python -c "import psycopg2; conn=psycopg2.connect('${DATABASE_URL}'); print('Connected!')"` 

#### Deployment Failures

1. **Build Errors**:
   - Check for syntax errors in the codebase
   - Verify all dependencies are available
   - Examine build logs for specific error messages

2. **Migration Failures**:
   - Check migration script for errors
   - Verify database connectivity
   - Check for conflicting migrations

3. **Container Startup Failures**:
   - Check Docker logs: `docker-compose logs`
   - Verify all required environment variables are set
   - Check for resource constraints (memory, disk)

#### Performance Issues

1. **Slow API Responses**:
   - Check database query performance
   - Look for slow API endpoints in logs
   - Consider adding caching for frequent requests
   - Check for resource constraints

2. **High Memory/CPU Usage**:
   - Monitor with: `docker stats`
   - Check for memory leaks
   - Consider scaling resources or optimizing code

### Log Analysis

Key log locations:

```
# Frontend/Express logs
docker-compose logs frontend

# Backend/FastAPI logs
docker-compose logs backend

# Database logs
docker-compose logs postgres

# NGINX logs
docker-compose logs nginx
```

Use log filtering for troubleshooting:

```bash
# Find authentication errors
docker-compose logs backend | grep -i "auth"

# Find database errors
docker-compose logs backend | grep -i "database\|sql\|postgres"

# Find 500 errors
docker-compose logs nginx | grep " 500 "
```

### Monitoring Tools Integration

ProbeOps can be integrated with:

1. **Prometheus & Grafana**:
   - Metrics collection and visualization
   - Configure exporters for each service

2. **ELK Stack**:
   - Centralized logging infrastructure
   - Configure Filebeat on each container

3. **Healthchecks**:
   - Add `/health` endpoint to each service
   - Set up external monitoring (Pingdom, Uptime Robot)

## SSL/TLS Configuration

For HTTPS support:

1. **Certificate Acquisition**:
   - Use Let's Encrypt:
     ```bash
     certbot certonly --webroot -w /var/www/html -d probeops.yourdomain.com
     ```

2. **NGINX Configuration**:
   ```nginx
   server {
       listen 80;
       server_name probeops.yourdomain.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl;
       server_name probeops.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/probeops.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/probeops.yourdomain.com/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_prefer_server_ciphers on;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;

       location / {
           proxy_pass http://frontend:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto https;
       }
   }
   ```

3. **Certificate Renewal Automation**:
   ```bash
   # Add to crontab
   0 3 * * * certbot renew --quiet && docker-compose restart nginx
   ```

## Disaster Recovery

### Backup Strategy

1. **Database Backups**:
   - Daily full backups
   - Transaction log backups every hour
   - Store backups offsite (S3, GCS, etc.)

2. **Configuration Backups**:
   - Version control for configuration files
   - Regular backup of environment files

3. **Container Image Versioning**:
   - Tag and store all production images
   - Maintain image history for quick rollback

### Recovery Procedures

1. **Database Restore**:
   ```bash
   # Stop affected services
   docker-compose stop backend frontend

   # Restore database
   cat backup.sql | docker-compose exec -T postgres psql -U postgres probeops

   # Restart services
   docker-compose up -d
   ```

2. **Full System Recovery**:
   ```bash
   # Clone repository
   git clone https://github.com/your-org/probeops.git
   cd probeops

   # Restore configuration
   cp /backup/path/.env .

   # Pull specific image versions
   docker-compose pull

   # Restore database
   cat /backup/path/latest.sql | docker-compose exec -T postgres psql -U postgres probeops

   # Start services
   docker-compose up -d
   ```

3. **Container Rollback**:
   ```bash
   # Roll back to previous version
   export VERSION=previous-stable-tag
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Security Best Practices

1. **Regular Updates**:
   - Keep base images updated
   - Apply security patches promptly
   - Update dependencies regularly

2. **Access Control**:
   - Use least privilege principle
   - Implement proper user roles
   - Restrict SSH access to known IPs

3. **Network Security**:
   - Use internal Docker networks
   - Expose only necessary ports
   - Implement WAF for production

4. **Secret Management**:
   - Use environment variables for secrets
   - Consider HashiCorp Vault for production
   - Rotate credentials regularly

## Maintenance Schedule

| Task                          | Frequency | Description                                      |
|-------------------------------|-----------|--------------------------------------------------|
| Security Updates              | Weekly    | Apply security patches to all components         |
| Database Optimization         | Monthly   | Run VACUUM, reindex, analyze query performance   |
| SSL Certificate Renewal       | Quarterly | Ensure certificates are renewed before expiry    |
| Dependency Updates            | Monthly   | Update npm/pip packages, address vulnerabilities |
| Log Rotation                  | Daily     | Rotate and compress logs                         |
| Full System Backup            | Weekly    | Complete system backup                           |
| Performance Review            | Monthly   | Review metrics, identify optimization areas      |

## Conclusion

This deployment guide provides a comprehensive reference for deploying and maintaining the ProbeOps platform. By following these procedures and best practices, you can ensure reliable operation and quick resolution of any issues that may arise.

For specific questions or assistance, contact the development team or open an issue in the repository.