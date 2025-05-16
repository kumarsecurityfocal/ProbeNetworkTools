#!/bin/bash
# ProbeOps Admin Panel Diagnostic Script
# This script tests API endpoints and authentication to diagnose admin panel issues

echo "==== ProbeOps Admin Panel Diagnostic Tool ===="
echo "This script will help diagnose why the admin panel isn't visible."
echo

# Set defaults
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
API_BASE_URL="https://probeops.com"

# Ask for configuration
read -p "Enter admin username [admin]: " input_username
ADMIN_USERNAME=${input_username:-$ADMIN_USERNAME}

read -sp "Enter admin password [hidden]: " input_password
echo
ADMIN_PASSWORD=${input_password:-$ADMIN_PASSWORD}

read -p "Enter API base URL [https://probeops.com]: " input_url
API_BASE_URL=${input_url:-$API_BASE_URL}

echo
echo "Testing connection to $API_BASE_URL..."

# Create log file
LOG_FILE="admin-panel-diagnostic-$(date +%Y%m%d-%H%M%S).log"
echo "ProbeOps Admin Panel Diagnostic Results" > $LOG_FILE
echo "Date: $(date)" >> $LOG_FILE
echo "API URL: $API_BASE_URL" >> $LOG_FILE
echo "Admin Username: $ADMIN_USERNAME" >> $LOG_FILE
echo "----------------------------------------" >> $LOG_FILE

# Function to log API responses
log_response() {
    local endpoint=$1
    local http_code=$2
    local response=$3
    
    echo "Endpoint: $endpoint" >> $LOG_FILE
    echo "HTTP Status: $http_code" >> $LOG_FILE
    echo "Response:" >> $LOG_FILE
    echo "$response" >> $LOG_FILE
    echo "----------------------------------------" >> $LOG_FILE
}

# Test API health
echo "1. Testing API health..."
health_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/health")
if [ "$health_response" = "200" ]; then
    echo "✅ API health check successful"
    echo "API Health: OK (200)" >> $LOG_FILE
else
    echo "❌ API health check failed: $health_response"
    echo "API Health: Failed ($health_response)" >> $LOG_FILE
fi

# Try different auth endpoints
echo
echo "2. Testing authentication endpoints..."

# Array of possible auth endpoints to try
auth_endpoints=(
    "/auth/login"
    "/auth/token"
    "/login"
    "/token"
)

auth_success=false
for endpoint in "${auth_endpoints[@]}"; do
    echo "   Trying $endpoint..."
    
    # Create form data for login
    auth_data="username=$ADMIN_USERNAME&password=$ADMIN_PASSWORD"
    
    # Try to authenticate
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -X POST "$API_BASE_URL$endpoint" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "$auth_data")
    
    # Extract HTTP code and body
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d":" -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    log_response "$endpoint" "$http_code" "$body"
    
    # Check if login was successful
    if [ "$http_code" = "200" ]; then
        echo "✅ Authentication successful via $endpoint"
        auth_success=true
        
        # Extract token from response
        access_token=$(echo $body | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$access_token" ]; then
            echo "   Access token obtained"
            break
        else
            echo "❌ No access token in response"
        fi
    else
        echo "❌ Authentication failed via $endpoint: HTTP $http_code"
    fi
done

if [ "$auth_success" = false ]; then
    echo "❌ All authentication attempts failed"
    echo "All authentication attempts failed" >> $LOG_FILE
    echo
    echo "Diagnostic log saved to: $LOG_FILE"
    exit 1
fi

# Test user profile endpoints
echo
echo "3. Testing user profile endpoints..."

profile_endpoints=(
    "/users/me"
    "/auth/users/me"
    "/me"
    "/profile"
)

profile_success=false
for endpoint in "${profile_endpoints[@]}"; do
    echo "   Trying $endpoint..."
    
    # Get user profile
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -X GET "$API_BASE_URL$endpoint" \
        -H "Authorization: Bearer $access_token")
    
    # Extract HTTP code and body
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d":" -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    log_response "$endpoint" "$http_code" "$body"
    
    # Check if profile fetch was successful
    if [ "$http_code" = "200" ]; then
        echo "✅ Profile fetch successful via $endpoint"
        profile_success=true
        
        # Check for admin flag
        is_admin=$(echo $body | grep -o '"is_admin":[^,}]*' | cut -d":" -f2)
        if [ -n "$is_admin" ]; then
            echo "   is_admin flag found: $is_admin"
            if [ "$is_admin" = "true" ]; then
                echo "✅ User has admin privileges"
            else
                echo "❌ User does not have admin privileges"
            fi
        else
            echo "❌ is_admin flag not found in profile"
        fi
        
        break
    else
        echo "❌ Profile fetch failed via $endpoint: HTTP $http_code"
    fi
done

if [ "$profile_success" = false ]; then
    echo "❌ All profile fetch attempts failed"
    echo "All profile fetch attempts failed" >> $LOG_FILE
fi

# Test admin-specific endpoints
echo
echo "4. Testing admin-specific endpoints..."

admin_endpoints=(
    "/users"
    "/subscriptions/tiers"
    "/metrics/system"
)

for endpoint in "${admin_endpoints[@]}"; do
    echo "   Trying $endpoint..."
    
    # Get admin data
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -X GET "$API_BASE_URL$endpoint" \
        -H "Authorization: Bearer $access_token")
    
    # Extract HTTP code and body
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d":" -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    log_response "$endpoint" "$http_code" "$body"
    
    # Check if admin endpoint access was successful
    if [ "$http_code" = "200" ]; then
        echo "✅ Admin endpoint access successful: $endpoint"
    else
        echo "❌ Admin endpoint access failed: $endpoint (HTTP $http_code)"
    fi
done

echo
echo "Diagnostic complete. Results saved to: $LOG_FILE"
echo "Please provide this file to the support team for analysis."