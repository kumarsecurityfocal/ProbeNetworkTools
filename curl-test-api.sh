#!/bin/bash
# Simple curl script to test API endpoints

echo "ProbeOps API Test Script"
echo "======================="
echo

# Set default values
BACKEND_HOST="probeops.com"
USERNAME="admin@probeops.com"

echo "Testing API at https://$BACKEND_HOST"
echo

# Prompt for password
read -sp "Enter password for $USERNAME: " PASSWORD
echo

# Create results file
echo "ProbeOps API Test Results" > results.txt
echo "=======================" >> results.txt
echo "Testing time: $(date)" >> results.txt
echo >> results.txt

# Health check
echo "Testing API health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" "https://$BACKEND_HOST/health" -o health_content.txt)
if [ "$HEALTH_RESPONSE" == "200" ]; then
    echo "Health check: OK"
    echo "Health check: OK" >> results.txt
else
    echo "Health check: Failed ($HEALTH_RESPONSE)"
    echo "Health check: Failed ($HEALTH_RESPONSE)" >> results.txt
    # Try alternative endpoint
    echo "Trying alternative health endpoint..."
    ALT_HEALTH_RESPONSE=$(curl -s -w "%{http_code}" "https://$BACKEND_HOST/api/health" -o health_alt_content.txt)
    echo "Alternative health status: $ALT_HEALTH_RESPONSE" >> results.txt
fi

# Login attempt
echo
echo "Attempting to log in as $USERNAME..."
LOGIN_RESPONSE=$(curl -s "https://$BACKEND_HOST/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD")

echo "Login response:" >> results.txt
echo "$LOGIN_RESPONSE" >> results.txt

# Check if login was successful
if [[ $LOGIN_RESPONSE == *"access_token"* ]]; then
    echo "Login successful, token received"
    echo "Login successful" >> results.txt
    
    # Extract token
    TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    echo "Token: ${TOKEN:0:15}..." >> results.txt
else
    echo "Login failed, trying alternative endpoint"
    echo "Login failed with standard endpoint" >> results.txt
    
    # Try alternative endpoint
    ALT_LOGIN_RESPONSE=$(curl -s "https://$BACKEND_HOST/auth/login" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "username=$USERNAME&password=$PASSWORD")
    
    echo "Alternative login response:" >> results.txt
    echo "$ALT_LOGIN_RESPONSE" >> results.txt
    
    if [[ $ALT_LOGIN_RESPONSE == *"access_token"* ]]; then
        echo "Login successful with alternative endpoint"
        echo "Login successful with alternative endpoint" >> results.txt
        
        # Extract token
        TOKEN=$(echo $ALT_LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        echo "Token: ${TOKEN:0:15}..." >> results.txt
    else
        echo "Login failed on both endpoints"
        echo "Login failed on both endpoints" >> results.txt
        exit 1
    fi
fi

# Test user profile
echo
echo "Testing user profile endpoint..."
USER_PROFILE=$(curl -s "https://$BACKEND_HOST/users/me" \
  -H "Authorization: Bearer $TOKEN")

echo "User profile response:" >> results.txt
echo "$USER_PROFILE" >> results.txt

# Check if response is HTML or JSON
if [[ $USER_PROFILE == *"<!DOCTYPE html>"* ]]; then
    echo "WARNING: User profile endpoint returned HTML instead of JSON"
    echo "WARNING: User profile endpoint returned HTML instead of JSON" >> results.txt
    echo "This indicates a routing issue in NGINX"
    echo "This indicates a routing issue in NGINX" >> results.txt
else
    echo "User profile endpoint returned JSON"
    echo "User profile endpoint returned JSON" >> results.txt
    
    # Check for admin flag
    if [[ $USER_PROFILE == *"is_admin"* ]]; then
        if [[ $USER_PROFILE == *"\"is_admin\":true"* ]]; then
            echo "Admin flag is present and TRUE"
            echo "Admin flag is present and TRUE" >> results.txt
        else
            echo "Admin flag is present but NOT TRUE"
            echo "Admin flag is present but NOT TRUE" >> results.txt
        fi
    else
        echo "Admin flag is MISSING from response"
        echo "Admin flag is MISSING from response" >> results.txt
    fi
fi

# Test subscriptions endpoint
echo
echo "Testing subscriptions endpoint..."
SUBSCRIPTIONS=$(curl -s "https://$BACKEND_HOST/subscriptions" \
  -H "Authorization: Bearer $TOKEN")

echo "Subscriptions response:" >> results.txt
echo "$SUBSCRIPTIONS" >> results.txt

# Check if admin page exists
echo
echo "Checking for admin page..."
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$BACKEND_HOST/admin")
echo "Admin page status: $ADMIN_STATUS" >> results.txt

# Complete the test
echo
echo "Testing completed. Results saved to results.txt"
echo "Please share the contents of results.txt for analysis"
echo

# Print the command to view results
echo "To view results, run: cat results.txt"