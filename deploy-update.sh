#!/bin/bash
# ProbeOps AWS Deployment Update Script
# This script addresses the backend logging configuration issue

set -e

# Configuration
APP_DIR="${APP_DIR:-/opt/probeops}"
LOG_DIR="${LOG_DIR:-$APP_DIR/logs}"
CONFIG_DIR="${CONFIG_DIR:-$APP_DIR/config}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/deploy/deploy_update_${TIMESTAMP}.log"

# Ensure directories exist
mkdir -p "${LOG_DIR}/deploy"
mkdir -p "${CONFIG_DIR}"
mkdir -p "${LOG_DIR}/backend"

# Function for logging
log() {
  local message="$1"
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

log "Starting ProbeOps deployment update..."

# Create logging config file if it doesn't exist
if [ ! -f "${CONFIG_DIR}/logging_config.json" ]; then
  log "Creating logging configuration file..."
  cat > "${CONFIG_DIR}/logging_config.json" << 'EOF'
{
  "version": 1,
  "disable_existing_loggers": false,
  "formatters": {
    "default": {
      "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
      "datefmt": "%Y-%m-%d %H:%M:%S"
    },
    "access": {
      "format": "%(asctime)s - %(name)s - %(levelname)s - %(client_addr)s - %(request_line)s - %(status_code)s",
      "datefmt": "%Y-%m-%d %H:%M:%S"
    }
  },
  "handlers": {
    "console": {
      "class": "logging.StreamHandler",
      "level": "INFO",
      "formatter": "default",
      "stream": "ext://sys.stdout"
    },
    "file": {
      "class": "logging.handlers.TimedRotatingFileHandler",
      "level": "INFO",
      "formatter": "default",
      "filename": "/opt/probeops/logs/backend/app.log",
      "when": "midnight",
      "backupCount": 14
    },
    "access_file": {
      "class": "logging.handlers.TimedRotatingFileHandler",
      "level": "INFO",
      "formatter": "access",
      "filename": "/opt/probeops/logs/backend/access.log",
      "when": "midnight",
      "backupCount": 14
    }
  },
  "loggers": {
    "app": {
      "level": "INFO",
      "handlers": ["console", "file"],
      "propagate": false
    },
    "uvicorn.access": {
      "level": "INFO",
      "handlers": ["access_file"],
      "propagate": false
    }
  },
  "root": {
    "level": "INFO",
    "handlers": ["console", "file"]
  }
}
EOF
  log "Logging configuration file created successfully."
else
  log "Logging configuration file already exists."
fi

# Update Docker Compose file to include the logging config volume
log "Updating docker-compose.yml to mount logging configuration..."
if grep -q "logging_config.json" "${APP_DIR}/docker-compose.yml"; then
  log "Logging configuration volume already exists in docker-compose.yml"
else
  # Backup the original file
  cp "${APP_DIR}/docker-compose.yml" "${APP_DIR}/docker-compose.yml.bak-${TIMESTAMP}"
  
  # Use sed to add the volume mount to the backend service
  # This pattern looks for the backend service and adds the volume mount after the volumes: line
  sed -i '/services:/{:a;n;/backend:/,/volumes:/{/volumes:/!{ba};/volumes:/{:b;n;/- /ba;s/^/      - '${CONFIG_DIR//\//\\/}'\/logging_config.json:\/app\/logging_config.json\n/;bb}};}' "${APP_DIR}/docker-compose.yml"
  
  log "Updated docker-compose.yml with logging configuration volume mount."
fi

# Create directory for backend logs
mkdir -p "${LOG_DIR}/backend"
chmod -R 777 "${LOG_DIR}/backend"  # Ensure container can write to log directory

# Restart the backend service
log "Restarting the backend service..."
cd "${APP_DIR}"
docker-compose stop backend
docker-compose up -d backend

# Check if backend is running
sleep 10
if docker ps | grep -q "probeops-backend"; then
  log "Backend service restarted successfully."
  
  # Get the IP address of the backend container
  BACKEND_IP=$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' probeops-backend)
  log "Backend container IP: ${BACKEND_IP}"
  
  # Verify NGINX configuration
  log "Checking NGINX configuration for backend proxy..."
  NGINX_CONF_DIR="/etc/nginx/conf.d"
  if [ -f "${NGINX_CONF_DIR}/default.conf" ]; then
    if grep -q "proxy_pass.*${BACKEND_IP}" "${NGINX_CONF_DIR}/default.conf"; then
      log "NGINX is already configured to use the correct backend IP."
    else
      log "NGINX configuration may need to be updated to use the correct backend IP (${BACKEND_IP})."
      log "Please check your NGINX configuration manually."
    fi
  else
    log "NGINX default configuration not found at ${NGINX_CONF_DIR}/default.conf"
    log "Please check your NGINX configuration manually."
  fi
else
  log "ERROR: Backend service failed to start. Check Docker logs for details:"
  docker logs probeops-backend
  exit 1
fi

log "Deployment update completed successfully."