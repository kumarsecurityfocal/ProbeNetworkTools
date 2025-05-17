@echo off
echo ProbeOps API Login Test Script
echo ==============================
echo.

set API_HOST=localhost:8000
set AUTH_ENDPOINT=/login

echo Testing API login with default admin credentials
echo API URL: http://%API_HOST%%AUTH_ENDPOINT%
echo.
echo Using credentials:
echo Username: admin
echo Password: probeopS1@
echo.

echo Sending login request...
curl -X POST -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"probeopS1@\"}" http://%API_HOST%%AUTH_ENDPOINT%

echo.
echo.
echo If you received a valid token, you can use it to test protected API endpoints.
echo Example:
echo curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://%API_HOST%/users
echo.

echo Press any key to exit...
pause > nul