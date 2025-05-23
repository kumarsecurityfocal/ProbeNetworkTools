# ProbeOps API Testing Commands

This document contains verified curl commands for testing the ProbeOps API on both Linux and Windows systems.

## Important Note

These commands have been tested and confirmed to work correctly with the ProbeOps API.

## Authentication Commands

### Login and Get JWT Token

```bash
# Linux/macOS/Git Bash for Windows
curl -X POST https://probeops.com/api/login \
     -d "username=admin@probeops.com" \
     -d "password=probeopS1@"

# Windows Command Prompt
curl -X POST https://probeops.com/api/login -d "username=admin@probeops.com" -d "password=probeopS1@"
```

**Note:** The API uses form data (`application/x-www-form-urlencoded`), not JSON!

### Get User Profile (Authenticated)

```bash
# Replace YOUR_TOKEN with the access_token from the login response
curl -X GET https://probeops.com/api/users/me \
     -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Subscription Status (Authenticated)

```bash
# Replace YOUR_TOKEN with the access_token from the login response
curl -X GET https://probeops.com/api/subscription \
     -H "Authorization: Bearer YOUR_TOKEN"
```

## Testing Local Development API

The same commands work for local development by replacing the base URL:

```bash
# Local development login
curl -X POST http://localhost:8000/login \
     -d "username=admin@probeops.com" \
     -d "password=probeopS1@"
```

## Troubleshooting

If you're experiencing issues with the API:

1. Verify the API endpoint is correct
2. Ensure you're using form data (-d) and not JSON for login
3. Check that your curl version supports the commands (curl --version)
4. For Windows users, if direct curl fails, try using the test_api.bat script provided

## Complete Testing Workflow

1. Login to get token
2. Use token to authenticate subsequent requests
3. Test user profile and subscription endpoints
4. Run diagnostic tests as needed

The scripts in `scripts/probeops-api-test/` provide automated testing of these endpoints.