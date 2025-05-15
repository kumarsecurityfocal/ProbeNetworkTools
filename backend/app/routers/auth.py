from datetime import timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from pydantic import ValidationError

from app import models, schemas, auth
from app.database import get_db
from app.config import settings
from app.models import UserSubscription
from app.middleware.rate_limit import rate_limit_dependency

router = APIRouter()


@router.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    
    # Create new user using auth helper function
    db_user = auth.create_user(db, user, is_admin=False, email_verified=False)
    
    # Assign free tier subscription to the new user
    free_tier = db.query(models.SubscriptionTier).filter(models.SubscriptionTier.name == "FREE").first()
    if free_tier:
        user_subscription = UserSubscription(
            user_id=db_user.id,
            tier_id=free_tier.id
        )
        db.add(user_subscription)
        db.commit()
    
    return db_user


@router.post("/login", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    user_id: int = Depends(rate_limit_dependency)
):
    # Print debug information about login attempt
    print(f"Login attempt for username: {form_data.username}")

    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        print(f"Authentication failed for username: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Print successful login message
    print(f"Authentication successful for user: {user.username} (email: {user.email})")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login/json", response_model=schemas.Token)
async def login_json(
    user_login: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    # Print debug information about login attempt
    print(f"JSON login attempt for username: {user_login.username}")

    user = auth.authenticate_user(db, user_login.username, user_login.password)
    if not user:
        print(f"Authentication failed for username: {user_login.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Print successful login message
    print(f"Authentication successful for user: {user.username} (email: {user.email})")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserDetailResponse)
def read_me(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    # Get user with subscription details, eagerly loading the user_subscription and tier relationships
    user_with_subscription = db.query(models.User).options(
        joinedload(models.User.user_subscription).joinedload(models.UserSubscription.tier)
    ).filter(models.User.id == current_user.id).first()
    
    # Debug logs to understand the object structure
    print("👤 User to be returned:", user_with_subscription.__dict__)
    if hasattr(user_with_subscription, "user_subscription") and user_with_subscription.user_subscription:
        print("📊 User subscription:", user_with_subscription.user_subscription.__dict__)
        if hasattr(user_with_subscription.user_subscription, "tier") and user_with_subscription.user_subscription.tier:
            print("🏆 Subscription tier:", user_with_subscription.user_subscription.tier.__dict__)
    
    try:
        response = schemas.UserDetailResponse.model_validate(user_with_subscription)
        print("✅ Final Pydantic object:", response)
        return response
    except ValidationError as e:
        print("❌ ValidationError in /me route:\n", e.json())
        raise HTTPException(status_code=500, detail="Response model validation failed")
    except Exception as e:
        print(f"❌ Unexpected error in /me route: {str(e)}")
        # If validation fails, try with dictionary conversion
        try:
            user_dict = {
                "id": user_with_subscription.id,
                "username": user_with_subscription.username, 
                "email": user_with_subscription.email,
                "is_active": user_with_subscription.is_active,
                "is_admin": user_with_subscription.is_admin,
                "email_verified": user_with_subscription.email_verified,
                "created_at": user_with_subscription.created_at,
                "user_subscription": user_with_subscription.user_subscription
            }
            return schemas.UserDetailResponse.model_validate(user_dict)
        except ValidationError as e:
            print("❌ ValidationError with dict conversion:\n", e.json())
            raise HTTPException(status_code=500, detail="Response model validation failed even with dict conversion")


@router.get("/users", response_model=List[schemas.UserResponse])
def list_users(
    current_user: models.User = Depends(auth.get_admin_user), 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all users."""
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users


@router.post("/users", response_model=schemas.UserResponse)
def create_new_user(
    user_data: schemas.UserCreate,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to create a new user."""
    # Check if user already exists
    db_user = db.query(models.User).filter(
        (models.User.username == user_data.username) | (models.User.email == user_data.email)
    ).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    
    # Create new user - admin created users are verified by default
    is_admin = user_data.dict().pop("is_admin", False) if hasattr(user_data, "is_admin") else False
    email_verified = user_data.dict().pop("email_verified", True) if hasattr(user_data, "email_verified") else True
    
    db_user = auth.create_user(db, user_data, is_admin=is_admin, email_verified=email_verified)
    
    # Assign free tier subscription by default
    free_tier = db.query(models.SubscriptionTier).filter(models.SubscriptionTier.name == "FREE").first()
    if free_tier:
        user_subscription = UserSubscription(
            user_id=db_user.id,
            tier_id=free_tier.id
        )
        db.add(user_subscription)
        db.commit()
    
    return db_user


@router.get("/users/me", response_model=schemas.UserDetailResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    """Get details of the current authenticated user."""
    # Get user with subscription details, eagerly loading the user_subscription and tier relationships
    user_with_subscription = db.query(models.User).options(
        joinedload(models.User.user_subscription).joinedload(models.UserSubscription.tier)
    ).filter(models.User.id == current_user.id).first()
    
    # Debug logs to understand the object structure
    print("👤 User in /users/me route to be returned:", user_with_subscription.__dict__)
    if hasattr(user_with_subscription, "user_subscription") and user_with_subscription.user_subscription:
        print("📊 User subscription:", user_with_subscription.user_subscription.__dict__)
        if hasattr(user_with_subscription.user_subscription, "tier") and user_with_subscription.user_subscription.tier:
            print("🏆 Subscription tier:", user_with_subscription.user_subscription.tier.__dict__)
    
    try:
        response = schemas.UserDetailResponse.model_validate(user_with_subscription)
        print("✅ Final Pydantic object:", response)
        return response
    except ValidationError as e:
        print("❌ ValidationError in /users/me route:\n", e.json())
        raise HTTPException(status_code=500, detail="Response model validation failed")
    except Exception as e:
        print(f"❌ Unexpected error in /users/me route: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing user data: {str(e)}")


@router.get("/users/{user_id}", response_model=schemas.UserDetailResponse)
def get_user_details(
    user_id: int,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to get user details."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user_details(
    user_id: int,
    user_data: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to update user details."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if updating email or username to one that already exists
    if hasattr(user_data, "email") and user_data.email:
        existing_user = db.query(models.User).filter(
            models.User.email == user_data.email,
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    if hasattr(user_data, "username") and user_data.username:
        existing_user = db.query(models.User).filter(
            models.User.username == user_data.username,
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already in use")
    
    # Update user fields
    for key, value in user_data.dict(exclude_unset=True).items():
        if value is not None:  # Only update fields that are explicitly provided
            setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", response_model=Dict[str, Any])
def delete_user(
    user_id: int,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to delete a user."""
    # Ensure admin cannot delete themselves
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"success": True, "message": "User deleted successfully"}


@router.post("/users/{user_id}/reset-password", response_model=Dict[str, Any])
def admin_reset_password(
    user_id: int,
    password_data: schemas.PasswordReset,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to reset a user's password."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.hashed_password = auth.get_password_hash(password_data.password)
    db.commit()
    
    return {"success": True, "message": "Password reset successfully"}


@router.post("/users/{user_id}/verify-email", response_model=Dict[str, Any])
def admin_verify_email(
    user_id: int,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to verify a user's email."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.email_verified = True
    db.commit()
    
    return {"success": True, "message": "Email verified successfully"}


@router.post("/users/{user_id}/status", response_model=Dict[str, Any])
def change_user_status(
    user_id: int,
    status_data: schemas.UserStatusUpdate,
    current_user: models.User = Depends(auth.get_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to activate or deactivate a user."""
    # Ensure admin cannot deactivate themselves
    if user_id == current_user.id and not status_data.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = status_data.is_active
    db.commit()
    
    status_message = "activated" if status_data.is_active else "deactivated"
    return {"success": True, "message": f"User {status_message} successfully"}


@router.get("/subscription", response_model=schemas.UserSubscriptionResponse)
def get_subscription(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    """Get the current user's subscription details."""
    subscription = db.query(UserSubscription).filter(UserSubscription.user_id == current_user.id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return subscription


@router.get("/subscription/tiers", response_model=List[schemas.SubscriptionTierResponse])
def get_subscription_tiers(db: Session = Depends(get_db)):
    """Get all available subscription tiers."""
    tiers = db.query(models.SubscriptionTier).all()
    return tiers
