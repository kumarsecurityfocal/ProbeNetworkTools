@echo off
setlocal enabledelayedexpansion

set BASE_URL=https://probeops.com
set USERNAME=admin@probeops.com
set PASSWORD=probeopS1@

echo ProbeOps.com Live Authentication Test
echo =====================================
echo.
echo Testing login to %BASE_URL%...
echo.

curl -s -X POST %BASE_URL%/api/login -H "Content-Type: application/json" --data "{\"username\":\"%USERNAME%\",\"password\":\"%PASSWORD%\"}" > token.json
echo Response saved to token.json
echo.

echo Extracting token...
for /f "tokens=* usebackq" %%a in (`type token.json ^| findstr access_token`) do (
  set TOKEN_LINE=%%a
  for /f "tokens=2 delims=:," %%b in ("!TOKEN_LINE!") do (
    set TOKEN=%%b
    set TOKEN=!TOKEN:"=!
    set TOKEN=!TOKEN: =!
    echo Token: !TOKEN!
    echo.
    
    echo Testing user profile...
    curl -s -X GET %BASE_URL%/api/users/me -H "Authorization: Bearer !TOKEN!"
    echo.
    echo.
    
    echo Testing subscription status...
    curl -s -X GET %BASE_URL%/api/subscription -H "Authorization: Bearer !TOKEN!"
    echo.
  )
)

echo.
echo Testing complete.
pause