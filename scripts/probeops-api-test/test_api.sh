#!/bin/bash
# ProbeOps API Test Script that works on both Linux and Windows (via Git Bash)
# Tests various API endpoints with the correct parameters

echo "ProbeOps API Authentication Test Script"
echo "======================================"

# Step 1: Login to get access token
echo -e "\n\n== Step 1: Testing Login API =="
echo "Command: curl -X POST http://localhost:8000/login -d \"username=admin@probeops.com\" -d \"password=probeopS1@\""

response=$(curl -s -X POST http://localhost:8000/login \
     -d "username=admin@probeops.com" \
     -d "password=probeopS1@")

echo -e "\nResponse:"
echo "$response"

# Extract token if login was successful
if [[ "$response" == *"access_token"* ]]; then
    # Extract token using grep and cut
    token=$(echo "$response" | grep -o "\"access_token\":\"[^\"]*\"" | cut -d"\"" -f4)
    echo -e "\nAccess Token: $token"
    echo "$token" > access_token.txt
    echo "Token saved to access_token.txt"
else
    echo -e "\nLogin failed. Could not extract token."
    exit 1
fi

# Step 2: Test user profile with token
echo -e "\n\n== Step 2: Testing User Profile API =="
echo "Command: curl -X GET http://localhost:8000/users/me -H \"Authorization: Bearer $token\""

user_response=$(curl -s -X GET http://localhost:8000/users/me \
     -H "Authorization: Bearer $token")

echo -e "\nResponse:"
echo "$user_response"

# Step 3: Test subscription status
echo -e "\n\n== Step 3: Testing Subscription API =="
echo "Command: curl -X GET http://localhost:8000/subscription -H \"Authorization: Bearer $token\""

subscription_response=$(curl -s -X GET http://localhost:8000/subscription \
     -H "Authorization: Bearer $token")

echo -e "\nResponse:"
echo "$subscription_response"

echo -e "\n\nTest complete. All commands executed successfully."

# Instructions for connecting to production
echo -e "\n\nTo test against production:"
echo "1. Replace http://localhost:8000 with https://probeops.com/api"
echo "2. Example production login: curl -X POST https://probeops.com/api/login -d \"username=admin@probeops.com\" -d \"password=probeopS1@\""

