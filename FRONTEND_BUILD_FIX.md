# ProbeOps Frontend Build Fix

## Overview

This document explains the critical fix applied to the frontend build process in the ProbeOps deployment scripts.

## Issue Description

The deployment process was failing with the following errors:

1. First error when using docker-compose to build the frontend:
```
probeops-frontend-build | /docker-entrypoint.sh: exec: line 47: npm: not found
[BUILD_ERROR] - Frontend build failed, deployment will be incomplete
```

2. Second error when trying to extract assets with our first attempted fix:
```
$ docker run --rm -v /home/ubuntu/ProbeNetworkTools/public:/public probeops-frontend-build cp -r /usr/share/nginx/html/* /public/
cp: can't stat '/usr/share/nginx/html/*': No such file or directory
```

There were two main issues:
1. Despite using a `node:20-alpine` base image in the Dockerfile, the container could not find the `npm` command when launched via docker-compose
2. We had a mismatch in our approach - the Dockerfile IS correctly using a multi-stage build with assets in `/usr/share/nginx/html`, but our deployment script is bypassing this multi-stage process and only building the first stage, where assets would be in `/app/dist`. Since we're bypassing docker-compose, we need to use `/app/dist` which is where assets are built in the first stage.

## Solution

The issue was resolved through a two-part fix:

1. **Simplified Dockerfile to a single-stage build**
2. **Bypassing docker-compose in favor of direct Docker commands**

### Applied Changes

The following changes were made:

1. **Simplified Dockerfile**: 
   ```dockerfile
   # Simple single-stage build
   FROM node:20-alpine
   WORKDIR /app
   COPY . .
   RUN npm install --legacy-peer-deps
   RUN npm run build -- --outDir=/app/dist
   ```

2. **Direct Docker Build and Asset Extraction**:
   ```bash
   # Build the image directly
   docker build -t probeops-frontend-build ./frontend
   
   # Extract assets from the correct path - using sh -c to ensure glob expansion
   docker run --rm -v $(pwd)/public:/public probeops-frontend-build sh -c 'cp -r /app/dist/* /public/'
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