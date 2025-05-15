from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from .database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)  # Single admin role as per requirements
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    diagnostics = relationship("Diagnostic", back_populates="user", cascade="all, delete-orphan")
    user_subscription = relationship("UserSubscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    scheduled_probes = relationship("ScheduledProbe", back_populates="user", cascade="all, delete-orphan")
    api_usage_logs = relationship("ApiUsageLog", back_populates="user", cascade="all, delete-orphan")


class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates="api_keys")


class Diagnostic(Base):
    __tablename__ = "diagnostics"
    
    id = Column(Integer, primary_key=True, index=True)
    tool = Column(String)  # ping, traceroute, dns_lookup, etc.
    target = Column(String)  # hostname, IP address, etc.
    result = Column(Text)
    status = Column(String)  # success, failure
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    execution_time = Column(Integer)  # in milliseconds
    
    user = relationship("User", back_populates="diagnostics")


class SubscriptionTier(Base):
    __tablename__ = "subscription_tiers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # FREE, STANDARD, ENTERPRISE
    description = Column(String)
    price_monthly = Column(Integer)  # Price in cents
    price_yearly = Column(Integer)  # Price in cents
    features = Column(JSON)  # JSON field for features
    
    # Rate limits
    rate_limit_minute = Column(Integer)
    rate_limit_hour = Column(Integer)
    rate_limit_day = Column(Integer)  # API calls per day limit
    rate_limit_month = Column(Integer)  # API calls per month limit
    
    # Feature limitations
    max_scheduled_probes = Column(Integer)
    max_api_keys = Column(Integer)
    max_history_days = Column(Integer)
    
    # Allowed intervals for scheduled probes (comma-separated values in minutes)
    # Example: "5,15,60,1440" for 5min, 15min, 1hr, 1day
    allowed_probe_intervals = Column(String, default="15,60,1440")
    
    # Concurrency settings
    max_concurrent_requests = Column(Integer, default=5)  # Maximum concurrent requests allowed
    request_priority = Column(Integer, default=1)  # Priority in the request queue (higher = higher priority)
    
    # Feature flags
    allow_scheduled_probes = Column(Boolean, default=False)
    allow_api_access = Column(Boolean, default=False)
    allow_export = Column(Boolean, default=False)
    allow_alerts = Column(Boolean, default=False)
    allow_custom_intervals = Column(Boolean, default=False)
    priority_support = Column(Boolean, default=False)
    
    # Relationships
    user_subscriptions = relationship("UserSubscription", back_populates="tier")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    tier_id = Column(Integer, ForeignKey("subscription_tiers.id"))
    
    # Subscription status
    is_active = Column(Boolean, default=True)
    starts_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    # Payment info (minimal, could expand later)
    payment_id = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="user_subscription")
    tier = relationship("SubscriptionTier", back_populates="user_subscriptions")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScheduledProbe(Base):
    __tablename__ = "scheduled_probes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String, nullable=True)
    
    # Probe configuration
    tool = Column(String)  # ping, traceroute, dns_lookup, etc.
    target = Column(String)  # hostname, IP address, etc.
    
    # Schedule configuration
    interval_minutes = Column(Integer)
    is_active = Column(Boolean, default=True)
    
    # Alert configuration
    alert_on_failure = Column(Boolean, default=False)
    alert_on_threshold = Column(Boolean, default=False)
    threshold_value = Column(Integer, nullable=True)  # e.g., ms for ping
    
    # Ownership
    user_id = Column(Integer, ForeignKey("users.id"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="scheduled_probes")
    probe_results = relationship("ProbeResult", back_populates="scheduled_probe", cascade="all, delete-orphan")


class ProbeResult(Base):
    __tablename__ = "probe_results"
    
    id = Column(Integer, primary_key=True, index=True)
    scheduled_probe_id = Column(Integer, ForeignKey("scheduled_probes.id"))
    result = Column(Text)
    status = Column(String)  # success, failure
    execution_time = Column(Integer)  # in milliseconds
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    scheduled_probe = relationship("ScheduledProbe", back_populates="probe_results")


class ApiUsageLog(Base):
    __tablename__ = "api_usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    endpoint = Column(String)
    method = Column(String)
    status_code = Column(Integer)
    response_time = Column(Integer)  # in milliseconds
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="api_usage_logs")


class SystemMetric(Base):
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String)  # cpu_usage, memory_usage, disk_usage, etc.
    metric_value = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class UsageLog(Base):
    """
    Detailed usage log for tracking all API requests with more comprehensive metrics.
    This expands on ApiUsageLog with additional fields for rate limiting and analytics.
    """
    __tablename__ = "usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    endpoint = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    success = Column(Boolean, default=True)
    response_time = Column(Float)  # in seconds (float for higher precision)
    ip_address = Column(String, nullable=True)
    
    # Additional fields for better analytics
    tier_id = Column(Integer, ForeignKey("subscription_tiers.id"), nullable=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=True)
    was_queued = Column(Boolean, default=False)
    queue_time = Column(Float, nullable=True)  # How long it waited in queue (in seconds)
    
    # Relationships could be added if needed


class ProbeNode(Base):
    """
    Represents a probe node in the system, responsible for executing network diagnostics.
    Each node registers with the system and can be managed by administrators.
    """
    __tablename__ = "probe_nodes"
    
    id = Column(Integer, primary_key=True, index=True)
    node_uuid = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    hostname = Column(String)
    internal_ip = Column(String, nullable=True)
    external_ip = Column(String, nullable=True)
    region = Column(String)  # AWS region or custom region identifier
    zone = Column(String, nullable=True)  # Availability zone (e.g., us-east-1a)
    api_key = Column(String, unique=True)  # Node-specific API key
    
    # Status information
    is_active = Column(Boolean, default=True)
    status = Column(String, default="registered")  # registered, active, inactive, error
    last_heartbeat = Column(DateTime, nullable=True)
    version = Column(String, nullable=True)
    
    # Node capabilities
    max_concurrent_probes = Column(Integer, default=10)
    supported_tools = Column(JSON, default=lambda: {"ping": True, "traceroute": True, "dns": True, "http": True})
    hardware_info = Column(JSON, nullable=True)  # CPU, memory, etc.
    network_info = Column(JSON, nullable=True)  # ASN, provider, bandwidth
    
    # Administrative settings
    priority = Column(Integer, default=1)  # Higher number = higher priority
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Performance metrics
    current_load = Column(Float, default=0.0)  # 0.0 to 1.0 (percentage/100)
    avg_response_time = Column(Float, default=0.0)  # Average response time in ms
    error_count = Column(Integer, default=0)
    total_probes_executed = Column(Integer, default=0)
    
    # Node configuration
    config = Column(JSON, default=dict)  # Flexible configuration object
    
    # Relationship to diagnostics executed by this node
    diagnostics = relationship("Diagnostic", secondary="node_diagnostics", backref="executed_by_nodes")


# Association table for many-to-many relationship between diagnostics and nodes
class NodeDiagnostic(Base):
    """Association table linking diagnostics to the nodes that executed them."""
    __tablename__ = "node_diagnostics"
    
    node_id = Column(Integer, ForeignKey("probe_nodes.id"), primary_key=True)
    diagnostic_id = Column(Integer, ForeignKey("diagnostics.id"), primary_key=True)
    executed_at = Column(DateTime, default=datetime.utcnow)
    execution_time = Column(Float)  # Time taken to execute in ms