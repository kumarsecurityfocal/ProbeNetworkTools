# ProbeOps Authentication Flow

This document provides a comprehensive overview of the authentication system in ProbeOps, including the token flow, security considerations, and troubleshooting steps.

## Authentication Architecture

The ProbeOps platform uses a multi-layered authentication approach:

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│           │     │           │     │           │     │           │
│  Browser  │────▶│  Express  │────▶│  FastAPI  │────▶│ PostgreSQL│
│  Client   │     │  Server   │     │  Backend  │     │ Database  │
│           │     │           │     │           │     │           │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
       │                │                 │                 │
       │                │                 │                 │
       │     Login Request                │                 │
       │───────────────▶│                 │                 │
       │                │                 │                 │
       │                │  Standard User: │                 │
       │                │  Forward Login  │                 │
       │                │────────────────▶│                 │
       │                │                 │    Verify User  │
       │                │                 │─────────────────▶
       │                │                 │                 │
       │                │                 │    User Data    │
       │                │                 │◀─────────────────
       │                │                 │                 │
       │                │   JWT Token     │                 │
       │                │◀────────────────│                 │
       │                │                 │                 │
       │                │  Admin User:    │                 │
       │                │  Direct Token   │                 │
       │                │  Generation     │                 │
       │                │                 │                 │
       │   JWT Token    │                 │                 │
       │◀───────────────│                 │                 │
       │                │                 │                 │
       │  API Request with Token          │                 │
       │───────────────▶│                 │                 │
       │                │  Forward with   │                 │
       │                │  Token          │                 │
       │                │────────────────▶│                 │
       │                │                 │  Verify Token   │
       │                │                 │─────────────────▶
       │                │                 │                 │
       │                │                 │  Token Valid    │
       │                │                 │◀─────────────────
       │                │                 │                 │
       │                │   API Response  │                 │
       │                │◀────────────────│                 │
       │  API Response  │                 │                 │
       │◀───────────────│                 │                 │
       │                │                 │                 │
```

## Token Generation & Validation

### JWT Token Structure

The JWT tokens used in ProbeOps follow this structure:

```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "sub": "user@example.com",  // Subject (user identifier)
  "exp": 1672531200,          // Expiration timestamp
  "iat": 1672444800           // Issued at timestamp
}

Signature:
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  JWT_SECRET
)
```

### Token Generation

1. **Standard Users**:
   - Credentials validated by the FastAPI backend
   - Token generated using the backend's JWT implementation
   - Token returned to the Express server, then to the client

2. **Admin User Special Case**:
   - Admin credentials validated directly in Express server
   - Token generated using the server's JWT implementation
   - Token returned directly to the client
   - This provides fallback authentication when the backend is unavailable

### Token Validation

1. **Client-Side**:
   - Token stored in localStorage by the React application
   - Token attached to all API requests in the Authorization header
   - Token expiration checked before making requests

2. **Server-Side**:
   - Express server validates token for certain endpoints
   - Most requests are proxied to the backend with the token
   - Backend performs full token validation for all protected endpoints

3. **Backend**:
   - FastAPI validates token signature and expiration
   - User claims extracted from token
   - Permissions checked based on user roles and subscription

## Authentication Code Flow

### Frontend Authentication (React)

The React application handles authentication through:

1. **AuthContext**: Manages authentication state, provides login/logout methods
2. **API Service**: Attaches authentication tokens to requests
3. **Protected Routes**: Components that redirect to login if not authenticated

The key authentication methods are:

```javascript
// Login function
const login = async (credentials) => {
  try {
    const response = await axios.post('/api/login', credentials);
    const { access_token, user } = response.data;
    
    // Store token in localStorage
    localStorage.setItem('auth_token', access_token);
    
    // Update auth state
    setAuthState({
      isAuthenticated: true,
      user,
      token: access_token
    });
    
    return user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Logout function
const logout = () => {
  localStorage.removeItem('auth_token');
  setAuthState({
    isAuthenticated: false,
    user: null,
    token: null
  });
};

// API request with authentication
const authenticatedRequest = async (url, method, data) => {
  const token = localStorage.getItem('auth_token');
  
  try {
    const response = await axios({
      url,
      method,
      data,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    return response.data;
  } catch (error) {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      logout(); // Force logout on authentication failure
    }
    throw error;
  }
};
```

### Express Server Authentication

The Express server handles authentication through:

1. **Proxy Middleware**: Forwards authenticated requests to the backend
2. **Direct Authentication**: Special case for admin users when backend is unavailable

```javascript
// JWT helper function to create valid tokens
function createValidToken(email = "admin@probeops.com") {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: email,
    exp: now + 86400, // 24 hours
    iat: now          // issued at timestamp
  };
  
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

// Login handler with special case for admin
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // Special handling for admin user - generate valid token
  if (username === 'admin@probeops.com' && password === 'probeopS1@') {
    // Create a properly signed token using our function
    const token = createValidToken("admin@probeops.com");
    
    // Return a valid token response that will work with the frontend
    return res.status(200).json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@probeops.com',
        is_admin: true,
        is_active: true,
        email_verified: true,
        created_at: new Date().toISOString()
      }
    });
  }
  
  // For other users, forward request to backend
  // Format request for backend token endpoint
  const loginData = {
    username: username,
    password: password
  };
  
  axios.post(`${BACKEND_URL}/auth/token`, loginData)
    .then(response => {
      // Return token from backend to client
      res.status(200).json(response.data);
    })
    .catch(error => {
      // Forward error from backend
      res.status(error.response?.status || 500).json(error.response?.data || { detail: 'Authentication failed' });
    });
});

