from pydantic import BaseModel, Field, EmailStr, validator, HttpUrl, conint, confloat, root_validator, PositiveInt
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import re
import uuid
from enum import Enum
from email_validator import validate_email, EmailNotValidError


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = False
    is_active: Optional[bool] = True


class UserCreate(UserBase):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class PasswordReset(BaseModel):
    token: str
    new_password: str


class UserCreateAdmin(UserCreate):
    is_admin: bool = False
    subscription_tier_id: Optional[int] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserUpdateAdmin(UserUpdate):
    subscription_tier_id: Optional[int] = None


class UserInDB(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class User(UserInDB):
    pass


class ResponseUser(UserInDB):
    """User model to be returned in responses"""
    email_verified: Optional[bool] = None


class UserResponse(UserInDB):
    """Alias for ResponseUser to maintain compatibility"""
    email_verified: Optional[bool] = None


class UserDetailResponse(UserInDB):
    """Used for /me endpoint with detailed user information"""
    email_verified: Optional[bool] = None
    subscription: Optional[Dict[str, Any]] = None


class ApiKeyBase(BaseModel):
    name: str


class ApiKeyCreate(ApiKeyBase):
    pass


class ApiKeyUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None


class ApiKeyInDB(ApiKeyBase):
    id: int
    key: str
    user_id: int
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApiKey(ApiKeyInDB):
    pass


class ApiKeyResponse(ApiKeyInDB):
    """Model for API key responses"""
    pass


class DiagnosticBase(BaseModel):
    tool: str
    target: str


class DiagnosticCreate(DiagnosticBase):
    pass


class DiagnosticUpdate(BaseModel):
    tool: Optional[str] = None
    target: Optional[str] = None
    result: Optional[str] = None
    status: Optional[str] = None


class DiagnosticInDB(DiagnosticBase):
    id: int
    result: str
    status: str
    user_id: int
    created_at: datetime
    execution_time: int

    class Config:
        from_attributes = True


class DiagnosticResponse(DiagnosticInDB):
    """A model for API responses related to diagnostics"""
    pass


class Diagnostic(DiagnosticInDB):
    pass


class SubscriptionTierBase(BaseModel):
    name: str
    description: str
    price_monthly: int
    price_yearly: int
    features: Dict[str, Any]
    rate_limit_minute: int
    rate_limit_hour: int
    rate_limit_day: int
    rate_limit_month: int
    max_scheduled_probes: int
    max_api_keys: int
    max_history_days: int
    allowed_probe_intervals: str
    max_concurrent_requests: int
    request_priority: int
    allow_scheduled_probes: bool
    allow_api_access: bool
    allow_export: bool
    allow_alerts: bool
    allow_custom_intervals: bool
    priority_support: bool


class SubscriptionTierCreate(SubscriptionTierBase):
    pass


class SubscriptionTierUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_monthly: Optional[int] = None
    price_yearly: Optional[int] = None
    features: Optional[Dict[str, Any]] = None
    rate_limit_minute: Optional[int] = None
    rate_limit_hour: Optional[int] = None
    rate_limit_day: Optional[int] = None
    rate_limit_month: Optional[int] = None
    max_scheduled_probes: Optional[int] = None
    max_api_keys: Optional[int] = None
    max_history_days: Optional[int] = None
    allowed_probe_intervals: Optional[str] = None
    max_concurrent_requests: Optional[int] = None
    request_priority: Optional[int] = None
    allow_scheduled_probes: Optional[bool] = None
    allow_api_access: Optional[bool] = None
    allow_export: Optional[bool] = None
    allow_alerts: Optional[bool] = None
    allow_custom_intervals: Optional[bool] = None
    priority_support: Optional[bool] = None


class SubscriptionTierInDB(SubscriptionTierBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubscriptionTier(SubscriptionTierInDB):
    pass


class SubscriptionTierResponse(BaseModel):
    """Simplified subscription tier model for API responses"""
    id: int
    name: str
    description: str
    price_monthly: int
    price_yearly: int
    features: Dict[str, Any]
    
    class Config:
        from_attributes = True


class UserSubscriptionBase(BaseModel):
    user_id: int
    tier_id: int
    is_active: bool = True
    expires_at: Optional[datetime] = None
    payment_id: Optional[str] = None
    payment_method: Optional[str] = None


class UserSubscriptionCreate(UserSubscriptionBase):
    pass


class UserSubscriptionUpdate(BaseModel):
    tier_id: Optional[int] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None
    payment_id: Optional[str] = None
    payment_method: Optional[str] = None


class UserSubscriptionInDB(UserSubscriptionBase):
    id: int
    starts_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserSubscription(UserSubscriptionInDB):
    pass


class UserSubscriptionResponse(BaseModel):
    """Response model for user subscription endpoint"""
    subscription: Optional[Dict[str, Any]] = None
    tier: Optional[Dict[str, Any]] = None


class ScheduledProbeBase(BaseModel):
    name: str
    tool: str
    target: str
    interval_minutes: int
    is_active: bool = True
    description: Optional[str] = None
    alert_on_failure: bool = False
    alert_on_threshold: bool = False
    threshold_value: Optional[int] = None


class ScheduledProbeCreate(ScheduledProbeBase):
    pass


class ScheduledProbeUpdate(BaseModel):
    name: Optional[str] = None
    tool: Optional[str] = None
    target: Optional[str] = None
    interval_minutes: Optional[int] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None
    alert_on_failure: Optional[bool] = None
    alert_on_threshold: Optional[bool] = None
    threshold_value: Optional[int] = None


class ScheduledProbeInDB(ScheduledProbeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScheduledProbeResponse(ScheduledProbeInDB):
    """Model for scheduled probe responses"""
    pass


class ScheduledProbe(ScheduledProbeInDB):
    pass


class ProbeResultBase(BaseModel):
    scheduled_probe_id: int
    result: str
    status: str
    execution_time: int


class ProbeResultCreate(ProbeResultBase):
    pass


class ProbeResultInDB(ProbeResultBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProbeResultResponse(ProbeResultInDB):
    """Model for probe result API responses"""
    pass


class ProbeResult(ProbeResultInDB):
    pass


class ApiUsageLogBase(BaseModel):
    endpoint: str
    method: str
    status_code: int
    response_time: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class ApiUsageLogCreate(ApiUsageLogBase):
    user_id: int


class ApiUsageLogInDB(ApiUsageLogBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ApiUsageLog(ApiUsageLogInDB):
    pass


class SystemMetricBase(BaseModel):
    metric_name: str
    metric_value: float


class SystemMetricCreate(SystemMetricBase):
    pass


class SystemMetricInDB(SystemMetricBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SystemMetric(SystemMetricInDB):
    pass


class UsageLogBase(BaseModel):
    endpoint: str
    success: bool = True
    response_time: float
    ip_address: Optional[str] = None
    tier_id: Optional[int] = None
    api_key_id: Optional[int] = None
    was_queued: bool = False
    queue_time: Optional[float] = None


class UsageLogCreate(UsageLogBase):
    user_id: int


class UsageLogInDB(UsageLogBase):
    id: int
    user_id: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class UsageLog(UsageLogInDB):
    pass


# Probe Node Schemas

class ProbeNodeSupportedTools(BaseModel):
    """Tools supported by a probe node"""
    ping: bool = True
    traceroute: bool = True
    dns: bool = True
    http: bool = True
    nmap: Optional[bool] = False
    curl: Optional[bool] = False
    reverse_dns: Optional[bool] = False
    mtr: Optional[bool] = False
    whois: Optional[bool] = False


class ProbeNodeHardwareInfo(BaseModel):
    """Hardware information for a probe node"""
    cpu_cores: Optional[int] = None
    cpu_model: Optional[str] = None
    memory_total: Optional[int] = None  # Total RAM in MB
    disk_total: Optional[int] = None    # Total disk space in MB
    platform: Optional[str] = None      # Linux, Windows, etc.
    architecture: Optional[str] = None  # x86_64, arm64, etc.


class ProbeNodeNetworkInfo(BaseModel):
    """Network information for a probe node"""
    provider: Optional[str] = None      # AWS, GCP, Azure, etc.
    asn: Optional[str] = None           # AS number
    bandwidth: Optional[str] = None     # Bandwidth in Mbps
    datacenter: Optional[str] = None    # Datacenter identifier
    network_type: Optional[str] = None  # Public, private, etc.


class ProbeNodeBase(BaseModel):
    """Base schema for probe nodes"""
    name: str
    hostname: str
    region: str
    zone: Optional[str] = None
    internal_ip: Optional[str] = None
    external_ip: Optional[str] = None
    supported_tools: Optional[Dict[str, bool]] = None
    hardware_info: Optional[Dict[str, Any]] = None
    network_info: Optional[Dict[str, Any]] = None
    max_concurrent_probes: Optional[int] = 10
    priority: Optional[int] = 1


class ProbeNodeCreate(ProbeNodeBase):
    """Schema for creating a new probe node"""
    registration_token: str
    version: Optional[str] = None


class ProbeNodeHeartbeat(BaseModel):
    """Schema for node heartbeat updates"""
    node_uuid: str
    current_load: float = Field(0.0, ge=0.0, le=1.0)
    avg_response_time: float = Field(0.0, ge=0.0)
    error_count: int = Field(0, ge=0)
    version: Optional[str] = None
    
    @validator('current_load')
    def validate_load(cls, v):
        if v < 0 or v > 1:
            raise ValueError('Load must be between 0.0 and 1.0')
        return v


class ProbeNodeUpdate(BaseModel):
    """Schema for updating a probe node by the node itself"""
    hardware_info: Optional[Dict[str, Any]] = None
    network_info: Optional[Dict[str, Any]] = None
    supported_tools: Optional[Dict[str, bool]] = None
    max_concurrent_probes: Optional[int] = None
    internal_ip: Optional[str] = None
    external_ip: Optional[str] = None
    version: Optional[str] = None


class ProbeNodeAdminUpdate(ProbeNodeUpdate):
    """Schema for updating a probe node by an admin"""
    name: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    admin_notes: Optional[str] = None
    region: Optional[str] = None
    zone: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class ProbeNodeResponse(BaseModel):
    """Schema for returning a probe node"""
    id: int
    node_uuid: str
    name: str
    hostname: str
    region: str
    zone: Optional[str] = None
    is_active: bool
    status: str
    last_heartbeat: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    supported_tools: Optional[Dict[str, bool]] = None
    current_load: float
    error_count: int
    total_probes_executed: int
    
    class Config:
        from_attributes = True


class ProbeNodeAdminResponse(ProbeNodeResponse):
    """Extended schema with additional fields for admin users"""
    internal_ip: Optional[str] = None
    external_ip: Optional[str] = None
    hardware_info: Optional[Dict[str, Any]] = None
    network_info: Optional[Dict[str, Any]] = None
    max_concurrent_probes: int
    priority: int
    admin_notes: Optional[str] = None
    avg_response_time: float
    version: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class ProbeNodeRegistrationResponse(BaseModel):
    """Response after successful node registration"""
    node_uuid: str
    api_key: str
    status: str
    config: Dict[str, Any]
    message: str


class NodeRegistrationTokenCreate(BaseModel):
    """Schema for creating a new node registration token"""
    description: str
    expiry_hours: int = Field(24, ge=1, le=168)  # 1 hour to 1 week
    intended_region: Optional[str] = None


class NodeRegistrationTokenResponse(BaseModel):
    """Schema for node registration token response"""
    id: int
    token: str
    description: str
    created_at: datetime
    expires_at: datetime
    is_used: bool
    used_at: Optional[datetime] = None
    created_by_user_id: int
    node_id: Optional[int] = None
    intended_region: Optional[str] = None
    
    class Config:
        from_attributes = True