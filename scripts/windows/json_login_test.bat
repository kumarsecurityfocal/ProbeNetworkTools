@echo off
echo ProbeOps API Login Test Using JSON File Method
echo ============================================
echo.

set SERVER=https://probeops.com
echo Testing authentication against %SERVER%
echo.

echo Step 1: Creating login.json file with credentials...
echo {"username":"admin","password":"probeopS1@"} > login.json
echo Created login.json successfully!
echo.

echo Step 2: Sending authentication request using the JSON file...
echo Executing: curl -X POST %SERVER%/api/login -H "Content-Type: application/json" -d @login.json
curl -X POST %SERVER%/api/login -H "Content-Type: application/json" -d @login.json
echo.
echo.

echo Step 3: Try alternate endpoint with the same JSON file...
echo Executing: curl -X POST %SERVER%/api/auth/login -H "Content-Type: application/json" -d @login.json
curl -X POST %SERVER%/api/auth/login -H "Content-Type: application/json" -d @login.json
echo.
echo.

echo Step 4: Creating login_email.json with email format...
echo {"email":"admin@probeops.com","password":"probeopS1@"} > login_email.json
echo Created login_email.json successfully!
echo.

echo Step 5: Test with email format against auth endpoint...
echo Executing: curl -X POST %SERVER%/api/auth/login -H "Content-Type: application/json" -d @login_email.json
curl -X POST %SERVER%/api/auth/login -H "Content-Type: application/json" -d @login_email.json
echo.
echo.

echo Test complete. If all tests failed, please check:
echo 1. The API server address (currently set to %SERVER%)
echo 2. Your internet connection
echo 3. Whether the API endpoints are correct
echo 4. If the required credentials are different
echo.

echo Press any key to exit...
pause > nul