// Authentication middleware for protected endpoints
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ detail: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ detail: 'Invalid token' });
  }
}

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  // Access req.user for user information
  res.json({ message: 'This is protected data', user: req.user });
});
```

### Backend Authentication (FastAPI)

The FastAPI backend implements JWT authentication:

```python
# JWT token setup
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Secret key and algorithm
SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# Token generation
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    
    # Set expiration
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    
    # Create token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Token verification
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        
        if email is None:
            raise credentials_exception
            
        # Get user from database
        user = await get_user_by_email(email)
        
        if user is None:
            raise credentials_exception
            
        return user
    except JWTError:
        raise credentials_exception

# Login endpoint
@app.post("/auth/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Authenticate user
    user = authenticate_user(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user
    }

# Protected endpoint example
@app.get("/users/me")
async def read_users_me(current_user = Depends(get_current_user)):
    return current_user
```

## Security Considerations

### Token Security

1. **Secret Management**:
   - JWT_SECRET must be securely stored and consistent across all services
   - Use environment variables, never hardcode secrets
   - Consider rotating secrets periodically

2. **Token Lifespan**:
   - Standard tokens expire after 24 hours
   - Consider shorter expiration for higher security requirements
   - Implement token refresh for longer sessions

3. **Transport Security**:
   - Always use HTTPS in production
   - Set secure and httpOnly flags on cookies
   - Implement proper CORS policies

### Common Security Risks

1. **Cross-Site Scripting (XSS)**:
   - Risk: Attacker injects malicious scripts to steal tokens from localStorage
   - Mitigation: Content Security Policy, input sanitization, httpOnly cookies

2. **Cross-Site Request Forgery (CSRF)**:
   - Risk: Attacker tricks user into performing unwanted actions
   - Mitigation: Anti-CSRF tokens, SameSite cookies, proper Origin validation

3. **Token Theft**:
   - Risk: Interception of tokens in transit or from client storage
   - Mitigation: HTTPS, secure storage, short expiration times

## Troubleshooting Authentication Issues

### Common Authentication Problems

1. **Token Validation Failures**:
   - Mismatched JWT_SECRET between services
   - Clock skew between servers
   - Token expiration
   - Invalid token format

2. **Login Failures**:
   - Incorrect credentials
   - User account disabled
   - Backend connectivity issues
   - Database errors

3. **Session Management Issues**:
   - Token not properly stored in client
   - Token not included in requests
   - Improper token refresh

### Diagnostic Steps

1. **Check Token Generation**:
   - Verify proper payload structure
   - Confirm correct secret is used
   - Validate expiration times

2. **Inspect Token Content**:
   - Decode token using tools like jwt.io
   - Check expiration time
   - Verify user claims

3. **Test Authentication Flow**:
   - Try admin login (bypasses backend)
   - Check server logs for detailed error information
   - Verify backend connectivity

4. **Examine Client-Side Storage**:
   - Confirm token is properly saved in localStorage
   - Check token is included in request headers
   - Verify token format is correct

### Logging and Debugging

Enhanced logging has been added to trace authentication:

1. **Token Generation Logging**:
   - Logs token payload creation
   - Verifies token immediately after generation
   - Records token validation results

2. **Request/Response Logging**:
   - Captures authentication headers
   - Records request data for auth endpoints
   - Logs response status and token information

3. **File-Based Logging**:
   - Authentication events written to auth-debug.log
   - Includes timestamps for sequence analysis
   - Contains detailed token information for debugging

## Architecture Improvements

Potential enhancements to the authentication system:

1. **Token Refresh**:
   - Implement refresh tokens for extended sessions
   - Silent background token renewal
   - Sliding expiration for active users

2. **Multi-Factor Authentication**:
   - Optional 2FA for enhanced security
   - Integration with authentication apps
   - Recovery codes for backup access

3. **Role-Based Access Control**:
   - Enhance permissions based on user roles
   - Store roles in token claims
   - Granular API endpoint permissions

4. **Centralized Auth Service**:
   - Separate authentication microservice
   - Consistent token generation and validation
   - Shared user management

## FAQs and Best Practices

### Frequently Asked Questions

1. **Q: Why do we have separate auth in Express and FastAPI?**
   
   A: The dual authentication system provides redundancy and fallback authentication. The Express server can authenticate admin users even when the backend is unavailable, ensuring administrative access during maintenance or outages.

2. **Q: How can we ensure the JWT_SECRET is consistent?**
   
   A: Store the JWT_SECRET as an environment variable that's set consistently across all services. In production, use a secrets management system to distribute the secret to all containers.

3. **Q: How do we handle token expiration on the client?**
   
   A: The client should check token expiration before making requests. If expired, redirect to login. Alternatively, implement a token refresh system to automatically obtain new tokens before expiration.

4. **Q: What happens if the backend is unreachable?**
   
   A: Admin users can still log in through the Express server's direct authentication. Normal users will receive authentication errors and need to wait for backend connectivity to be restored.

### Best Practices

1. **Secure Storage**:
   - Never store tokens in code or version control
   - Use environment variables for secrets
   - Consider a dedicated secrets management solution

2. **Token Handling**:
   - Keep token expiration reasonable (24 hours max)
   - Include only necessary claims in tokens
   - Validate tokens on every protected request

3. **Authentication Flow**:
   - Implement proper error handling and feedback
   - Log authentication events for auditing
   - Sanitize authentication errors in production

4. **Security Testing**:
   - Regularly test authentication endpoints
   - Perform security audits on the auth system
   - Test token validation edge cases