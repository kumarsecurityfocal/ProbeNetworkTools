# ProbeOps AWS Deployment Guidelines

This document provides critical guidelines for working with the ProbeOps platform in AWS environments. Following these practices ensures system stability, security, and maintainability.

## Core Principles

### 1. No Ad-hoc Changes in Production

**NEVER make direct changes to production environment:**
- No SSH sessions to make "quick fixes"
- No manual edits to files on AWS instances
- No direct database modifications
- No installation of packages directly on servers

**Why?** 
- Ad-hoc changes lead to configuration drift
- Changes aren't tracked in version control
- Environments become unpredictable and irreproducible
- Security and audit compliance risks

### 2. Everything Through CI/CD

**ALL changes must flow through the established pipeline:**
- Commit code to the repository
- Push changes to trigger the CI/CD pipeline
- Let automated tests run
- Allow the pipeline to build and deploy

**For hotfixes:**
- Create a dedicated hotfix branch
- Test thoroughly in a staging environment
- Deploy through the normal pipeline
- Merge back to the main branch immediately after

### 3. Deploy.sh as the Single Deployment Method

**The deploy.sh script is the ONLY authorized deployment mechanism:**
- All deployments must use the script
- No partial or alternative deployment methods
- No skipping deployment steps
- No manually copying files to production

**To modify deployment behavior:**
- Enhance the deploy.sh script
- Add proper error handling and logging
- Include rollback capabilities
- Test changes in staging before production

## Enhanced deploy.sh Script

Our deploy.sh script has been enhanced to provide:
- Pre-deployment validation
- Automatic database backups
- Comprehensive logging
- Health checks
- Rollback capabilities

```bash
#!/bin/bash
# Enhanced deploy.sh for ProbeOps

# Configuration
APP_DIR="/opt/probeops"
BACKUP_DIR="/opt/probeops/backups"
LOG_DIR="/opt/probeops/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/deploy_${TIMESTAMP}.log"

# Create required directories
mkdir -p $BACKUP_DIR
mkdir -p $LOG_DIR

# Start logging
exec > >(tee -a $LOG_FILE) 2>&1
echo "===== Deployment started at $(date) ====="

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
docker-compose exec -T postgres pg_dump -U postgres probeops > $DB_BACKUP
if [ $? -ne 0 ]; then
  echo "WARNING: Database backup failed, but continuing deployment."
fi

# 3. Pull latest code
echo "Pulling latest code..."
cd $APP_DIR
git pull origin main
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to pull latest code. Aborting deployment."
  exit 1
fi

# 4. Build images
echo "Building Docker images..."
docker-compose build
if [ $? -ne 0 ]; then
  echo "ERROR: Docker build failed. Aborting deployment."
  exit 1
fi

# 5. Run database migrations
echo "Running database migrations..."
docker-compose run --rm backend alembic upgrade head
if [ $? -ne 0 ]; then
  echo "ERROR: Database migration failed. Restoring from backup..."
  cat $DB_BACKUP | docker-compose exec -T postgres psql -U postgres probeops
  echo "Deployment aborted due to migration failure."
  exit 1
fi

# 6. Restart services
echo "Restarting services..."
docker-compose down
docker-compose up -d

# 7. Health check
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
```

## Common Scenarios and Proper Handling

### 1. Authentication Issues

**INCORRECT approach:**
- SSH into the server
- Manually edit JWT_SECRET in environment files
- Restart containers manually

**CORRECT approach:**
- Update JWT_SECRET in your repository's environment template
- Commit the change
- Deploy through the CI/CD pipeline

### 2. Database Schema Changes

**INCORRECT approach:**
- Connect directly to the production database
- Run manual ALTER TABLE statements
- Skip migration files

**CORRECT approach:**
- Create an Alembic migration file in development
- Test the migration in a staging environment
- Deploy through the CI/CD pipeline

### 3. Frontend Asset Updates

**INCORRECT approach:**
- SSH into the server
- Manually copy new frontend files
- Restart the NGINX container

**CORRECT approach:**
- Update frontend code in the repository
- Ensure the CI/CD pipeline builds new assets
- Deploy through the pipeline

## Best Practices for Feature Flags

For risky changes or gradual rollouts, use feature flags instead of direct modifications:

1. Implement feature flag mechanism in code:
   ```python
   # In backend code
   def feature_enabled(feature_name, default=False):
       """Check if a feature is enabled."""
       return config.get("FEATURES", {}).get(feature_name, default)
   
   # Usage
   if feature_enabled("new_authentication_flow"):
       # New code path
   else:
       # Old code path
   ```

2. Configure flags in environment variables or database:
   ```
   FEATURES__NEW_AUTHENTICATION_FLOW=false
   ```

3. Deploy with features disabled by default

4. Enable features gradually through configuration changes (deployed via CI/CD)

## AWS-Specific Recommendations

### CloudWatch Integration

Configure CloudWatch for comprehensive monitoring:
- Set up metrics for container health
- Create alarms for error rates and resource usage
- Configure detailed logging for all components

### Deployment Notifications

Set up SNS notifications for deployment events:
- Deployment start/completion
- Failed deployments
- Rollback events

### Security Practices

- Use AWS Parameter Store for secrets
- Configure IAM roles with minimal permissions
- Enable AWS GuardDuty for threat detection
- Use VPC for network isolation

## Conclusion

Following these guidelines ensures:
- Consistent, reproducible deployments
- Clear audit trail for all changes
- Reduced downtime and deployment failures
- Improved security posture

Remember: No matter how urgent an issue seems, taking the time to follow proper deployment practices will save time and prevent more serious problems in the long run.