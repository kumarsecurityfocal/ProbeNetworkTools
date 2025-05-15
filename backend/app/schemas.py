from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str
    is_admin: Optional[bool] = False
    is_active: Optional[bool] = True
    email_verified: Optional[bool] = False


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    email_verified: bool
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class UserDetailResponse(UserResponse):
    user_subscription: Optional["UserSubscriptionResponse"] = None
    
    # No need to redefine Config as it's inherited from UserResponse


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
    
    model_config = {
        "from_attributes": True
    }


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
    
    model_config = {
        "from_attributes": True
    }


class SubscriptionTierBase(BaseModel):
    name: str
    description: str
    price_monthly: int
    price_yearly: int
    features: Dict[str, Any]
    
    # Rate limits
    rate_limit_minute: int
    rate_limit_hour: int
    rate_limit_day: Optional[int] = None
    rate_limit_month: Optional[int] = None
    
    # Feature limitations
    max_scheduled_probes: int
    max_api_keys: int
    max_history_days: int
    
    # Probe interval settings
    allowed_probe_intervals: Optional[str] = "15,60,1440"  # Default: 15min, 1hr, 1day
    
    # Concurrency settings
    max_concurrent_requests: Optional[int] = 5
    request_priority: Optional[int] = 1
    
    # Feature flags
    allow_scheduled_probes: bool
    allow_api_access: bool
    allow_export: bool
    allow_alerts: bool
    allow_custom_intervals: bool
    priority_support: bool


class SubscriptionTierCreate(SubscriptionTierBase):
    pass


class SubscriptionTierResponse(SubscriptionTierBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class UserSubscriptionBase(BaseModel):
    is_active: bool = True
    expires_at: Optional[datetime] = None
    payment_id: Optional[str] = None
    payment_method: Optional[str] = None


class UserSubscriptionCreate(UserSubscriptionBase):
    tier_id: int
    user_id: int


class UserSubscriptionResponse(UserSubscriptionBase):
    id: int
    user_id: int
    tier_id: int
    tier: Optional["SubscriptionTierResponse"] = None
    starts_at: datetime
    created_at: datetime
    updated_at: datetime  # ✅ Required for full model conversion
    
    model_config = {
        "from_attributes": True
    }


class ScheduledProbeBase(BaseModel):
    name: str
    description: Optional[str] = None
    tool: str
    target: str
    interval_minutes: int
    is_active: bool = True
    alert_on_failure: bool = False
    alert_on_threshold: bool = False
    threshold_value: Optional[int] = None


class ScheduledProbeCreate(ScheduledProbeBase):
    pass


class ScheduledProbeResponse(ScheduledProbeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class ProbeResultBase(BaseModel):
    result: str
    status: str
    execution_time: int


class ProbeResultCreate(ProbeResultBase):
    scheduled_probe_id: int


class ProbeResultResponse(ProbeResultBase):
    id: int
    scheduled_probe_id: int
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class ApiUsageLogBase(BaseModel):
    endpoint: str
    method: str
    status_code: int
    response_time: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class ApiUsageLogCreate(ApiUsageLogBase):
    user_id: int


class ApiUsageLogResponse(ApiUsageLogBase):
    id: int
    user_id: int
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class SystemMetricBase(BaseModel):
    metric_name: str
    metric_value: float


class SystemMetricCreate(SystemMetricBase):
    pass


class SystemMetricResponse(SystemMetricBase):
    id: int
    created_at: datetime
    
    model_config = {
        "from_attributes": True
    }


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class TokenPayload(BaseModel):
    """
    JWT Token payload schema.
    The 'sub' field is required by FastAPI OAuth2 for token validation.
    """
    sub: str = Field(..., description="Subject identifier, must be the user's email")
    
    @validator('sub')
    def validate_sub_not_empty(cls, v):
        if not v or not isinstance(v, str) or len(v.strip()) == 0:
            raise ValueError('Subject (sub) must be a non-empty string with the user email')
        return v


class PasswordReset(BaseModel):
    password: str


class UserStatusUpdate(BaseModel):
    is_active: bool


# ProbeNode schemas
class ProbeNodeBase(BaseModel):
    """Base schema for probe node data."""
    name: str
    hostname: str
    region: str
    zone: Optional[str] = None
    internal_ip: Optional[str] = None
    external_ip: Optional[str] = None
    version: Optional[str] = None
    supported_tools: Optional[Dict[str, bool]] = None
    hardware_info: Optional[Dict[str, Any]] = None
    network_info: Optional[Dict[str, Any]] = None


class ProbeNodeCreate(ProbeNodeBase):
    """Schema for creating a new probe node."""
    registration_token: str  # Required for initial registration


class ProbeNodeUpdate(BaseModel):
    """Schema for updating an existing probe node."""
    name: Optional[str] = None
    hostname: Optional[str] = None
    region: Optional[str] = None
    zone: Optional[str] = None
    internal_ip: Optional[str] = None
    external_ip: Optional[str] = None
    version: Optional[str] = None
    is_active: Optional[bool] = None
    max_concurrent_probes: Optional[int] = None
    supported_tools: Optional[Dict[str, bool]] = None
    hardware_info: Optional[Dict[str, Any]] = None
    network_info: Optional[Dict[str, Any]] = None
    priority: Optional[int] = None
    admin_notes: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class ProbeNodeAdminUpdate(ProbeNodeUpdate):
    """Admin-only schema for updating probe node configuration."""
    status: Optional[str] = None
    priority: Optional[int] = None
    max_concurrent_probes: Optional[int] = None
    config: Optional[Dict[str, Any]] = None


class ProbeNodeHeartbeat(BaseModel):
    """Schema for probe node heartbeat updates."""
    node_uuid: str
    current_load: float
    avg_response_time: float
    error_count: int = 0
    version: Optional[str] = None
    hardware_stats: Optional[Dict[str, Any]] = None  # Current CPU, memory usage, etc.


class ProbeNodeResponse(ProbeNodeBase):
    """Schema for returning probe node data."""
    id: int
    node_uuid: str
    is_active: bool
    status: str
    last_heartbeat: Optional[datetime] = None
    max_concurrent_probes: int
    priority: int
    current_load: float
    avg_response_time: float
    error_count: int
    total_probes_executed: int
    created_at: datetime
    updated_at: datetime
    config: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True


class ProbeNodeAdminResponse(ProbeNodeResponse):
    """Admin-only schema with additional node details."""
    api_key: str  # Only visible to admins


class ProbeNodeRegistrationResponse(BaseModel):
    """Response after successful node registration."""
    node_uuid: str
    api_key: str
    status: str
    config: Dict[str, Any]
    message: str = "Node registered successfully"


# Fix circular references
UserDetailResponse.update_forward_refs()