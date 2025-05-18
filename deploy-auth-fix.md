# Authentication Fix for AWS Deployment

This document explains the fixes implemented in the updated `server.js` file to address the authentication issues in the AWS environment.

## Problems Fixed

1. **Duplicate `/api/api` Prefixes**
   - Enhanced path normalization that correctly handles multiple API prefixes
   - Special path handling based on user type and endpoint

2. **Login Failures After Backend Restart**
   - Direct handling of login requests in Express
   - Token generation that doesn't rely on the problematic backend login endpoint

3. **Different Admin vs User Behavior**
   - User-aware path normalization that routes admin requests differently from regular user requests
   - Proper maintenance of admin privileges through token attributes

4. **Backend Connection Issues**
   - Improved error handling with backend health checking
   - Automatic reconnection attempts when the backend service is unavailable

## Deployment Instructions

1. Replace the existing `server.js` file on your AWS instance with this updated version
2. Create a logs directory at `/opt/probeops/logs` or set the `LOG_DIR` environment variable
3. Restart the Express server
4. No changes needed to the Docker configuration

## Logging

The improved server now includes comprehensive logging to three separate files:

- `auth.log` - Authentication-related events (login attempts, token creation)
- `proxy.log` - Request routing information (path normalization, forwarding)
- `errors.log` - Detailed error information for troubleshooting

## Testing After Deployment

1. Log in with admin@probeops.com credentials
2. Log in with test@probeops.com credentials 
3. Restart the backend container and verify login still works
4. Check that admin users can access admin-specific endpoints
5. Verify test users can only access their permitted areas

## Configuration

The server accepts the following environment variables:
- `PORT` - The port to run the Express server on (default: 5000)
- `BACKEND_PORT` - The port of the FastAPI backend (default: 8000)
- `JWT_SECRET` - The secret key for JWT token signing
- `LOG_DIR` - The directory to store log files