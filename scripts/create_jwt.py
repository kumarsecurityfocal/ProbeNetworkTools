#!/usr/bin/env python3
"""
ProbeOps JWT Token Creation/Decoding Utility

This script provides easy utilities to create and decode JWT tokens for 
debugging and testing authentication in ProbeOps.

Usage:
    python create_jwt.py create
    python create_jwt.py decode <token>
"""

import jwt
import json
import sys
import os
import re
from datetime import datetime, timedelta

# Try to load JWT_SECRET from .env file or environment
def load_jwt_secret():
    default_secret = "super-secret-key-change-in-production"
    
    # First check environment variable
    if os.environ.get("JWT_SECRET"):
        return os.environ.get("JWT_SECRET")
    
    # Then check backend/.env.backend
    if os.path.exists("backend/.env.backend"):
        with open("backend/.env.backend", 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    # Parse environment variable
                    match = re.match(r'^JWT_SECRET=(.*)$', line)
                    if match:
                        secret = match.group(1)
                        if secret and secret != "CHANGE_ME":
                            return secret
    
    # Fallback to default (warning: insecure for production)
    print(f"[WARNING] Using default JWT secret - not secure for production")
    return default_secret

# Create a token for the admin user
def create_token(user_email="admin@probeops.com", secret_key=None):
    if not secret_key:
        secret_key = load_jwt_secret()
        
    payload = {
        "sub": user_email,
        "exp": datetime.utcnow() + timedelta(days=1)
    }
    token = jwt.encode(payload, secret_key, algorithm="HS256")
    return token

# Decode a token without verification
def decode_token(token, verify=False):
    secret_key = load_jwt_secret()
    
    if verify:
        try:
            payload = jwt.decode(token, secret_key, algorithms=["HS256"])
            return payload
        except Exception as e:
            return {"error": str(e)}
    else:
        # Just decode without verification
        parts = token.split(".")
        if len(parts) != 3:
            return {"error": "Invalid token format"}
        
        # Decode the payload (middle part)
        import base64
        padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
        try:
            decoded = base64.b64decode(padded).decode('utf-8')
            return json.loads(decoded)
        except Exception as e:
            return {"error": f"Could not decode payload: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "create":
            # Optional email argument
            user_email = "admin@probeops.com"
            if len(sys.argv) > 2:
                user_email = sys.argv[2]
                
            token = create_token(user_email)
            print(f"Token created for: {user_email}")
            print(f"Token: {token}")
            print("\nTo use this token with curl:")
            print(f'curl -H "Authorization: Bearer {token}" http://localhost:8000/users')
        elif command == "decode":
            if len(sys.argv) > 2:
                token = sys.argv[2]
                print("Decoding token (without verification)...")
                payload = decode_token(token)
                print(json.dumps(payload, indent=2))
                
                # Also try to verify
                print("\nVerifying token signature...")
                verified = decode_token(token, verify=True)
                if "error" in verified:
                    print(f"Verification failed: {verified['error']}")
                else:
                    print("✅ Token signature verified successfully!")
                    print(json.dumps(verified, indent=2))
            else:
                print("Error: No token provided")
                print("Usage: python create_jwt.py decode <token>")
    else:
        print("ProbeOps JWT Token Utility")
        print("==========================")
        print("Usage:")
        print("  python create_jwt.py create [email]")
        print("  python create_jwt.py decode <token>")