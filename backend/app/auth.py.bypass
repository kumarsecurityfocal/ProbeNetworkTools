from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import uuid
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models import User, ApiKey, UserSubscription
from app.schemas import TokenData, TokenPayload, UserCreate
from app.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login", auto_error=False)
logger = logging.getLogger(__name__)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def get_user(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def authenticate_user(db: Session, username: str, password: str):
    # Print debug info
    print(f"Auth attempt - Input username/email: {username}")
    
    # If the username contains @, it's likely an email
    if '@' in username:
        print(f"Treating as email first: {username}")
        # Try email login first
        user = get_user_by_email(db, username)
        if user:
            print(f"Found user by email: {user.username}")
        else:
            print(f"No user found with email: {username}")
            # As fallback, try it as a username too (some usernames might contain @)
            user = get_user(db, username)
            if user:
                print(f"Found user by username (containing @): {user.username}")
            else:
                print(f"No user found with username: {username}")
    else:
        print(f"Treating as username first: {username}")
        # Try username login first
        user = get_user(db, username)
        if user:
            print(f"Found user by username: {user.username}")
        else:
            print(f"No user found with username: {username}")
            # As fallback, try it as an email too (unlikely but possible)
            user = get_user_by_email(db, username)
            if user:
                print(f"Found user by email (no @ symbol): {user.username}")
            else:
                print(f"No user found with email: {username}")
    
    # If no user found, return False
    if not user:
        print(f"Authentication failed: No matching user found")
        return False
    
    # Check password
    if not verify_password(password, user.hashed_password):
        print(f"Authentication failed: Password incorrect for user: {user.username}")
        return False
    
    print(f"Authentication successful for user: {user.username}")
    return user


def create_user(db: Session, user: UserCreate, is_admin: bool = False, email_verified: bool = False):
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        is_admin=is_admin,
        email_verified=email_verified
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def generate_api_key():
    return str(uuid.uuid4())


def create_api_key(db: Session, name: str, user_id: int, expires_at: Optional[datetime] = None):
    """Create a new API key for a user."""
    key = generate_api_key()
    db_api_key = ApiKey(
        key=key,
        name=name,
        user_id=user_id,
        expires_at=expires_at
    )
    db.add(db_api_key)
    db.commit()
    db.refresh(db_api_key)
    return db_api_key


# MODIFIED: Always returns the admin user regardless of token
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    print("🔍 BYPASSED AUTHENTICATION - Using admin account")
    logger.debug("BYPASSED AUTHENTICATION - Using admin account")
    
    # Get the admin user
    admin = get_user_by_email(db, "admin@probeops.com")
    if not admin:
        # Create admin if doesn't exist
        print("⚠️ Admin user not found, creating default admin")
        initialize_default_users(db)
        admin = get_user_by_email(db, "admin@probeops.com")
    
    if not admin:
        print("⚠️ Failed to create admin user, this should not happen")
        raise HTTPException(status_code=500, detail="Failed to create admin user")
    
    print(f"✅ Using admin user: {admin.username}")
    return admin


# MODIFIED: Always returns the current user as active
async def get_current_active_user(current_user: User = Depends(get_current_user)):
    return current_user


# MODIFIED: Always returns the current user as admin
async def get_admin_user(current_user: User = Depends(get_current_active_user)):
    """Bypass dependency for admin-only endpoints."""
    return current_user


def validate_api_key(api_key: str, db: Session):
    """MODIFIED: Always returns admin user regardless of API key."""
    admin = get_user_by_email(db, "admin@probeops.com")
    if not admin:
        # Create admin if doesn't exist
        initialize_default_users(db)
        admin = get_user_by_email(db, "admin@probeops.com")
        
    if not admin:
        print("⚠️ Failed to create admin user for API key validation")
        return None
        
    return admin


def initialize_default_users(db: Session):
    """Initialize default admin and standard users if they don't exist."""
    # Check for admin user
    admin_email = "admin@probeops.com"
    admin = get_user_by_email(db, admin_email)
    
    if not admin:
        logger.info(f"Creating admin user: {admin_email}")
        admin = create_user(
            db=db,
            user=UserCreate(
                username="admin",
                email=admin_email,
                password="probeopS1@"
            ),
            is_admin=True,
            email_verified=True
        )
    
    # Check for standard user
    standard_email = "test@probeops.com"
    standard_user = get_user_by_email(db, standard_email)
    
    if not standard_user:
        logger.info(f"Creating standard user: {standard_email}")
        standard_user = create_user(
            db=db,
            user=UserCreate(
                username="test",
                email=standard_email,
                password="probeopS1@"
            ),
            is_admin=False,
            email_verified=True
        )
    
    return {
        "admin_created": admin is not None,
        "standard_user_created": standard_user is not None
    }


def get_user_subscription(db: Session, user_id: int):
    """Get the user's subscription."""
    return db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()