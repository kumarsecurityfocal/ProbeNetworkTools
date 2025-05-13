"""
Test script for the ProbeOps API.
This script is used to test the API endpoints and verify the functionality of the application.
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5000/api"
TOKEN = None

def print_result(title, response):
    """Print the result of an API call with formatting."""
    print(f"\n{'-' * 80}")
    print(f"{title} - Status Code: {response.status_code}")
    print(f"{'-' * 80}")
    
    try:
        if response.content:
            result = response.json()
            print(json.dumps(result, indent=2))
        else:
            print("No content in response")
    except Exception as e:
        print(f"Error parsing JSON: {str(e)}")
        print(response.text)

def login(username, password):
    """Log in to the API and get an authentication token."""
    global TOKEN
    
    print(f"Attempting to log in as {username}...")
    
    data = {"username": username, "password": password}
    response = requests.post(f"{BASE_URL}/login", data=data)
    
    if response.status_code == 200:
        result = response.json()
        TOKEN = result.get("access_token")
        print(f"✅ Login successful. Token received.")
        return True
    else:
        print(f"❌ Login failed with status code {response.status_code}")
        print_result("Login Error", response)
        return False

def get_headers():
    """Get the headers for authenticated requests."""
    return {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}

def test_endpoints():
    """Test various API endpoints."""
    # Get current user profile
    response = requests.get(f"{BASE_URL}/users/me", headers=get_headers())
    print_result("Current User Profile", response)
    
    # Get subscription tiers
    response = requests.get(f"{BASE_URL}/subscription/tiers", headers=get_headers())
    print_result("Subscription Tiers", response)
    
    # Get user subscription
    response = requests.get(f"{BASE_URL}/subscription", headers=get_headers())
    print_result("User Subscription", response)
    
    # If admin, test admin endpoints
    user_info = requests.get(f"{BASE_URL}/users/me", headers=get_headers()).json()
    if user_info.get("is_admin"):
        print("\n🔑 Testing Admin Endpoints...")
        
        # List all users
        response = requests.get(f"{BASE_URL}/users", headers=get_headers())
        print_result("All Users (Admin)", response)
        
        # List all subscriptions
        response = requests.get(f"{BASE_URL}/subscriptions", headers=get_headers())
        print_result("All Subscriptions (Admin)", response)

def usage():
    """Print usage information."""
    print(f"""
Usage: {sys.argv[0]} [username] [password]

If username and password are not provided, the script will use default credentials:
- Admin: admin@probeops.com / probeopS1@
- Regular user: test@probeops.com / probeopS1@
""")

def main():
    """Main function."""
    if len(sys.argv) > 1 and sys.argv[1] in ["-h", "--help"]:
        usage()
        return
    
    # Use command line arguments if provided, otherwise use defaults
    if len(sys.argv) >= 3:
        username = sys.argv[1]
        password = sys.argv[2]
    else:
        print("Using default admin credentials.")
        username = "admin@probeops.com"
        password = "probeopS1@"
    
    if login(username, password):
        test_endpoints()
        print("\n✅ API tests completed.")
    else:
        print("\n❌ API tests failed: Could not authenticate.")

if __name__ == "__main__":
    main()