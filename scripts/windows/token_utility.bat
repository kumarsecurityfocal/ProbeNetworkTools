@echo off
echo ProbeOps JWT Token Utility
echo =========================
echo.

set PYTHON=python
set SCRIPT_PATH=scripts\create_jwt.py

echo Checking environment...
if not exist %SCRIPT_PATH% (
    echo ERROR: JWT token utility script not found at %SCRIPT_PATH%
    echo Creating the script now...
    
    echo import jwt > %SCRIPT_PATH%
    echo import json >> %SCRIPT_PATH%
    echo import sys >> %SCRIPT_PATH%
    echo import os >> %SCRIPT_PATH%
    echo import re >> %SCRIPT_PATH%
    echo from datetime import datetime, timedelta >> %SCRIPT_PATH%
    echo. >> %SCRIPT_PATH%
    echo def load_jwt_secret(): >> %SCRIPT_PATH%
    echo     default_secret = "super-secret-key-change-in-production" >> %SCRIPT_PATH%
    echo     if os.environ.get("JWT_SECRET"): >> %SCRIPT_PATH%
    echo         return os.environ.get("JWT_SECRET") >> %SCRIPT_PATH%
    echo     if os.path.exists("backend/.env.backend"): >> %SCRIPT_PATH%
    echo         with open("backend/.env.backend", 'r') as f: >> %SCRIPT_PATH%
    echo             for line in f: >> %SCRIPT_PATH%
    echo                 if line.startswith("JWT_SECRET="): >> %SCRIPT_PATH%
    echo                     secret = line.strip().split("=", 1)[1] >> %SCRIPT_PATH%
    echo                     if secret and secret != "CHANGE_ME": >> %SCRIPT_PATH%
    echo                         return secret >> %SCRIPT_PATH%
    echo     print(f"[WARNING] Using default JWT secret - not secure for production") >> %SCRIPT_PATH%
    echo     return default_secret >> %SCRIPT_PATH%
    echo. >> %SCRIPT_PATH%
    echo def create_token(user_email="admin@probeops.com"): >> %SCRIPT_PATH%
    echo     secret_key = load_jwt_secret() >> %SCRIPT_PATH%
    echo     payload = { >> %SCRIPT_PATH%
    echo         "sub": user_email, >> %SCRIPT_PATH%
    echo         "exp": datetime.utcnow() + timedelta(days=1) >> %SCRIPT_PATH%
    echo     } >> %SCRIPT_PATH%
    echo     token = jwt.encode(payload, secret_key, algorithm="HS256") >> %SCRIPT_PATH%
    echo     return token >> %SCRIPT_PATH%
    echo. >> %SCRIPT_PATH%
    echo def decode_token(token, verify=False): >> %SCRIPT_PATH%
    echo     secret_key = load_jwt_secret() >> %SCRIPT_PATH%
    echo     if verify: >> %SCRIPT_PATH%
    echo         try: >> %SCRIPT_PATH%
    echo             payload = jwt.decode(token, secret_key, algorithms=["HS256"]) >> %SCRIPT_PATH%
    echo             return payload >> %SCRIPT_PATH%
    echo         except Exception as e: >> %SCRIPT_PATH%
    echo             return {"error": str(e)} >> %SCRIPT_PATH%
    echo     parts = token.split(".") >> %SCRIPT_PATH%
    echo     if len(parts) != 3: >> %SCRIPT_PATH%
    echo         return {"error": "Invalid token format"} >> %SCRIPT_PATH%
    echo     import base64 >> %SCRIPT_PATH%
    echo     padded = parts[1] + "=" * (4 - len(parts[1]) %% 4) >> %SCRIPT_PATH%
    echo     try: >> %SCRIPT_PATH%
    echo         decoded = base64.b64decode(padded).decode('utf-8') >> %SCRIPT_PATH%
    echo         return json.loads(decoded) >> %SCRIPT_PATH%
    echo     except Exception as e: >> %SCRIPT_PATH%
    echo         return {"error": f"Could not decode payload: {str(e)}"} >> %SCRIPT_PATH%
    echo. >> %SCRIPT_PATH%
    echo if __name__ == "__main__": >> %SCRIPT_PATH%
    echo     if len(sys.argv) ^> 1: >> %SCRIPT_PATH%
    echo         command = sys.argv[1] >> %SCRIPT_PATH%
    echo         if command == "create": >> %SCRIPT_PATH%
    echo             user_email = "admin@probeops.com" >> %SCRIPT_PATH%
    echo             if len(sys.argv) ^> 2: >> %SCRIPT_PATH%
    echo                 user_email = sys.argv[2] >> %SCRIPT_PATH%
    echo             token = create_token(user_email) >> %SCRIPT_PATH%
    echo             print(f"Token created for: {user_email}") >> %SCRIPT_PATH%
    echo             print(f"Token: {token}") >> %SCRIPT_PATH%
    echo             print("\nTo use this token with curl:") >> %SCRIPT_PATH%
    echo             print(f'curl -H "Authorization: Bearer {token}" http://localhost:8000/users') >> %SCRIPT_PATH%
    echo         elif command == "decode": >> %SCRIPT_PATH%
    echo             if len(sys.argv) ^> 2: >> %SCRIPT_PATH%
    echo                 token = sys.argv[2] >> %SCRIPT_PATH%
    echo                 print("Decoding token (without verification)...") >> %SCRIPT_PATH%
    echo                 payload = decode_token(token) >> %SCRIPT_PATH%
    echo                 print(json.dumps(payload, indent=2)) >> %SCRIPT_PATH%
    echo                 print("\nVerifying token signature...") >> %SCRIPT_PATH%
    echo                 verified = decode_token(token, verify=True) >> %SCRIPT_PATH%
    echo                 if "error" in verified: >> %SCRIPT_PATH%
    echo                     print(f"Verification failed: {verified['error']}") >> %SCRIPT_PATH%
    echo                 else: >> %SCRIPT_PATH%
    echo                     print("✅ Token signature verified successfully!") >> %SCRIPT_PATH%
    echo                     print(json.dumps(verified, indent=2)) >> %SCRIPT_PATH%
    echo             else: >> %SCRIPT_PATH%
    echo                 print("Error: No token provided") >> %SCRIPT_PATH%
    echo                 print("Usage: python create_jwt.py decode <token>") >> %SCRIPT_PATH%
    echo     else: >> %SCRIPT_PATH%
    echo         print("ProbeOps JWT Token Utility") >> %SCRIPT_PATH%
    echo         print("==========================") >> %SCRIPT_PATH%
    echo         print("Usage:") >> %SCRIPT_PATH%
    echo         print("  python create_jwt.py create [email]") >> %SCRIPT_PATH%
    echo         print("  python create_jwt.py decode <token>") >> %SCRIPT_PATH%

    echo Script created at %SCRIPT_PATH%
)

