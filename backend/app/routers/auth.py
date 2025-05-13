from datetime import timedelta
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import get_db
from app.config import settings
from app.models import UserSubscription

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
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserDetailResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    # Get user with subscription details
    user_with_subscription = db.query(models.User).filter(models.User.id == current_user.id).first()
    return user_with_subscription


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
