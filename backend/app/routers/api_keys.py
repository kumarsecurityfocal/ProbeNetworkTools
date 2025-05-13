from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import get_db

router = APIRouter()


@router.post("/keys", response_model=schemas.ApiKeyResponse)
async def create_api_key(
    key_data: schemas.ApiKeyCreate,
    expires_days: Optional[int] = Query(None, description="Number of days until the key expires"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
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
    
    return db_api_key


@router.get("/keys", response_model=List[schemas.ApiKeyResponse])
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
