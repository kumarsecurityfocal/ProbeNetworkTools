#!/bin/bash

# This script tests various combinations of fields for the ProbeOps API login

echo "ProbeOps API Field Testing Script"
echo "=================================="

# Create test directory
mkdir -p test_data

# Create various test files with different field combinations
echo '{"username":"admin@probeops.com","password":"probeopS1@"}' > test_data/test1.json
echo '{"email":"admin@probeops.com","password":"probeopS1@"}' > test_data/test2.json
echo '{"user":"admin@probeops.com","password":"probeopS1@"}' > test_data/test3.json
echo '{"username":"admin","password":"probeopS1@"}' > test_data/test4.json
echo '{"username":"admin@probeops.com","pass":"probeopS1@"}' > test_data/test5.json

# Function to test with different data
test_login() {
    local test_file=$1
    local test_name=$2
    
    echo -e "\n\nTest $test_name:"
    echo "File contents:"
    cat "$test_file"
    echo -e "\nSending request..."
    curl -s -X POST https://probeops.com/api/login \
         -H "Content-Type: application/json" \
         -d @"$test_file" | jq .
    echo -e "-----------------------------------"
}

# Run all tests
test_login "test_data/test1.json" "1 - Standard format (username)"
test_login "test_data/test2.json" "2 - Using email field instead of username" 
test_login "test_data/test3.json" "3 - Using user field instead of username"
test_login "test_data/test4.json" "4 - Using 'admin' as username"
test_login "test_data/test5.json" "5 - Using pass instead of password"

# Clean up
echo -e "\nCleaning up test files..."
rm -rf test_data

echo "Testing complete!"