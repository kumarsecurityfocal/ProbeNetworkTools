#!/bin/bash
# Enhanced deploy.sh for ProbeOps

# Configuration
APP_DIR="${APP_DIR:-/opt/probeops}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
LOG_DIR="${LOG_DIR:-$APP_DIR/logs}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/deploy_${TIMESTAMP}.log"

# Create required directories
mkdir -p $BACKUP_DIR
mkdir -p $LOG_DIR

# Start logging
exec > >(tee -a $LOG_FILE) 2>&1
echo "===== Deployment started at $(date) ====="
echo "Deploying ProbeOps to $APP_DIR"

# 1. Pre-deployment checks
echo "Running pre-deployment checks..."
# Check disk space
FREE_SPACE=$(df -h / | awk 'NR==2 {print $4}' | sed 's/G//')
if (( $(echo "$FREE_SPACE < 5" | bc -l) )); then
  echo "ERROR: Not enough disk space (< 5GB). Aborting deployment."
  exit 1
fi

# 2. Backup database
echo "Creating database backup..."
DB_BACKUP="${BACKUP_DIR}/probeops_db_${TIMESTAMP}.sql"
if docker-compose ps | grep -q postgres; then
  docker-compose exec -T postgres pg_dump -U postgres probeops > $DB_BACKUP
  if [ $? -ne 0 ]; then
    echo "WARNING: Database backup failed, but continuing deployment."
  else
    echo "Database backup created at $DB_BACKUP"
  fi
else
  echo "WARNING: Postgres container not running, skipping database backup."
fi

# 3. Pull latest code
echo "Pulling latest code..."
cd $APP_DIR
git pull origin main
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to pull latest code. Aborting deployment."
  exit 1
fi

# 4. Build frontend
echo "Building frontend..."
cd ${APP_DIR}/frontend
npm ci
npm run build
if [ $? -ne 0 ]; then
  echo "ERROR: Frontend build failed. Aborting deployment."
  exit 1
fi

# 5. Copy frontend assets to public directory
echo "Copying frontend assets..."
mkdir -p ${APP_DIR}/public
cp -r ${APP_DIR}/frontend/dist/* ${APP_DIR}/public/
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to copy frontend assets. Aborting deployment."
  exit 1
fi

# 6. Build images
echo "Building Docker images..."
cd $APP_DIR
docker-compose build
if [ $? -ne 0 ]; then
  echo "ERROR: Docker build failed. Aborting deployment."
  exit 1
fi

# 7. Run database migrations
echo "Running database migrations..."
docker-compose run --rm backend alembic upgrade head
if [ $? -ne 0 ]; then
  echo "ERROR: Database migration failed. Consider restoring from backup."
  echo "To restore: cat $DB_BACKUP | docker-compose exec -T postgres psql -U postgres probeops"
  echo "Deployment aborted due to migration failure."
  exit 1
fi

# 8. Fix backend hostname issue
echo "Applying backend hostname configuration fix..."
if grep -q "hostname: 'localhost'" server.js; then
  echo "Updating backend hostname from 'localhost' to '0.0.0.0'..."
  # Create a backup of server.js
  cp server.js server.js.bak.${TIMESTAMP}
  # Replace hostname in server.js
  sed -i 's/hostname: \x27localhost\x27/hostname: \x270.0.0.0\x27/g' server.js
  echo "Backend hostname fix applied."
else
  echo "Backend hostname already configured correctly."
fi

# 9. Restart services
echo "Restarting services..."
docker-compose down
docker-compose up -d

# 10. Health check
echo "Performing health check..."
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  sleep 5
  
  # Check API health
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)
  if [ $HTTP_STATUS -eq 200 ]; then
    echo "Health check passed! Deployment successful."
    echo "===== Deployment finished successfully at $(date) ====="
    exit 0
  fi
  
  echo "Health check attempt $RETRY_COUNT/$MAX_RETRIES failed. Retrying..."
done

echo "WARNING: Health check failed after $MAX_RETRIES attempts."
echo "Please check logs for issues."
echo "===== Deployment finished with warnings at $(date) ====="
exit 1