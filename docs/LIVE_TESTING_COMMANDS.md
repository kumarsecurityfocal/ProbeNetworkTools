# ProbeOps.com Live Server Authentication Testing

These commands can be used to test authentication directly against the live probeops.com application.

## Direct Authentication Testing Commands

### Login with Admin Credentials

```batch
curl -X POST https://probeops.com/api/login -H "Content-Type: application/json" --data "{\"username\":\"admin@probeops.com\",\"password\":\"probeopS1@\"}"
```

### Login with Email Format

```batch
curl -X POST https://probeops.com/api/auth/login -H "Content-Type: application/json" --data "{\"email\":\"admin@probeops.com\",\"password\":\"probeopS1@\"}"
```

### Check User Profile (After Login)

```batch
rem Replace YOUR_TOKEN_HERE with the token from the login response
curl -X GET https://probeops.com/api/users/me -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Retrieve All Users (Admin Only)

```batch
rem Replace YOUR_TOKEN_HERE with the token from the login response
curl -X GET https://probeops.com/api/users -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Check Subscription Status

```batch
rem Replace YOUR_TOKEN_HERE with the token from the login response
curl -X GET https://probeops.com/api/subscription -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## One-Line Authentication Test

This batch command performs a login and then immediately uses the token to check user access:

```batch
for /f "tokens=* usebackq" %%a in (`curl -s -X POST https://probeops.com/api/login -H "Content-Type: application/json" --data "{\"username\":\"admin@probeops.com\",\"password\":\"probeopS1@\"}" ^| findstr access_token`) do (
  set TOKEN_LINE=%%a
  for /f "tokens=2 delims=:," %%b in ("!TOKEN_LINE!") do (
    set TOKEN=%%b
    set TOKEN=!TOKEN:"=!
    set TOKEN=!TOKEN: =!
    echo Token: !TOKEN!
    curl -X GET https://probeops.com/api/users/me -H "Authorization: Bearer !TOKEN!"
  )
)
```

## Backend API Test Points

Here are the main API endpoints you can test:

- `/api/login` - Authenticates a user with username/password
- `/api/auth/login` - Alternative authentication with email/password
- `/api/users/me` - Gets the current logged-in user's profile
- `/api/users` - Lists all users (admin only)
- `/api/subscription` - Gets current user's subscription details
- `/api/keys` - Lists API keys for the current user
- `/api/probes` - Lists probe nodes
- `/api/history` - Lists diagnostic history

## Testing Script for Windows

You can copy this into a .bat file for easy testing:

```batch
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
```

Save this as `test_probeops_live.bat` and run it to test authentication against the live server.