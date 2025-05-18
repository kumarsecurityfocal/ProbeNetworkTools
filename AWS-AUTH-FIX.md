# ProbeOps Authentication Fix Guide

This document explains how to fix the authentication issues in AWS environments that are causing HTML responses instead of JSON.

## Root Cause

After extensive testing in Replit, we've identified the root cause:

1. The backend expects authentication requests to use **form-urlencoded** format, not JSON
2. Incorrect credentials were being used in some diagnostic tools
3. Proxy/nginx configuration in AWS may be returning HTML error pages instead of passing requests to the API

## Diagnostic Tool

The authentication diagnostic tool (running on port 8888) tests both formats and identifies which is working:

```bash
# In Replit, the tool is already running at:
http://localhost:8888

# Deploy the same tool in AWS:
node auth-diagnostic-tool.js
```

## AWS Deployment Fix

To fix the authentication issues in AWS:

1. **Deploy the diagnostic tool first:**
   ```bash
   # SSH into your AWS instance
   scp auth-diagnostic-tool.js user@aws-instance:/path/to/app/
   ssh user@aws-instance
   cd /path/to/app
   node auth-diagnostic-tool.js
   ```

2. **Test the authentication flow:**
   - Open `http://your-aws-ip:8888` in your browser
   - Click "Test Login Flow" with the default credentials
   - Note which authentication format works (form-urlencoded should work)

3. **Fix the frontend code:**
   - Check all login/authentication code to ensure it's using form-urlencoded format
   - Deploy the updated frontend code with proper login format

4. **Check nginx/proxy configuration:**
   - Verify that API requests are properly routed to the backend
   - Ensure Content-Type headers are preserved
   - Fix any nginx/proxy rules that are redirecting to HTML pages

```nginx
# Example nginx fix for API endpoints
location /api/ {
    # Preserve the original request headers
    proxy_pass http://backend:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Don't intercept error responses
    proxy_intercept_errors off;
}
```

## Expected Result

After implementing these fixes, all authentication should work properly, and APIs should return JSON responses rather than HTML error pages.

## Credentials

The correct credentials for testing are:
- Username: `admin@probeops.com`
- Password: `probeopS1@`

## Ongoing Development

For all future diagnostic tools, ensure they:
1. Use form-urlencoded format for authentication
2. Use the correct production credentials
3. Test both in Replit and AWS environments