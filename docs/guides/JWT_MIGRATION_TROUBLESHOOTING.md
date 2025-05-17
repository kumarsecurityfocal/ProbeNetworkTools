# ProbeOps JWT Migration Troubleshooting Guide

This guide helps address authentication issues that may occur when migrating ProbeOps from one environment to another (such as from Replit to AWS).

## Common Migration Issues

### JWT User ID Mismatch

When migrating your database to a new environment, user IDs may change but JWT tokens might still reference old IDs, causing authentication failures.

**Symptoms:**
- User appears to log in successfully but is immediately logged out
- `401 Unauthorized` errors after login
- Foreign key errors in logs related to `usage_logs` or other user-related tables
- Error messages containing: `Key (user_id)=(XXXXX) is not present in table "users"`

## Quick Solution

We've provided a utility script to help fix JWT authentication issues:

```bash
# Navigate to the project root
cd /path/to/probeops

# Make the script executable
chmod +x scripts/fix_jwt_auth.py

# Check current admin user status
python scripts/fix_jwt_auth.py --check

# Reset admin user if needed
python scripts/fix_jwt_auth.py --reset

# Verify token generation works
python scripts/fix_jwt_auth.py --verify
```

## Frontend Token Cleanup

To ensure old tokens are removed from the browser:

1. Open your browser's Developer Tools (F12 or Right-click → Inspect)
2. Navigate to the Application tab
3. In the Storage section:
   - Clear Local Storage
   - Clear Session Storage
   - Delete all cookies for your domain
4. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)

## Authentication System Details

### How JWT Authentication Works in ProbeOps

1. User logs in with email/password
2. Backend verifies credentials against database
3. Backend generates JWT token containing the user's ID in the `sub` claim
4. Token is sent to frontend and stored in browser
5. Frontend includes token in Authorization header for all API requests
6. Backend validates token and extracts user ID to authenticate requests

### Common Causes of JWT Migration Issues

1. **Database ID Mismatch**: User IDs in the new database don't match the IDs encoded in tokens
2. **JWT Secret Changes**: Different JWT signing secrets between environments
3. **Schema Differences**: Column type changes between environments (e.g., numeric vs string IDs)
4. **Cached Tokens**: Old tokens stored in browser localStorage/sessionStorage

## Advanced Troubleshooting

### Checking JWT Token Contents

To decode and inspect a JWT token:

```bash
# Using the command line
echo "YOUR_JWT_TOKEN" | cut -d "." -f2 | base64 -d | jq

# Or visit https://jwt.io/ and paste your token
```

### Inspecting Database User IDs

```sql
-- Check if admin user exists and get ID
SELECT id, email FROM users WHERE email = 'admin@probeops.com';

-- Check for usage logs that might be referencing invalid user IDs
SELECT user_id, COUNT(*) FROM usage_logs GROUP BY user_id;

-- Check for foreign key constraints
SELECT * FROM information_schema.table_constraints 
WHERE constraint_name = 'usage_logs_user_id_fkey';
```

### JWT Configuration in FastAPI

The JWT authentication in ProbeOps is configured in `backend/app/auth.py`. Key parts include:

1. **Token Creation**: The `create_access_token()` function creates tokens
2. **Token Verification**: The `verify_token()` function validates tokens
3. **User Lookup**: `get_current_user()` retrieves the user record after token validation

### Manual JWT Token Generation

If needed, you can manually generate a JWT token for testing:

```python
import jwt
from datetime import datetime, timedelta

# Set your JWT secret and algorithm
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

# Create a token for a specific user ID
def create_token(user_id):
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(days=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# Generate and print a token
print(create_token(1))  # Replace 1 with your admin user ID
```

## Prevention Strategies

To prevent JWT issues in future migrations:

1. Use string identifiers like UUIDs instead of auto-incrementing IDs
2. Store JWT secrets in environment variables, not in code
3. Create a consistent initialization process for test/admin users
4. Implement token refresh mechanisms to handle token expiry
5. Add clear error messages for authentication failures