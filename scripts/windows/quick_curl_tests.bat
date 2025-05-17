@echo off
echo ProbeOps Quick cURL Authentication Tests
echo ======================================
echo.

echo What server would you like to test?
echo 1. Live server (https://probeops.com)
echo 2. Local development server (http://localhost:8000)
echo 3. Custom server
echo.

set /p server_choice=Enter your choice (1-3): 

if "%server_choice%"=="1" (
    set BASE_URL=https://probeops.com
) else if "%server_choice%"=="2" (
    set BASE_URL=http://localhost:8000
) else if "%server_choice%"=="3" (
    set /p BASE_URL=Enter the server URL (e.g., https://staging.probeops.com): 
) else (
    echo Invalid choice. Defaulting to live server.
    set BASE_URL=https://probeops.com
)

echo.
echo Testing against: %BASE_URL%
echo.
echo Choose a test to run:
echo 1. Login with admin credentials
echo 2. Test authentication and user profile
echo 3. Test subscription status
echo 4. View all users (admin only)
echo 5. Create and run a custom curl command
echo.

set /p test_choice=Enter your choice (1-5): 

if "%test_choice%"=="1" (
    echo.
    echo Testing login with admin credentials...
    echo Command: curl -X POST %BASE_URL%/api/login -H "Content-Type: application/json" --data "{\"username\":\"admin@probeops.com\",\"password\":\"probeopS1@\"}"
    echo.
    curl -X POST %BASE_URL%/api/login -H "Content-Type: application/json" --data "{\"username\":\"admin@probeops.com\",\"password\":\"probeopS1@\"}"
)

if "%test_choice%"=="2" (
    echo.
    echo Testing login and user profile...
    echo First getting a token...
    echo.
    
    curl -s -X POST %BASE_URL%/api/login -H "Content-Type: application/json" --data "{\"username\":\"admin@probeops.com\",\"password\":\"probeopS1@\"}" > token.json
    echo Response saved to token.json
    echo.
    
    echo Provide the token from the response (access_token value):
    set /p token=Token: 
    
    echo.
    echo Testing user profile...
    echo Command: curl -X GET %BASE_URL%/api/users/me -H "Authorization: Bearer %token%"
    echo.
    curl -X GET %BASE_URL%/api/users/me -H "Authorization: Bearer %token%"
)

if "%test_choice%"=="3" (
    echo.
    echo Testing subscription status...
    echo First getting a token...
    echo.
    
    curl -s -X POST %BASE_URL%/api/login -H "Content-Type: application/json" --data "{\"username\":\"admin@probeops.com\",\"password\":\"probeopS1@\"}" > token.json
    echo Response saved to token.json
    echo.
    
    echo Provide the token from the response (access_token value):
    set /p token=Token: 
    
    echo.
    echo Testing subscription status...
    echo Command: curl -X GET %BASE_URL%/api/subscription -H "Authorization: Bearer %token%"
    echo.
    curl -X GET %BASE_URL%/api/subscription -H "Authorization: Bearer %token%"
)

if "%test_choice%"=="4" (
    echo.
    echo Testing all users endpoint (admin only)...
    echo First getting a token...
    echo.
    
    curl -s -X POST %BASE_URL%/api/login -H "Content-Type: application/json" --data "{\"username\":\"admin@probeops.com\",\"password\":\"probeopS1@\"}" > token.json
    echo Response saved to token.json
    echo.
    
    echo Provide the token from the response (access_token value):
    set /p token=Token: 
    
    echo.
    echo Retrieving all users...
    echo Command: curl -X GET %BASE_URL%/api/users -H "Authorization: Bearer %token%"
    echo.
    curl -X GET %BASE_URL%/api/users -H "Authorization: Bearer %token%"
)

if "%test_choice%"=="5" (
    echo.
    echo Create your own custom curl command
    echo.
    echo Base URL: %BASE_URL%
    echo.
    echo 1. Enter the API endpoint (e.g., /api/keys):
    set /p endpoint=/api/
    
    echo 2. Select method:
    echo   G - GET
    echo   P - POST
    echo   D - DELETE
    echo   U - PUT
    set /p method_choice=Method (G/P/D/U): 
    
    if /i "%method_choice%"=="G" (
        set METHOD=GET
    ) else if /i "%method_choice%"=="P" (
        set METHOD=POST
    ) else if /i "%method_choice%"=="D" (
        set METHOD=DELETE
    ) else if /i "%method_choice%"=="U" (
        set METHOD=PUT
    ) else (
        echo Invalid choice. Defaulting to GET.
        set METHOD=GET
    )
    
    echo 3. Do you need authorization? (Y/N)
    set /p auth_needed=Auth needed (Y/N): 
    
    if /i "%auth_needed%"=="Y" (
        echo Enter your token:
        set /p token=Token: 
        set AUTH_HEADER=-H "Authorization: Bearer %token%"
    ) else (
        set AUTH_HEADER=
    )
    
    echo 4. Do you need to send JSON data? (Y/N)
    set /p data_needed=Send data (Y/N): 
    
    if /i "%data_needed%"=="Y" (
        echo Enter JSON data (e.g., {"key":"value"}):
        set /p json_data=JSON data: 
        set DATA_PART=-H "Content-Type: application/json" --data "%json_data%"
    ) else (
        set DATA_PART=
    )
    
    echo.
    echo Running custom command...
    echo Command: curl -X %METHOD% %BASE_URL%/api/%endpoint% %AUTH_HEADER% %DATA_PART%
    echo.
    curl -X %METHOD% %BASE_URL%/api/%endpoint% %AUTH_HEADER% %DATA_PART%
)

echo.
echo.
echo Test completed.
echo Press any key to exit...
pause > nul