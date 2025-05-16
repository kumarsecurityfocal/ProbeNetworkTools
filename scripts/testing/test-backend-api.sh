#!/bin/bash
# Script to test backend API endpoints directly on the server

echo "ProbeOps API Endpoint Test Script"
echo "================================="

# Set default values
BACKEND_HOST="localhost"
BACKEND_PORT="8000"
USERNAME="admin"
PASSWORD=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --host)
      BACKEND_HOST="$2"
      shift 2
      ;;
    --port)
      BACKEND_PORT="$2"
      shift 2
      ;;
    --username)
      USERNAME="$2"
      shift 2
      ;;
    --password)
      PASSWORD="$2"
      shift 2
      ;;
    *)
      echo "Unknown parameter: $1"
      exit 1
      ;;
  esac
done

# If password wasn't specified via arguments, prompt for it
if [ -z "$PASSWORD" ]; then
  read -sp "Enter password for $USERNAME: " PASSWORD
  echo
fi

# Base URL for API
BASE_URL="http://$BACKEND_HOST:$BACKEND_PORT"
echo "Testing API at $BASE_URL"

# Health check
echo -n "Testing API health... "
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "OK (200)"
else
    echo "Failed ($HEALTH_RESPONSE)"
    echo "API health check failed. Please ensure the backend is running."
    exit 1
fi

# Attempt to log in
echo -n "Attempting to log in as $USERNAME... "
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD")

# Check if login was successful
if [[ $LOGIN_RESPONSE == *"access_token"* ]]; then
    echo "Success"
    # Extract token
    TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    echo "Token received: ${TOKEN:0:10}..."
else
    echo "Failed"
    echo "Login response: $LOGIN_RESPONSE"
    # Try alternative endpoint
    echo -n "Trying alternative login endpoint... "
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "username=$USERNAME&password=$PASSWORD")
    
    if [[ $LOGIN_RESPONSE == *"access_token"* ]]; then
        echo "Success"
        # Extract token
        TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        echo "Token received: ${TOKEN:0:10}..."
    else
        echo "Failed"
        echo "Login response: $LOGIN_RESPONSE"
        exit 1
    fi
fi

# Test user profile endpoints
echo "Testing user profile endpoints..."
echo -n "GET /users/me: "
USER_RESPONSE=$(curl -s -X GET "$BASE_URL/users/me" \
  -H "Authorization: Bearer $TOKEN")

# Check for HTML in response (indicates routing issue)
if [[ $USER_RESPONSE == *"<!DOCTYPE html>"* ]]; then
    echo "FAILED - Response contains HTML instead of JSON"
    echo "This indicates a routing issue - API calls are being sent to frontend"
else
    # Check for admin flag
    if [[ $USER_RESPONSE == *"is_admin"* ]]; then
        IS_ADMIN=$(echo $USER_RESPONSE | grep -o '"is_admin":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        echo "Success - is_admin: $IS_ADMIN"
    else
        echo "FAILED - 'is_admin' flag not found in response"
        echo "Response: $USER_RESPONSE"
    fi
fi

# Test direct database access
echo -n "Testing direct database access for user... "
if command -v docker &> /dev/null; then
    # Run a query inside the database container to check user table
    DB_RESPONSE=$(docker exec probeops-db psql -U postgres -c "SELECT username, is_admin FROM users WHERE username='$USERNAME';" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "Success"
        echo "$DB_RESPONSE"
    else
        echo "Failed to query database"
    fi
else
    echo "Docker not available - skipping database check"
fi

echo
echo "Test completed. Please share these results for further troubleshooting."