#!/usr/bin/env python3
"""
JWT Authentication Fix Script for ProbeOps AWS Migration

This script helps resolve JWT user ID mismatches after migrating from Replit to AWS.
It provides utilities to:
1. Hash passwords correctly
2. Verify user existence in the database
3. Reset/update user credentials if needed
4. Clear stale JWT tokens

Usage:
    python fix_jwt_auth.py --check      # Check if admin user exists with correct ID
    python fix_jwt_auth.py --reset      # Reset admin user password and create if needed
    python fix_jwt_auth.py --verify     # Verify JWT token generation and validation
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import jwt
import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
from passlib.context import CryptContext

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Configuration
DB_URL = os.environ.get("DATABASE_URL")
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = "admin@probeops.com"
ADMIN_PASSWORD = "probeopS1@"  # Default admin password

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db_connection():
    """Create a database connection."""
    if not DB_URL:
        raise ValueError("DATABASE_URL environment variable not set")
    
    try:
        connection = psycopg2.connect(DB_URL)
        logger.info("📊 Database connection established successfully")
        return connection
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        sys.exit(1)

def hash_password(password: str) -> str:
    """Generate a secure hash for the given password."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=1)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def check_admin_user():
    """Check if the admin user exists in the database and verify its ID."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Check if admin user exists
        cursor.execute("SELECT id, email, password FROM users WHERE email = %s", (ADMIN_EMAIL,))
        user = cursor.fetchone()
        
        if not user:
            logger.warning(f"⚠️ Admin user '{ADMIN_EMAIL}' does not exist in the database")
            return False
        
        # Print user details
        logger.info(f"✅ Admin user found:")
        logger.info(f"   - ID: {user['id']}")
        logger.info(f"   - Email: {user['email']}")
        
        # Generate a test token
        token = create_access_token({"sub": str(user["id"])})
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        logger.info(f"🔑 Test JWT token generated:")
        logger.info(f"   - Token: {token[:20]}... (truncated)")
        logger.info(f"   - Decoded payload: {decoded}")
        
        # Check for foreign key integrity
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'usage_logs_user_id_fkey'
            ) AS has_fk;
        """)
        has_fk = cursor.fetchone()["has_fk"]
        
        if has_fk:
            logger.info("✅ Foreign key constraint 'usage_logs_user_id_fkey' exists")
            
            # Check if any usage logs exist for this user
            cursor.execute("SELECT COUNT(*) AS count FROM usage_logs WHERE user_id = %s", (user['id'],))
            log_count = cursor.fetchone()["count"]
            logger.info(f"📊 Usage logs for this user: {log_count}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error checking admin user: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def reset_admin_user():
    """Reset the admin user - create if doesn't exist or update password if it does."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Begin transaction
        conn.autocommit = False
        
        # Check if admin user exists
        cursor.execute("SELECT id, email FROM users WHERE email = %s", (ADMIN_EMAIL,))
        user = cursor.fetchone()
        
        # Hash the password
        hashed_password = hash_password(ADMIN_PASSWORD)
        
        if user:
            # Update existing user
            logger.info(f"🔄 Updating existing admin user (ID: {user['id']})")
            cursor.execute(
                "UPDATE users SET password = %s, updated_at = NOW() WHERE id = %s RETURNING id",
                (hashed_password, user['id'])
            )
            updated_id = cursor.fetchone()["id"]
            logger.info(f"✅ Admin user updated successfully (ID: {updated_id})")
            
            # Generate JWT token for this user
            token = create_access_token({"sub": str(updated_id)})
            logger.info(f"🔑 JWT token: {token}")
        else:
            # Create new admin user
            logger.info(f"➕ Creating new admin user")
            
            # Check if we need to insert is_admin and is_active columns
            cursor.execute("""
                SELECT 
                    EXISTS (SELECT 1 FROM information_schema.columns 
                           WHERE table_name = 'users' AND column_name = 'is_admin') as has_is_admin,
                    EXISTS (SELECT 1 FROM information_schema.columns 
                           WHERE table_name = 'users' AND column_name = 'is_active') as has_is_active
            """)
            columns = cursor.fetchone()
            
            if columns["has_is_admin"] and columns["has_is_active"]:
                cursor.execute(
                    """
                    INSERT INTO users (email, password, is_admin, is_active) 
                    VALUES (%s, %s, TRUE, TRUE) RETURNING id
                    """,
                    (ADMIN_EMAIL, hashed_password)
                )
            else:
                # Simpler schema without those columns
                cursor.execute(
                    """
                    INSERT INTO users (email, password) 
                    VALUES (%s, %s) RETURNING id
                    """,
                    (ADMIN_EMAIL, hashed_password)
                )
                
            new_id = cursor.fetchone()["id"]
            logger.info(f"✅ Admin user created successfully (ID: {new_id})")
            
            # Generate JWT token for this user
            token = create_access_token({"sub": str(new_id)})
            logger.info(f"🔑 JWT token: {token}")
            
            # Add default subscription for this user if needed
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'subscriptions'
                ) AS has_subscriptions;
            """)
            
            if cursor.fetchone()["has_subscriptions"]:
                try:
                    cursor.execute(
                        """
                        INSERT INTO subscriptions (user_id, tier_id, start_date, active)
                        VALUES (%s, 1, NOW(), TRUE)
                        """,
                        (new_id,)
                    )
                    logger.info(f"✅ Default subscription created for admin user")
                except Exception as e:
                    logger.warning(f"⚠️ Could not create subscription: {e}")
        
        # Commit the transaction
        conn.commit()
        logger.info("✅ Database transaction committed successfully")
        
        # Display login instructions
        logger.info("\n==================================================")
        logger.info("🔐 Admin user is ready for login:")
        logger.info(f"   - Email: {ADMIN_EMAIL}")
        logger.info(f"   - Password: {ADMIN_PASSWORD}")
        logger.info("==================================================")
        logger.info("📱 Frontend Cleanup Instructions:")
        logger.info("1. Clear browser localStorage/sessionStorage (DevTools → Application → Storage)")
        logger.info("2. Delete cookies for your domain")
        logger.info("3. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)")
        logger.info("==================================================")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error resetting admin user: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def verify_token_generation():
    """Test token generation and validation to ensure the system is working correctly."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get admin user
        cursor.execute("SELECT id, email FROM users WHERE email = %s", (ADMIN_EMAIL,))
        user = cursor.fetchone()
        
        if not user:
            logger.error(f"❌ Admin user {ADMIN_EMAIL} not found. Run --reset first")
            return False
            
        # Generate token
        user_id = str(user["id"])
        token = create_access_token({"sub": user_id})
        
        # Verify token
        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if decoded["sub"] == user_id:
                logger.info(f"✅ Token validation successful!")
                logger.info(f"   - User ID in database: {user_id}")
                logger.info(f"   - User ID in token: {decoded['sub']}")
                logger.info(f"   - Token expiry: {datetime.fromtimestamp(decoded['exp'])}")
                logger.info(f"   - Example curl command to test API:")
                logger.info(f'     curl -H "Authorization: Bearer {token}" https://probeops.com/api/user')
                return True
            else:
                logger.error(f"❌ Token validation failed - User ID mismatch")
                logger.error(f"   - User ID in database: {user_id}")
                logger.error(f"   - User ID in token: {decoded['sub']}")
                return False
        except Exception as e:
            logger.error(f"❌ Token validation failed: {e}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error verifying token generation: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def main():
    """Main function to run the script based on arguments."""
    parser = argparse.ArgumentParser(description="JWT Authentication Fix for ProbeOps AWS Migration")
    parser.add_argument("--check", action="store_true", help="Check if admin user exists with correct ID")
    parser.add_argument("--reset", action="store_true", help="Reset admin user password and create if needed")
    parser.add_argument("--verify", action="store_true", help="Verify JWT token generation and validation")
    args = parser.parse_args()
    
    if not (args.check or args.reset or args.verify):
        parser.print_help()
        sys.exit(1)
    
    if args.check:
        check_admin_user()
    
    if args.reset:
        reset_admin_user()
    
    if args.verify:
        verify_token_generation()

if __name__ == "__main__":
    main()