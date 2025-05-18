# Authentication Persistence Fix

## Problem Description

An issue was identified where users would get logged out whenever the `./deploy.sh` script was run on the AWS server, but not when the backend container was restarted manually. This inconsistent behavior was causing frustration for users who needed to log in again after every deployment.

## Root Cause

The root cause was determined to be inconsistent SECRET_KEY management during deployments:

1. JWT tokens are signed using a SECRET_KEY defined in the backend's environment variables
2. When running `./deploy.sh`, all containers are rebuilt and restarted
3. Each time the containers restart, if they load a different SECRET_KEY, existing JWT tokens become invalid
4. This forces users to log in again, as their browser-stored tokens are no longer recognized

## Solution

The solution implements persistent SECRET_KEY management through these steps:

1. Create a persistent `secret_key.txt` file in the application directory
2. On first deployment, generate a strong random key using `openssl rand -hex 32`
3. For subsequent deployments, read the existing key from the file
4. Ensure the backend always uses this persistent key by updating the `.env.backend` file

This approach ensures that the SECRET_KEY remains the same across deployments, allowing user sessions to remain valid even after the backend is restarted.

## Implementation Details

The fix has been integrated into the `deploy.sh` script with these additions:

```bash
# Ensure SECRET_KEY is persistent across deployments
echo "Setting up persistent SECRET_KEY..."
if [ ! -f "${APP_DIR}/secret_key.txt" ]; then
  # Generate a secure random key if it doesn't exist
  openssl rand -hex 32 > "${APP_DIR}/secret_key.txt"
  echo "Generated new SECRET_KEY and saved to secret_key.txt"
else
  echo "Using existing SECRET_KEY from secret_key.txt"
fi

# Update .env.backend file with the persistent SECRET_KEY
SECRET_KEY=$(cat "${APP_DIR}/secret_key.txt")
if grep -q "^SECRET_KEY=" "${APP_DIR}/backend/.env.backend"; then
  # Replace existing SECRET_KEY entry
  sed -i "s/^SECRET_KEY=.*/SECRET_KEY=${SECRET_KEY}/" "${APP_DIR}/backend/.env.backend"
else
  # Add SECRET_KEY if it doesn't exist
  echo "SECRET_KEY=${SECRET_KEY}" >> "${APP_DIR}/backend/.env.backend"
fi
echo "SECRET_KEY updated in backend/.env.backend"
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

The first time the updated script runs, it will:
1. Generate a new SECRET_KEY and save it to `secret_key.txt`
2. Update the backend environment file with this key
3. Start the services with the new persistent key

**Note:** This first deployment will still log out existing users because the SECRET_KEY is changing. However, all subsequent deployments will preserve user sessions.

## Security Considerations

- The `secret_key.txt` file contains sensitive information and should have restricted permissions.
- It's recommended to add `secret_key.txt` to `.gitignore` to prevent accidental commit of the key to the repository.
- For true production security, consider using a secret management service in the future.

## Verification

After implementing this fix, you can verify it works by:

1. Logging into the application
2. Running a deployment
3. Confirming you're still logged in after the deployment completes

The logs in `deploy.sh` will show whether it generated a new key or used an existing one.