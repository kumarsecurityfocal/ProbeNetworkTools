# ProbeOps Frontend Build Fix

## Overview

This document explains the critical fix applied to the frontend build process in the ProbeOps deployment scripts.

## Issue Description

The deployment process was failing with the following error:

```
probeops-frontend-build | /docker-entrypoint.sh: exec: line 47: npm: not found
[BUILD_ERROR] - Frontend build failed, deployment will be incomplete
```

Despite using a `node:20-alpine` base image in the Dockerfile, the container could not find the `npm` command when launched via docker-compose.

## Solution

The issue was resolved by:

1. Bypassing docker-compose for the frontend build process
2. Using direct Docker commands to build and extract the frontend assets

### Applied Changes

The following changes were made to all deployment scripts:

1. **Explicit Docker Build**: 
   ```bash
   docker build -t probeops-frontend-build ./frontend
   ```

2. **Direct Asset Extraction**:
   ```bash
   docker run --rm -v $(pwd)/public:/public probeops-frontend-build cp -r /app/dist/* /public/
   ```

3. **Enhanced Verification**:
   Added steps to verify files were correctly copied

## Files Updated

- `deploy.sh`
- `fresh-deploy.sh`
- `fix-frontend-deployment.sh`

## Testing Verification

The fix has been tested and verified to work with the following process:

1. Frontend assets are now successfully built in the Dockerfile using the multi-stage build
2. Assets are correctly copied from the container to the host filesystem
3. NGINX container can serve these assets correctly

## Benefits

This approach:

- Eliminates dependency on docker-compose for the frontend build
- Provides better error visibility
- Simplifies the build and asset extraction process
- Ensures consistent builds across environments

## Notes for Future Maintenance

When updating the frontend build process:

1. Keep the multi-stage build in `frontend/Dockerfile`
2. Ensure the docker build commands remain direct rather than through docker-compose
3. Verify the correct paths for asset extraction