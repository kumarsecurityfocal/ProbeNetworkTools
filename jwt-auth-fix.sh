#!/bin/bash
# JWT Authentication Fix Module
# This can be added to your deploy.sh script

# Create a function to check and fix JWT authentication issues
fix_jwt_auth() {
  echo "===== JWT Authentication Check ====="
  echo "Checking authentication configuration..."
  
  # Check if the JWT secret is set in the environment
  if [ -z "$JWT_SECRET" ]; then
    echo "WARNING: JWT_SECRET environment variable not set!"
    echo "Setting a default JWT secret for development (DO NOT use in production)"
    export JWT_SECRET="development_secure_key_for_testing"
  else
    echo "JWT_SECRET is configured properly"
  fi
  
  # Check if we can connect to the backend API
  echo "Testing backend API connectivity..."
  BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "failed")
  
  if [ "$BACKEND_HEALTH" = "200" ]; then
    echo "Backend API is accessible (HTTP 200 OK)"
  else
    echo "WARNING: Backend API health check failed! Status: $BACKEND_HEALTH"
    echo "This may cause authentication issues"
  fi
  
  # Test token generation and validation
  echo "Testing JWT token generation and validation..."
  
  # Generate a timestamp for the token
  TIMESTAMP=$(date +%s)
  EXPIRY=$((TIMESTAMP + 86400)) # 24 hours
  
  # Create a token payload
  PAYLOAD="{\"sub\":\"admin@probeops.com\",\"exp\":$EXPIRY,\"iat\":$TIMESTAMP}"
  PAYLOAD_BASE64=$(echo -n "$PAYLOAD" | openssl base64 -A | tr '+/' '-_' | tr -d '=')
  
  # Create a token header
  HEADER="{\"alg\":\"HS256\",\"typ\":\"JWT\"}"
  HEADER_BASE64=$(echo -n "$HEADER" | openssl base64 -A | tr '+/' '-_' | tr -d '=')
  
  # Create the signature
  SIGNATURE_DATA="$HEADER_BASE64.$PAYLOAD_BASE64"
  SIGNATURE=$(echo -n "$SIGNATURE_DATA" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | openssl base64 -A | tr '+/' '-_' | tr -d '=')
  
  # Full token
  TOKEN="$HEADER_BASE64.$PAYLOAD_BASE64.$SIGNATURE"
  
  echo "Generated admin test token: $TOKEN"
  echo "Token expires: $(date -d @$EXPIRY)"
  
  # Save the token to a file for reference
  echo "$TOKEN" > admin-test-token.txt
  echo "Token saved to admin-test-token.txt"
  
  # Test a login request
  echo "Testing authentication with backend API..."
  LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"admin@probeops.com","password":"AdminPassword123"}' http://localhost:8000/login 2>/dev/null)
  
  # Check if the response is valid JSON
  if echo "$LOGIN_RESPONSE" | jq -e . >/dev/null 2>&1; then
    echo "Login API returned valid JSON - good sign!"
    TOKEN_FROM_LOGIN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // "none"')
    
    if [ "$TOKEN_FROM_LOGIN" != "none" ]; then
      echo "Login successful! Token received from API"
    else
      echo "WARNING: Login API did not return a token. Response:"
      echo "$LOGIN_RESPONSE" | jq '.'
    fi
  else
    echo "ERROR: Login API did not return valid JSON!"
    echo "First 200 characters of response:"
    echo "${LOGIN_RESPONSE:0:200}..."
    
    # Check if it's HTML (likely an error page)
    if [[ "$LOGIN_RESPONSE" == *"<!DOCTYPE"* || "$LOGIN_RESPONSE" == *"<html"* ]]; then
      echo "DETECTED HTML RESPONSE: Authentication API is returning HTML instead of JSON!"
      echo "This is likely causing authentication failures in AWS"
      
      # Add a fix for the server configuration if running in AWS
      if [[ -n "$EC2_INSTANCE_ID" || -n "$AWS_REGION" ]]; then
        echo "AWS environment detected, applying authentication fix..."
        
        # Create a simple auth fix script
        cat > /tmp/auth-fix.js << EOF
// Simple middleware to ensure JSON responses for auth endpoints
app.use((req, res, next) => {
  // Store original methods
  const originalJson = res.json;
  const originalSend = res.send;
  
  // Override json method to add proper headers
  res.json = function(obj) {
    res.setHeader('Content-Type', 'application/json');
    return originalJson.call(this, obj);
  };
  
  // Override send method to check for HTML responses on auth endpoints
  res.send = function(body) {
    const url = req.url.toLowerCase();
    const isAuthEndpoint = url.includes('/login') || 
                          url.includes('/auth') || 
                          url.includes('/token');
    
    // Check if this is an auth endpoint and response is HTML
    if (isAuthEndpoint && typeof body === 'string' && 
        (body.includes('<!DOCTYPE') || body.includes('<html'))) {
      console.error('HTML response detected for auth endpoint:', req.url);
      // Convert HTML error to JSON error
      return res.status(res.statusCode || 500)
        .json({ error: 'Authentication error', status: res.statusCode });
    }
    
    return originalSend.call(this, body);
  };
  
  next();
});
EOF
        
        echo "Authentication fix middleware created. Apply it to your server by adding the contents of /tmp/auth-fix.js to your backend app file."
      fi
    fi
  fi
  
  echo "===== JWT Authentication Check Complete ====="
}

# Execute the fix function
fix_jwt_auth