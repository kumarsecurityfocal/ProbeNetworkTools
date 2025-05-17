#!/bin/bash
# Debug script for ProbeOps login on Linux

echo "============================================"
echo "ProbeOps API Debug Login Test (Linux version)"
echo "============================================"

# Directory for temporary files
TEMP_DIR="./debug_login_tmp"
mkdir -p $TEMP_DIR

# Create the login files with different formats to test
echo '{"username":"admin@probeops.com","password":"probeopS1@"}' > $TEMP_DIR/login1.json
echo '{"email":"admin@probeops.com","password":"probeopS1@"}' > $TEMP_DIR/login2.json
echo '{"username":"admin","password":"probeopS1@"}' > $TEMP_DIR/login3.json

echo "Created test files for login attempts"
echo "------------------------------------------"

# Function to make a curl request with verbose output
function test_login() {
  local file=$1
  local endpoint=$2
  local description=$3
  
  echo -e "\n\n===== TEST: $description ====="
  echo "Using file: $file"
  echo "Endpoint: $endpoint"
  echo "Content:"
  cat $file
  echo -e "\nSending request...\n"
  
  # Make the curl request with verbose output
  curl -v -X POST "$endpoint" \
       -H "Content-Type: application/json" \
       -d @$file
  
  echo -e "\n------------------------------------------"
}

# Test different endpoints and data formats
echo -e "\nTesting standard login endpoint with username field"
test_login "$TEMP_DIR/login1.json" "https://probeops.com/api/login" "Standard login with username field"

echo -e "\nTesting standard login endpoint with email field"
test_login "$TEMP_DIR/login2.json" "https://probeops.com/api/login" "Standard login with email field"

echo -e "\nTesting standard login endpoint with username=admin"
test_login "$TEMP_DIR/login3.json" "https://probeops.com/api/login" "Standard login with username=admin"

echo -e "\nTesting auth login endpoint with username field"
test_login "$TEMP_DIR/login1.json" "https://probeops.com/api/auth/login" "Auth login with username field"

echo -e "\nTesting direct auth login endpoint with email field"
test_login "$TEMP_DIR/login2.json" "https://probeops.com/api/auth/login" "Auth login with email field"

# Cleanup
echo -e "\nCleaning up temporary files"
rm -rf $TEMP_DIR

echo -e "\nDebug tests complete."