# ProbeOps Backend 404 Error Fix Documentation

## Problem Description

The backend service was failing to start properly because of a missing logging configuration file. This caused the backend container to continuously restart and resulted in 404 errors when the frontend tried to access API endpoints.

## Root Cause

The backend container's startup command included a `--log-config` parameter pointing to `/app/logging_config.json`, but this file was not present in the container:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --log-config /app/logging_config.json
```

This caused the following error:
```
Error: Invalid value for '--log-config': Path '/app/logging_config.json' does not exist.
```

## Solution

The solution adds:

1. A properly formatted logging configuration file in the backend directory
2. Updates to docker-compose.yml to mount this file into the container
3. Updates to deploy.sh to ensure the logging directory has proper permissions

### Files Changed

1. **Created logging configuration file**: `backend/logging_config.json` with proper logging settings
2. **Updated Docker Compose**: Added the configuration file as a volume mount
3. **Enhanced deploy.sh**: Added steps to ensure proper logging directory setup

### Implementation Details

#### 1. Logging Configuration File

The logging configuration file follows the standard format required by Uvicorn and FastAPI for structured logging:

```json
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
      "filename": "/app/logs/app.log",
      "when": "midnight",
      "backupCount": 14
    },
    "access_file": {
      "class": "logging.handlers.TimedRotatingFileHandler",
      "level": "INFO",
      "formatter": "access",
      "filename": "/app/logs/access.log",
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
```

#### 2. Docker Compose Volume Mount

Added the following volume mount to the backend service:

```yaml
volumes:
  - backend-data:/app/data
  - ${LOG_DIR:-/opt/probeops/logs}/backend:/app/logs
  - ./backend/logging_config.json:/app/logging_config.json
```

#### 3. Deploy Script Enhancement

Added the following code to ensure proper logging directory setup:

```bash
# 8.2 Ensure backend logs directory exists and has correct permissions
echo "Setting up backend logging directory..."
mkdir -p ${LOG_DIR}/backend
chmod -R 777 ${LOG_DIR}/backend
echo "Backend logging directory setup complete at ${LOG_DIR}/backend"
```

## Verification

After implementing these changes, the backend service should start properly and API endpoints should be accessible. To verify:

1. Check that the backend container is running without restarts:
   ```bash
   docker ps | grep probeops-backend
   ```

2. Verify the log files are being created:
   ```bash
   ls -la /opt/probeops/logs/backend
   ```

3. Test an API endpoint through the frontend application or directly:
   ```bash
   curl https://probeops.com/api/health
   ```

## Deployment Instructions

These changes are automatically applied when you follow the standard deployment process:

1. Pull these changes from GitHub in your local environment
2. Push to your production GitHub repository
3. SSH into your AWS server and run the standard deployment:
   ```bash
   cd /opt/probeops
   git pull
   ./deploy.sh
   ```

No manual changes on the AWS server are required.

## Troubleshooting

If you still encounter 404 errors after deployment:

1. Check backend container logs:
   ```bash
   docker logs probeops-backend
   ```

2. Verify the logging configuration file is properly mounted:
   ```bash
   docker exec probeops-backend ls -la /app/logging_config.json
   ```

3. Ensure the backend container can write to the logs directory:
   ```bash
   docker exec probeops-backend touch /app/logs/test.log
   ```