"""
Authentication Bypass Module for Development

This module implements a simplified authentication system that automatically
authenticates all requests as the admin user for development purposes.

IMPORTANT: Never use this in production!
"""

import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse

# Simplified token setup for development
SECRET_KEY = "dev_secret_key_not_for_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class AuthBypassHandler:
    """Authentication bypass handler that returns admin user for all requests"""
    
    @staticmethod
    async def get_admin_user(db: Session) -> Optional[User]:
        """Get the admin user from the database"""
        admin_user = db.query(User).filter(User.is_admin == True).first()
        if not admin_user:
            # Create admin user if it doesn't exist (for development only)
            admin_user = User(
                email="admin@probeops.com",
                username="admin",
                password="hashed_password_value_not_used_in_bypass",
                is_admin=True,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        return admin_user
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create a fake access token for development"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    async def get_current_user(
        token: str = Depends(oauth2_scheme), 
        db: Session = Depends(get_db)
    ) -> User:
        """Always return the admin user, ignoring the token"""
        print("[AUTH BYPASS] Automatically authenticating as admin")
        admin_user = await AuthBypassHandler.get_admin_user(db)
        if not admin_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Admin user not found or could not be created"
            )
        return admin_user

    @staticmethod
    async def get_current_active_user(
        current_user: User = Depends(get_current_user)
    ) -> User:
        """Check if the user is active"""
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive user"
            )
        return current_user
    
    @staticmethod
    async def get_current_admin_user(
        current_user: User = Depends(get_current_user)
    ) -> User:
        """Check if the user is an admin"""
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user

# Export the dependencies for routes
get_current_user = AuthBypassHandler.get_current_user
get_current_active_user = AuthBypassHandler.get_current_active_user
get_current_admin_user = AuthBypassHandler.get_current_admin_user
create_access_token = AuthBypassHandler.create_access_token

# Debug function to check if auth bypass is enabled
def is_auth_bypass_enabled() -> bool:
    """Check if auth bypass is enabled based on environment variable"""
    return os.getenv("AUTH_BYPASS", "false").lower() == "true"

# Debug logging for when module is imported
if is_auth_bypass_enabled():
    print("⚠️ AUTH BYPASS MODE ENABLED - All requests will be authenticated as admin ⚠️")
    print("⚠️ DO NOT USE THIS IN PRODUCTION ⚠️")
else:
    print("Auth bypass module imported but not enabled")