@echo off
echo ProbeOps API Test Script for Windows
echo =====================================
echo.

set BACKEND_HOST=probeops.com
set USERNAME=admin@probeops.com

echo Testing API at https://%BACKEND_HOST%
echo.

:: Prompt for password
set /p PASSWORD=Enter password for %USERNAME%: 

:: Store results in a file
echo ProbeOps API Test Results > results.txt
echo ======================= >> results.txt
echo Testing time: %date% %time% >> results.txt
echo. >> results.txt

:: Health check
echo Testing API health...
curl -s -o health_response.txt -w "%%{http_code}" "https://%BACKEND_HOST%/health"
set /p HEALTH_STATUS=<health_response.txt
echo Health status: %HEALTH_STATUS% >> results.txt
if "%HEALTH_STATUS%"=="200" (
    echo Health check: OK
    echo Health check: OK >> results.txt
) else (
    echo Health check: Failed
    echo Health check: Failed >> results.txt
    echo Trying alternative health endpoint...
    curl -s -o health_alt_response.txt -w "%%{http_code}" "https://%BACKEND_HOST%/api/health"
    set /p HEALTH_ALT_STATUS=<health_alt_response.txt
    echo Alternative health status: %HEALTH_ALT_STATUS% >> results.txt
)

:: Login attempt
echo.
echo Attempting to log in as %USERNAME%...
curl -s -o login_response.txt -d "username=%USERNAME%&password=%PASSWORD%" "https://%BACKEND_HOST%/login"
type login_response.txt > login_parsed.txt
echo Login response saved to results.txt >> results.txt
type login_response.txt >> results.txt

:: Extract token from login response
findstr "access_token" login_response.txt > token.txt
if %errorlevel% equ 0 (
    echo Login successful, token received
    echo Login successful >> results.txt
    for /f "tokens=2 delims=:," %%a in ('findstr "access_token" login_response.txt') do (
        set TOKEN=%%a
        set TOKEN=!TOKEN:"=!
        set TOKEN=!TOKEN: =!
        echo Token: !TOKEN:~0,15!... >> results.txt
    )
) else (
    echo Login failed, trying alternative endpoint
    echo Login failed with standard endpoint >> results.txt
    curl -s -o login_alt_response.txt -d "username=%USERNAME%&password=%PASSWORD%" "https://%BACKEND_HOST%/auth/login"
    type login_alt_response.txt >> results.txt
    findstr "access_token" login_alt_response.txt > token_alt.txt
    if %errorlevel% equ 0 (
        echo Login successful with alternative endpoint
        echo Login successful with alternative endpoint >> results.txt
        for /f "tokens=2 delims=:," %%a in ('findstr "access_token" login_alt_response.txt') do (
            set TOKEN=%%a
            set TOKEN=!TOKEN:"=!
            set TOKEN=!TOKEN: =!
            echo Token: !TOKEN:~0,15!... >> results.txt
        )
    ) else (
        echo Login failed on both endpoints
        echo Login failed on both endpoints >> results.txt
        goto :eof
    )
)

:: Test user profile
echo.
echo Testing user profile endpoint...
curl -s -o user_profile.txt -H "Authorization: Bearer %TOKEN%" "https://%BACKEND_HOST%/users/me"
echo User profile response: >> results.txt
type user_profile.txt >> results.txt

:: Check if response is HTML or JSON
findstr "DOCTYPE html" user_profile.txt > nul
if %errorlevel% equ 0 (
    echo WARNING: User profile endpoint returned HTML instead of JSON
    echo WARNING: User profile endpoint returned HTML instead of JSON >> results.txt
    echo This indicates a routing issue in NGINX
) else (
    echo User profile endpoint returned JSON
    echo User profile endpoint returned JSON >> results.txt
    
    :: Check for admin flag
    findstr "is_admin" user_profile.txt > nul
    if %errorlevel% equ 0 (
        findstr "is_admin.*true" user_profile.txt > nul
        if %errorlevel% equ 0 (
            echo Admin flag is present and TRUE
            echo Admin flag is present and TRUE >> results.txt
        ) else (
            echo Admin flag is present but NOT TRUE
            echo Admin flag is present but NOT TRUE >> results.txt
        )
    ) else (
        echo Admin flag is MISSING from response
        echo Admin flag is MISSING from response >> results.txt
    )
)

:: Test subscriptions endpoint
echo.
echo Testing subscriptions endpoint...
curl -s -o subscriptions.txt -H "Authorization: Bearer %TOKEN%" "https://%BACKEND_HOST%/subscriptions"
echo Subscriptions response: >> results.txt
type subscriptions.txt >> results.txt

:: Check if admin page exists
echo.
echo Checking for admin page...
curl -s -o admin_page.txt -w "%%{http_code}" "https://%BACKEND_HOST%/admin"
set /p ADMIN_STATUS=<admin_page.txt
echo Admin page status: %ADMIN_STATUS% >> results.txt

echo.
echo Testing completed. Results saved to results.txt
echo Please share the contents of results.txt for analysis
echo.