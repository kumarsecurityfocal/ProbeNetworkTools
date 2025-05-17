@echo off
echo Fixed Windows curl commands for ProbeOps Authentication
echo ===================================================
echo.

echo 1. Login command with escaped quotes (should work on Windows):
echo curl -X POST https://probeops.com/api/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"probeopS1@\"}"
echo.
echo Note: Try "admin" as the username instead of "admin@probeops.com"
echo.

echo 2. Alternative login command using a file:
echo echo {"username":"admin","password":"probeopS1@"} > login_data.json
echo curl -X POST https://probeops.com/api/login -H "Content-Type: application/json" -d @login_data.json
echo.

echo 3. Test with single quotes for outer quotes (may work in some shells):
echo curl -X POST https://probeops.com/api/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"probeopS1@"}'
echo.

echo 4. Login with correct username format (if admin is the actual username):
echo curl -X POST https://probeops.com/api/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"probeopS1@\"}"
echo.

echo Which command would you like to run? (1-4)
set /p choice=Enter your choice: 

if "%choice%"=="1" (
    echo.
    echo Running command 1...
    curl -X POST https://probeops.com/api/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"probeopS1@\"}"
)

if "%choice%"=="2" (
    echo.
    echo Creating login_data.json...
    echo {"username":"admin","password":"probeopS1@"} > login_data.json
    echo Running command 2...
    curl -X POST https://probeops.com/api/login -H "Content-Type: application/json" -d @login_data.json
)

if "%choice%"=="3" (
    echo.
    echo Running command 3...
    curl -X POST https://probeops.com/api/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"probeopS1@"}'
)

if "%choice%"=="4" (
    echo.
    echo Running command 4...
    curl -X POST https://probeops.com/api/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"probeopS1@\"}"
)

echo.
echo Command executed. If you're still having issues, try these steps:
echo 1. Check if the API endpoint URL is correct (https://probeops.com/api/login)
echo 2. Verify that "admin" is the correct username (not "admin@probeops.com")
echo 3. Try creating a JSON file and using -d @file.json instead of inline JSON
echo 4. Try connecting to http://localhost:8000/login for local testing 
echo.

pause