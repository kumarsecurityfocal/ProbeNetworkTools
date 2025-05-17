#!/bin/bash
# A simplified test script to diagnose the login issue

echo "Creating test JSON file..."
cat > login.json << EOL
{"username":"admin@probeops.com","password":"probeopS1@"}
EOL

echo "Content of login.json:"
cat login.json

echo -e "\nTesting login with file approach:"
curl -v -X POST https://probeops.com/api/login \
     -H "Content-Type: application/json" \
     -d @login.json

echo -e "\n\nTesting login with direct JSON approach:"
curl -v -X POST https://probeops.com/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin@probeops.com","password":"probeopS1@"}'

echo -e "\n\nTesting if the server is expecting form data instead of JSON:"
curl -v -X POST https://probeops.com/api/login \
     -F "username=admin@probeops.com" \
     -F "password=probeopS1@"

echo -e "\n\nDone testing."