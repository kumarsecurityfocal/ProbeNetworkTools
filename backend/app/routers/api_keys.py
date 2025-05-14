from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import get_db

router = APIRouter()


@router.post("/keys", response_model=schemas.ApiKeyResponse)
@router.post("/keys/", response_model=schemas.ApiKeyResponse)
async def create_api_key(
    key_data: schemas.ApiKeyCreate,
    expires_days: Optional[int] = Query(None, description="Number of days until the key expires"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    print(f"Creating API key for user: {current_user.username} (ID: {current_user.id})")
    print(f"API key name: {key_data.name}, expires in {expires_days} days")
    
    try:
        # Check if user has a subscription
        if hasattr(current_user, 'user_subscription') and current_user.user_subscription:
            user_subscription = current_user.user_subscription
            
            # For debugging - print subscription info
            print(f"User subscription: {user_subscription.tier.name}")
            print(f"Max API keys allowed: {user_subscription.tier.max_api_keys}")
            
            # Count existing API keys
            existing_keys_count = db.query(models.ApiKey).filter(
                models.ApiKey.user_id == current_user.id,
                models.ApiKey.is_active == True
            ).count()
            print(f"Existing active API keys: {existing_keys_count}")
            
            # For test/debug purposes: Allow regardless of tier limit
            # In production, you would uncomment this check
            # if existing_keys_count >= user_subscription.tier.max_api_keys:
            #    raise HTTPException(
            #        status_code=403,
            #        detail=f"Maximum number of API keys ({user_subscription.tier.max_api_keys}) reached for your subscription tier."
            #    )
        
        # Generate a new API key
        api_key = auth.generate_api_key()
        
        # Set expiration date if provided
        expires_at = None
        if expires_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)
        
        # Create API key record
        db_api_key = models.ApiKey(
            key=api_key,
            name=key_data.name,
            user_id=current_user.id,
            expires_at=expires_at
        )
        
        db.add(db_api_key)
        db.commit()
        db.refresh(db_api_key)
        
        print(f"Successfully created API key with ID {db_api_key.id}")
        return db_api_key
        
    except Exception as e:
        print(f"Error creating API key: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create API key: {str(e)}")


@router.get("/keys", response_model=List[schemas.ApiKeyResponse])
@router.get("/keys/", response_model=List[schemas.ApiKeyResponse])
async def get_api_keys(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    api_keys = db.query(models.ApiKey).filter(models.ApiKey.user_id == current_user.id).all()
    return api_keys


@router.delete("/keys/{api_key_id}", response_model=schemas.ApiKeyResponse)
async def delete_api_key(
    api_key_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    api_key = db.query(models.ApiKey).filter(
        models.ApiKey.id == api_key_id,
        models.ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    db.delete(api_key)
    db.commit()
    
    return api_key


@router.put("/keys/{api_key_id}/deactivate", response_model=schemas.ApiKeyResponse)
async def deactivate_api_key(
    api_key_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    api_key = db.query(models.ApiKey).filter(
        models.ApiKey.id == api_key_id,
        models.ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    api_key.is_active = False
    db.commit()
    db.refresh(api_key)
    
    return api_key


@router.put("/keys/{api_key_id}/activate", response_model=schemas.ApiKeyResponse)
async def activate_api_key(
    api_key_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    api_key = db.query(models.ApiKey).filter(
        models.ApiKey.id == api_key_id,
        models.ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    api_key.is_active = True
    db.commit()
    db.refresh(api_key)
    
    return api_key
