# ProbeOps JWT Authentication Testing Guide

This document provides command-line tools and scripts to test, debug, and fix JWT authentication issues in the ProbeOps system.

## Testing JWT Authentication from Command Line

### Linux/macOS Commands

#### 1. Check if admin user exists

```bash
# Check if admin user exists and is properly configured
python3 scripts/fix_jwt_auth.py --check
```

#### 2. Reset/Create Admin User

```bash
# Reset the admin user or create if it doesn't exist
python3 scripts/fix_jwt_auth.py --reset
```

#### 3. Verify JWT Token Generation

```bash
# Verify token generation and validation
python3 scripts/fix_jwt_auth.py --verify
```

#### 4. Manual Login Request

```bash
# Test login with admin credentials
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"probeopS1@"}' \
  http://localhost:8000/login
```

#### 5. Test Protected Endpoint

```bash
# First get a token
TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"probeopS1@"}' \
  http://localhost:8000/login | jq -r '.access_token')

# Then use the token to access a protected endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/users
```

#### 6. Check JWT Token Payload

```bash
# Get and decode a JWT token
TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"probeopS1@"}' \
  http://localhost:8000/login | jq -r '.access_token')

# Decode the token (will show header and payload without verification)
echo $TOKEN | cut -d "." -f2 | base64 -d 2>/dev/null | jq .
```

### Windows 11 Commands (PowerShell)

#### 1. Check Admin User

```powershell
# Check if admin user exists
python scripts/fix_jwt_auth.py --check
```

#### 2. Reset/Create Admin User

```powershell
# Reset the admin user or create if it doesn't exist
python scripts/fix_jwt_auth.py --reset
```

#### 3. Verify JWT Token

```powershell
# Verify token generation and validation
python scripts/fix_jwt_auth.py --verify
```

#### 4. Manual Login Request (PowerShell)

```powershell
# Test login with admin credentials
$loginBody = @{
    username = "admin"
    password = "probeopS1@"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $response.access_token
Write-Host "Token: $token"
```

#### 5. Test Protected Endpoint (PowerShell)

```powershell
# Using token from previous step
$headers = @{
    Authorization = "Bearer $token"
}

$usersResponse = Invoke-RestMethod -Uri "http://localhost:8000/users" -Method Get -Headers $headers
$usersResponse | ConvertTo-Json
```

## Windows Batch Script for Testing

Create a file named `test_jwt_auth.bat` with the following content:

```batch
@echo off
echo ProbeOps JWT Authentication Test Script
echo ======================================
echo.

echo 1. Check if admin user exists...
python scripts/fix_jwt_auth.py --check
echo.

echo 2. Reset/Create admin user...
python scripts/fix_jwt_auth.py --reset
echo.

echo 3. Verify JWT token generation...
python scripts/fix_jwt_auth.py --verify
echo.

echo Script completed.
```

## Advanced Debugging

### 1. Manual JWT Token Creation

You can use the Python JWT library to manually create a token for testing:

```python
import jwt
from datetime import datetime, timedelta

# Create a token for admin@probeops.com
payload = {
    "sub": "admin@probeops.com",
    "exp": datetime.utcnow() + timedelta(days=1)
}

# Use your JWT_SECRET from .env file
token = jwt.encode(payload, "super-secret-key-change-in-production", algorithm="HS256")
print(f"Generated token: {token}")
```

### 2. Database Inspection

Check the user table structure and admin user record:

```bash
# Connect to PostgreSQL database
psql $DATABASE_URL

# Show users table structure
\d users

# Check admin user record
SELECT id, email, username, password, is_admin, is_active FROM users WHERE email = 'admin@probeops.com';
```

### 3. Front-end Authentication Testing

```javascript
// In browser console
localStorage.setItem('token', 'your_jwt_token_here');

// Then refresh the page to test if the token is accepted
```

## SQL Queries for User Management

### Create Admin User Manually

```sql
INSERT INTO users (email, username, password, is_admin, is_active)
VALUES ('admin@probeops.com', 'admin', 
        '$2b$12$Yqk8B9OKZ7X/lJyKtAiAIuUvV6wbQRFyI.pAXJBmI2oEMlZJR5oJW', 
        TRUE, TRUE);
```

### Update Admin Password

```sql
UPDATE users 
SET password = '$2b$12$Yqk8B9OKZ7X/lJyKtAiAIuUvV6wbQRFyI.pAXJBmI2oEMlZJR5oJW' 
WHERE email = 'admin@probeops.com';
```

## Checking Environment Variables

### Verify JWT Secret Configuration

```bash
# Check if JWT_SECRET is set in environment
grep "JWT_SECRET" backend/.env.backend

# Verify the variable is being loaded by the application
python3 -c "
import os
import sys
sys.path.append('.')
from backend.app.config import settings
print(f'JWT_SECRET from settings: {settings.JWT_SECRET}')
"
```

## Common Issues and Solutions

1. **Mismatched user IDs**: If database migration created a new user ID for admin, JWT tokens with old IDs will fail.
   - Solution: Use the fix_jwt_auth.py --reset command to re-create tokens with correct IDs.

2. **Expired tokens**: JWT tokens have an expiration time.
   - Solution: Generate a new token by logging in again.

3. **Invalid token format**: Ensure the token is properly formatted in requests.
   - Solution: Use the Bearer prefix: `Authorization: Bearer <token>`.

4. **Username field missing**: Older database schemas might not have the username field.
   - Solution: The fix_jwt_auth.py script now adds this field automatically.

5. **Database connection issues**: The JWT auth script can't connect to the database.
   - Solution: Ensure DATABASE_URL is properly set in .env.db file.