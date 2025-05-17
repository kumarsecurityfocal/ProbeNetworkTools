@echo off
REM ProbeOps API Test Script for Windows
REM Tests various API endpoints with the correct parameters

echo ProbeOps API Authentication Test Script
echo ======================================

REM Step 1: Login to get access token
echo.
echo == Step 1: Testing Login API ==
echo Command: curl -X POST http://localhost:8000/login -d "username=admin@probeops.com" -d "password=probeopS1@"

curl -s -X POST http://localhost:8000/login -d "username=admin@probeops.com" -d "password=probeopS1@" > login_response.json
type login_response.json

REM We need to extract the token using Windows commands (more limited than bash)
echo.
echo Extracting token...
echo.

REM Step 2: Instructions for manual testing with the token
echo.
echo == Step 2: User Profile Testing ==
echo After copying your token from the response above, use:
echo curl -X GET http://localhost:8000/users/me -H "Authorization: Bearer YOUR_TOKEN_HERE"
echo.

REM Step 3: Instructions for subscription testing
echo.
echo == Step 3: Subscription Testing ==
echo After copying your token from the response above, use:
echo curl -X GET http://localhost:8000/subscription -H "Authorization: Bearer YOUR_TOKEN_HERE"
echo.

echo Test complete. Follow the manual steps to complete API testing.

REM Instructions for connecting to production
echo.
echo To test against production:
echo 1. Replace http://localhost:8000 with https://probeops.com/api
echo 2. Example production login: curl -X POST https://probeops.com/api/login -d "username=admin@probeops.com" -d "password=probeopS1@"
echo.

pause

