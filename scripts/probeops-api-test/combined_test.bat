@echo off
REM ProbeOps API Test Script for Windows - Verified Commands
REM This script tests authentication and basic API functionality

echo ProbeOps API Authentication Test - Verified Working Commands
echo ==========================================================
echo.

REM Step 1: Login to get access token - FORM DATA FORMAT (NOT JSON)
echo == Step 1: Testing Login API ==
echo Command: curl -X POST https://probeops.com/api/login -d "username=admin@probeops.com" -d "password=probeopS1@"
echo.

curl -X POST https://probeops.com/api/login -d "username=admin@probeops.com" -d "password=probeopS1@"
echo.
echo.

REM Step 2: Instructions for using the token
echo == Step 2: After login, copy your token from above ==
echo.
echo To test user profile:
echo curl -X GET https://probeops.com/api/users/me -H "Authorization: Bearer YOUR_TOKEN_HERE"
echo.
echo To test subscription status:
echo curl -X GET https://probeops.com/api/subscription -H "Authorization: Bearer YOUR_TOKEN_HERE"
echo.

REM Local testing instructions
echo == For local testing ==
echo Same commands but replace https://probeops.com/api with http://localhost:8000
echo.
echo For example:
echo curl -X POST http://localhost:8000/login -d "username=admin@probeops.com" -d "password=probeopS1@"
echo.

echo Press any key to exit...
pause > nul