@echo off
echo ProbeOps JWT Configuration Check Script
echo ======================================
echo.

echo Checking environment variables...
echo.

REM Check if .env.db exists
if exist .env.db (
    echo [INFO] Found .env.db file
    echo ------------------------------
    type .env.db | findstr DATABASE_URL
    echo ------------------------------
) else (
    echo [WARNING] .env.db file not found
)

echo.
echo Checking backend environment...
if exist backend\.env.backend (
    echo [INFO] Found backend/.env.backend file
    echo ------------------------------
    type backend\.env.backend | findstr DATABASE_URL
    type backend\.env.backend | findstr JWT_SECRET
    echo ------------------------------
) else (
    echo [WARNING] backend/.env.backend file not found
)

echo.
echo Creating .env.db from backend environment if needed...
if not exist .env.db (
    if exist backend\.env.backend (
        echo [INFO] Creating .env.db from backend/.env.backend...
        type backend\.env.backend | findstr DATABASE_URL > .env.db
        echo [SUCCESS] Created .env.db file with DATABASE_URL
        echo ------------------------------
        type .env.db
        echo ------------------------------
    )
)

echo.
echo Check complete. Now run test_jwt_auth.bat to test JWT authentication