echo.
echo ===== JWT TOKEN UTILITY MENU =====
echo 1. Create JWT token for admin@probeops.com
echo 2. Create JWT token for custom email
echo 3. Decode and validate JWT token
echo 4. Test token with API call
echo 5. Exit
echo.

set /p choice=Enter your choice (1-5): 

if "%choice%"=="1" (
    echo Creating JWT token for admin@probeops.com...
    %PYTHON% %SCRIPT_PATH% create
    echo.
    echo Token created! You can use it to test authenticated API endpoints.
    echo.
    goto :menu_return
)

if "%choice%"=="2" (
    echo.
    set /p email=Enter email address: 
    echo Creating JWT token for %email%...
    %PYTHON% %SCRIPT_PATH% create %email%
    echo.
    echo Token created! You can use it to test authenticated API endpoints.
    echo.
    goto :menu_return
)

if "%choice%"=="3" (
    echo.
    set /p token=Enter JWT token to decode: 
    echo Decoding and validating token...
    echo.
    %PYTHON% %SCRIPT_PATH% decode %token%
    echo.
    goto :menu_return
)

if "%choice%"=="4" (
    echo.
    set /p token=Enter JWT token to test: 
    echo Testing token against /users API endpoint...
    echo.
    curl -H "Authorization: Bearer %token%" http://localhost:8000/users
    echo.
    goto :menu_return
)

if "%choice%"=="5" (
    echo Exiting...
    exit /b 0
)

echo Invalid choice. Please enter a number from 1 to 5.
echo.

:menu_return
echo.
echo Press any key to return to the menu...
pause > nul
cls
goto :eof