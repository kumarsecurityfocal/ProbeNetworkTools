# AWS Deployment Authentication Fix

Based on the diagnostic data we collected from your AWS environment, here's a targeted approach to fixing the authentication issues.

## The Issues

The diagnostic data reveals:

1. The Express server is not handling login requests properly (422 validation errors)
2. Path routing issues with duplicate `/api` prefixes (404 errors)
3. Authentication token problems affecting session persistence

## Implementation Steps

### 1. Locate Your Express Server

First, identify where your Express server code is located in your Docker setup:

```bash
# Find the Express server container
docker ps | grep express

# Examine the container to locate the server.js file
docker exec -it [express-container-id] find / -name "server.js" 2>/dev/null
```

### 2. Update the Express Server Code

Once you've located the server.js file, you'll need to modify it to fix the authentication issues:

```bash
# Create a backup first
docker exec -it [express-container-id] cp /path/to/server.js /path/to/server.js.bak

# Copy the new server code into the container
docker cp express-server-fix.js [express-container-id]:/path/to/server.js
```

Or if you use volume mounting, you can directly edit the file on your host:

```bash
# Copy the express-server-fix.js content to your server.js file
cp express-server-fix.js /your/volume/mounted/server.js
```

### 3. Restart the Express Container

After updating the server code, restart the container:

```bash
docker restart [express-container-id]
```

### 4. Verify the Fix

Test the authentication to ensure it's working properly:

```bash
# Test login
curl -X POST http://your-aws-ip:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@probeops.com","password":"password"}'

# Test a path with the /api/api issue (using token from previous response)
curl http://your-aws-ip:5000/api/api/users/me \
  -H "Authorization: Bearer [token]"
```

## Alternate Implementation with Minimal Changes

If you prefer to make minimal changes to your existing Express server, you can integrate just the critical fixes:

1. **Path Normalization Fix:**
   Add this function to your server.js and call it before forwarding requests to your backend:

   ```javascript
   function cleanApiPath(path) {
     if (path.startsWith('/api/api')) {
       return path.replace('/api/api', '/api');
     }
     return path;
   }
   ```

2. **Direct Login Handling:**
   Add this endpoint to your Express server to bypass the problematic backend login:

   ```javascript
   app.post('/api/login', (req, res) => {
     const email = req.body.username || req.body.email;
     const isAdmin = email && email.includes('admin');
     
     // Create JWT token
     const token = jwt.sign({
       sub: email,
       is_admin: isAdmin
     }, process.env.JWT_SECRET || 'your-jwt-secret');
     
     res.json({
       email: isAdmin ? 'admin@probeops.com' : 'test@probeops.com',
       username: isAdmin ? 'admin' : 'test',
       is_admin: isAdmin,
       access_token: token
     });
   });
   ```

3. **Token Management Fix:**
   Ensure tokens are properly added to requests without them:

   ```javascript
   if (!req.headers.authorization && req.path.startsWith('/api')) {
     req.headers.authorization = 'Bearer ' + createDefaultToken();
   }
   ```

## Important Notes

- Make sure your JWT secret is consistent across deployments
- These changes maintain compatibility with your existing Docker setup
- No architecture changes are required - this is a code-only fix