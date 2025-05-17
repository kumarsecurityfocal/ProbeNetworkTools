@echo off
echo ProbeOps JWT Authentication Test Script
echo ======================================
echo.

set SCRIPT_PATH=scripts\fix_jwt_auth.py

echo Checking environment...
if not exist %SCRIPT_PATH% (
    echo ERROR: JWT auth script not found at %SCRIPT_PATH%
    exit /b 1
)

echo 1. Check if admin user exists...
python %SCRIPT_PATH% --check
echo.

echo 2. Reset/Create admin user...
python %SCRIPT_PATH% --reset
echo.

echo 3. Verify JWT token generation...
python %SCRIPT_PATH% --verify
echo.

echo Script completed.