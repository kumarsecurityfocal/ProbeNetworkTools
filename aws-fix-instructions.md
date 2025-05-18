# AWS Authentication Fix Instructions

## 1. Run the Diagnostics Tool

First, let's collect detailed diagnostic information to properly understand what's happening on your AWS server:

```bash
# Upload the aws-diagnostics.js to your server
scp aws-diagnostics.js user@your-aws-server:/opt/probeops/

# SSH into your server
ssh user@your-aws-server

# Navigate to the probeops directory
cd /opt/probeops

# Run the diagnostics tool
node aws-diagnostics.js

# Check the results
cat probeops-diagnostics.log
```

This will generate a comprehensive log file with information about:
- Path routing issues
- Authentication token behavior
- Backend connectivity
- File system permissions
- Environment variable configuration

## 2. Fix Based on Diagnostic Results

Once you have the diagnostic log, look for these specific patterns:

### If you see 404 errors for `/api/api/*` paths:
This confirms the duplicate API prefix issue. The fix should be applied to your `server.js` file.

### If you see backend connection errors in the log:
This indicates the proxy forwarding needs to be adjusted to properly handle reconnections.

### If login works but subsequent requests fail:
This points to token handling problems, which need to be fixed in the token validation logic.

## 3. Make Specific Updates to server.js

After collecting diagnostic data, we'll make targeted changes to server.js based on the actual issues observed.

## 4. Share the Diagnostic Results

Once you've run the diagnostics tool, please share the log file so we can provide precise fixes tailored to your specific AWS environment rather than making generalized changes.