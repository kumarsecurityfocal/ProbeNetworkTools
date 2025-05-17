@echo off
echo ProbeOps Authentication Test Suite
echo ================================
echo.

set API_HOST=localhost:8000
set LOGIN_ENDPOINT=/login
set AUTH_LOGIN_ENDPOINT=/auth/login
set USERS_ENDPOINT=/users
set LOGIN_USERNAME=admin
set LOGIN_PASSWORD=probeopS1@
set LOGIN_EMAIL=admin@probeops.com
set TOKEN_FILE=token.txt

echo ProbeOps Authentication Test Suite
echo Select a test to run:
echo 1. Test login with username/password
echo 2. Test login with email/password
echo 3. Test multiple authentication methods
echo 4. Save token and use it to access protected endpoint
echo 5. Exit
echo.

set /p choice=Enter your choice (1-5): 

if "%choice%"=="1" (
    echo Testing login with username/password
    echo API URL: http://%API_HOST%%LOGIN_ENDPOINT%
    echo.
    echo Using credentials:
    echo Username: %LOGIN_USERNAME%
    echo Password: %LOGIN_PASSWORD%
    echo.
    
    echo Sending login request...
    curl -X POST -H "Content-Type: application/json" -d "{\"username\":\"%LOGIN_USERNAME%\",\"password\":\"%LOGIN_PASSWORD%\"}" http://%API_HOST%%LOGIN_ENDPOINT%
    echo.
    
    goto :end
)

if "%choice%"=="2" (
    echo Testing login with email/password
    echo API URL: http://%API_HOST%%AUTH_LOGIN_ENDPOINT%
    echo.
    echo Using credentials:
    echo Email: %LOGIN_EMAIL%
    echo Password: %LOGIN_PASSWORD%
    echo.
    
    echo Sending login request...
    curl -X POST -H "Content-Type: application/json" -d "{\"email\":\"%LOGIN_EMAIL%\",\"password\":\"%LOGIN_PASSWORD%\"}" http://%API_HOST%%AUTH_LOGIN_ENDPOINT%
    echo.
    
    goto :end
)

if "%choice%"=="3" (
    echo Testing multiple authentication methods
    echo.
    
    echo 1. Testing primary login endpoint with username/password...
    echo API URL: http://%API_HOST%%LOGIN_ENDPOINT%
    echo.
    curl -X POST -H "Content-Type: application/json" -d "{\"username\":\"%LOGIN_USERNAME%\",\"password\":\"%LOGIN_PASSWORD%\"}" http://%API_HOST%%LOGIN_ENDPOINT%
    echo.
    echo.
    
    echo 2. Testing auth login endpoint with email/password...
    echo API URL: http://%API_HOST%%AUTH_LOGIN_ENDPOINT%
    echo.
    curl -X POST -H "Content-Type: application/json" -d "{\"email\":\"%LOGIN_EMAIL%\",\"password\":\"%LOGIN_PASSWORD%\"}" http://%API_HOST%%AUTH_LOGIN_ENDPOINT%
    echo.
    
    goto :end
)

if "%choice%"=="4" (
    echo Testing save token and use it for protected endpoint
    echo.
    
    echo 1. Getting token from login endpoint...
    curl -s -X POST -H "Content-Type: application/json" -d "{\"username\":\"%LOGIN_USERNAME%\",\"password\":\"%LOGIN_PASSWORD%\"}" http://%API_HOST%%LOGIN_ENDPOINT% > %TOKEN_FILE%
    echo Token saved to %TOKEN_FILE%
    echo.
    
    echo 2. Please copy the access_token value from %TOKEN_FILE% and paste it here:
    set /p user_token=Token: 
    
    echo.
    echo 3. Testing protected endpoint with token...
    echo API URL: http://%API_HOST%%USERS_ENDPOINT%
    echo.
    curl -H "Authorization: Bearer %user_token%" http://%API_HOST%%USERS_ENDPOINT%
    echo.
    
    goto :end
)

if "%choice%"=="5" (
    echo Exiting...
    exit /b 0
)

echo Invalid choice. Please enter a number from 1 to 5.
echo.

:end
echo.
echo Test completed.
echo.
echo Press any key to exit...
pause > nul