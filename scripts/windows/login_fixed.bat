@echo off
echo Creating a JSON file for authentication...
echo.

echo.
echo Step 1: Creating login.json file with admin credentials...
echo {"username":"admin@probeops.com","password":"probeopS1@"} > login.json
echo Created login.json successfully!
echo.

echo Step 2: Sending authentication request using the JSON file...
echo Executing: curl -X POST https://probeops.com/api/login -H "Content-Type: application/json" -d @login.json
curl -X POST https://probeops.com/api/login -H "Content-Type: application/json" -d @login.json
echo.
echo.

echo If that didn't work, please perform the following steps on your Windows system:
echo.
echo 1. Create a text file called login.json with this content:
echo    {"username":"admin@probeops.com","password":"probeopS1@"}
echo.
echo 2. Run this command in the same directory:
echo    curl -X POST https://probeops.com/api/login -H "Content-Type: application/json" -d @login.json
echo.
echo Press any key to exit...
pause > nul