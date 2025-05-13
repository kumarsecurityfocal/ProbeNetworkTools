from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, validator


# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime

    class Config:
        orm_mode = True


# API Key schemas
class ApiKeyBase(BaseModel):
    name: str


class ApiKeyCreate(ApiKeyBase):
    pass


class ApiKeyResponse(ApiKeyBase):
    id: int
    key: str
    user_id: int
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        orm_mode = True


# Diagnostic schemas
class DiagnosticCreate(BaseModel):
    tool: str
    target: str


class DiagnosticResponse(DiagnosticCreate):
    id: int
    result: str
    status: str
    user_id: int
    created_at: datetime
    execution_time: int

    class Config:
        orm_mode = True


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
