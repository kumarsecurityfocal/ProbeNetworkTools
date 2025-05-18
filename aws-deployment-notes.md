# AWS Deployment Authentication Fix

## Issues Identified
1. Duplicate `/api/api` path prefixes causing 404 errors
2. Login failures after backend container restarts
3. Different behavior between admin users and test users
4. Backend reconnection issues

## Solution Overview
The `aws-auth-fix.js` script provides:

1. **Path Normalization**: Correctly handles path routing for all user types
2. **Direct Login Handling**: Bypasses problematic backend login for reliable auth
3. **User-specific Path Handling**: Different routing for admin vs standard users
4. **Resilient Token Management**: Maintains tokens across backend restarts
5. **Comprehensive Logging**: Detailed logging to troubleshoot issues

## Deployment Instructions
1. Copy `aws-auth-fix.js` to your AWS instance
2. Install dependencies if needed: `npm install jsonwebtoken`
3. Run on server startup with either PM2 or systemd:

```bash
# Using PM2
pm2 start aws-auth-fix.js --name probeops-auth-fix

# OR using systemd
# Create a systemd service file at /etc/systemd/system/probeops-auth.service
```

## Configuration
- Update paths if needed:
  - `BACKEND_PORT` (defaults to 8000)
  - `BACKEND_HOST` (defaults to localhost)
  - `PUBLIC_DIR` (defaults to /opt/probeops/public)
  - `LOGS_DIR` (defaults to /opt/probeops/logs)

## Monitoring
The script creates three log files:
- `auth.log` - Authentication-related events
- `proxy.log` - Request routing information
- `errors.log` - Error details for troubleshooting

## Post-Deployment Verification
After deploying, verify:
1. Login works with both admin and test users
2. Restart the backend container to verify login still works
3. Check admin dashboard access
4. Verify test user access to probe management