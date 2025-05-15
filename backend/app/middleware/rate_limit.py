"""
Rate limiting middleware for FastAPI.

This module provides a rate limiting dependency that enforces tier-based
request limits for API endpoints. It supports:
- Per-minute and per-hour rate limits based on subscription tier
- Concurrent request limiting
- Request prioritization based on tier
- Usage tracking for analytics

The implementation is cloud-friendly and works in containerized environments.
"""

import time
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, Set, List, Union, Any, cast
import asyncio
from collections import defaultdict
import logging
from fastapi import Request, HTTPException, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user, validate_api_key
from ..models import User, SubscriptionTier, UserSubscription, ApiKey, UsageLog

# Setup logging
logger = logging.getLogger(__name__)

# In-memory cache for short-term rate limiting
# Structure: {user_id: {'minute': (count, reset_time), 'hour': (count, reset_time)}}
RATE_LIMITS: Dict[int, Dict[str, Tuple[int, float]]] = {}

# Track active requests per user
# Structure: {user_id: set(request_ids)}
ACTIVE_REQUESTS: Dict[int, Set[str]] = defaultdict(set)

# Request queue for handling traffic when limits are reached
# Structure: [(priority, timestamp, user_id, request_id, future)]
REQUEST_QUEUE: List[Tuple[int, float, int, str, asyncio.Future]] = []
REQUEST_QUEUE_LOCK = asyncio.Lock()

# Maximum size of the request queue
MAX_QUEUE_SIZE = 1000

# Default limits for when subscription data cannot be fetched
DEFAULT_LIMITS = {
    'rate_limit_minute': 10,
    'rate_limit_hour': 50,
    'max_concurrent_requests': 5,
    'priority': 0
}


async def process_queue():
    """Process the request queue, allowing requests as capacity becomes available."""
    global REQUEST_QUEUE
    
    if not REQUEST_QUEUE:
        return
    
    # Process the queue (sorted by priority, then timestamp)
    REQUEST_QUEUE.sort(key=lambda x: (-x[0], x[1]))
    
    # Try to process requests from the queue
    async with REQUEST_QUEUE_LOCK:
        i = 0
        while i < len(REQUEST_QUEUE):
            priority, _, user_id, request_id, future = REQUEST_QUEUE[i]
            
            # Check if this user has capacity now
            if can_process_request(user_id):
                # Remove from queue and fulfill the future
                REQUEST_QUEUE.pop(i)
                if not future.done():
                    future.set_result(True)
            else:
                i += 1


def can_process_request(user_id: int) -> bool:
    """Check if a user has capacity for a new request based on concurrent limits."""
    # Get user's subscription details (mock implementation - replace with DB query)
    max_concurrent = get_user_limits(user_id).get('max_concurrent_requests', 
                                               DEFAULT_LIMITS['max_concurrent_requests'])
    
    # Check current active requests
    current_active = len(ACTIVE_REQUESTS.get(user_id, set()))
    return current_active < max_concurrent


def get_user_limits(user_id: int, db: Optional[Session] = None) -> Dict:
    """Get a user's subscription limits."""
    try:
        if db:
            # Query the database for the user's subscription tier limits
            subscription = db.query(UserSubscription).filter(
                UserSubscription.user_id == user_id,
                UserSubscription.is_active == True
            ).first()
            
            if subscription and subscription.tier:
                return {
                    'rate_limit_minute': subscription.tier.rate_limit_minute,
                    'rate_limit_hour': subscription.tier.rate_limit_hour,
                    'max_concurrent_requests': subscription.tier.max_concurrent_requests,
                    'priority': subscription.tier.priority,
                    'tier_name': subscription.tier.name
                }
        
        # Default limits if no subscription found or no DB connection
        return DEFAULT_LIMITS
    except Exception as e:
        logger.error(f"Error fetching user limits: {e}")
        return DEFAULT_LIMITS


def record_request_start(user_id: int, request_id: str):
    """Record the start of a request for a user."""
    if user_id not in ACTIVE_REQUESTS:
        ACTIVE_REQUESTS[user_id] = set()
    ACTIVE_REQUESTS[user_id].add(request_id)


def record_request_end(user_id: int, request_id: str):
    """Record the end of a request for a user."""
    if user_id in ACTIVE_REQUESTS and request_id in ACTIVE_REQUESTS[user_id]:
        ACTIVE_REQUESTS[user_id].remove(request_id)
        if not ACTIVE_REQUESTS[user_id]:
            del ACTIVE_REQUESTS[user_id]
    
    # Process the queue to see if we can allow more requests
    asyncio.create_task(process_queue())


def record_usage(db: Session, user_id: int, endpoint: str, 
                success: bool, response_time: float, ip_address: str = None):
    """Record API usage for analytics and billing."""
    try:
        usage_log = UsageLog(
            user_id=user_id,
            endpoint=endpoint,
            timestamp=datetime.utcnow(),
            success=success,
            response_time=response_time,
            ip_address=ip_address
        )
        db.add(usage_log)
        db.commit()
    except Exception as e:
        logger.error(f"Error recording usage: {e}")
        db.rollback()


def check_rate_limit(user_id: int, limits: Dict) -> bool:
    """
    Check if a user has exceeded their rate limits.
    Returns True if the request should be allowed, False otherwise.
    """
    current_time = time.time()
    
    # Initialize rate limit tracking for this user if not exists
    if user_id not in RATE_LIMITS:
        RATE_LIMITS[user_id] = {
            'minute': (0, current_time + 60),
            'hour': (0, current_time + 3600)
        }
    
    # Check and update minute rate limit
    minute_count, minute_reset = RATE_LIMITS[user_id]['minute']
    if current_time > minute_reset:
        # Reset the counter if the time window has passed
        minute_count = 0
        minute_reset = current_time + 60
    
    if minute_count >= limits['rate_limit_minute']:
        return False
    
    # Check and update hour rate limit
    hour_count, hour_reset = RATE_LIMITS[user_id]['hour']
    if current_time > hour_reset:
        # Reset the counter if the time window has passed
        hour_count = 0
        hour_reset = current_time + 3600
    
    if hour_count >= limits['rate_limit_hour']:
        return False
    
    # Update the rate limit counters
    RATE_LIMITS[user_id]['minute'] = (minute_count + 1, minute_reset)
    RATE_LIMITS[user_id]['hour'] = (hour_count + 1, hour_reset)
    
    return True


async def queue_request(user_id: int, request_id: str, priority: int) -> bool:
    """
    Queue a request for processing when capacity becomes available.
    Returns True if the request was queued, False if the queue is full.
    """
    if len(REQUEST_QUEUE) >= MAX_QUEUE_SIZE:
        return False
    
    # Create a future to wait on
    future = asyncio.Future()
    
    # Add the request to the queue
    async with REQUEST_QUEUE_LOCK:
        REQUEST_QUEUE.append((priority, time.time(), user_id, request_id, future))
    
    # Process the queue in case there's capacity now
    await process_queue()
    
    # Wait for the request to be allowed (with timeout)
    try:
        await asyncio.wait_for(future, timeout=60.0)  # 60 second timeout
        return True
    except asyncio.TimeoutError:
        # Remove from queue if timed out
        async with REQUEST_QUEUE_LOCK:
            for i, (_, _, u_id, r_id, _) in enumerate(REQUEST_QUEUE):
                if u_id == user_id and r_id == request_id:
                    REQUEST_QUEUE.pop(i)
                    break
        return False


async def rate_limit_dependency(
    request: Request,
    db: Session = Depends(get_db)
) -> int:
    """
    FastAPI dependency for rate limiting.
    Returns the user_id if the request is allowed.
    Raises HTTPException if rate limits are exceeded.
    """
    start_time = time.time()
    request_id = f"{id(request)}-{start_time}"
    
    # Extract authentication (from header or query param)
    api_key = None
    user = None
    user_id = None
    
    # Try to get API key from header or query parameter
    if "X-API-Key" in request.headers:
        api_key = request.headers["X-API-Key"]
    elif "api_key" in request.query_params:
        api_key = request.query_params["api_key"]
    
    # Authenticate the user
    try:
        if api_key:
            # Validate API key
            user = validate_api_key(api_key, db)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid API key"
                )
        else:
            # Try to get user from JWT token
            token = request.headers.get("Authorization", "").replace("Bearer ", "")
            if token:
                try:
                    user = await get_current_user(token, db)
                except Exception:
                    # Not authenticated via JWT, but might be public endpoint
                    pass
    except Exception as e:
        logger.warning(f"Authentication error: {e}")
        # Continue as unauthenticated (public endpoints will still work)
    
    # Get user ID or use anonymous identifier
    if user:
        user_id = user.id
    else:
        # Handle public endpoints (might be restricted or have different limits)
        client_ip = request.client.host
        user_id = hash(client_ip) % 1000000  # Anonymous user ID based on IP
    
    # Get user's subscription limits
    limits = get_user_limits(user_id, db)
    
    # Check if user has exceeded concurrent request limit
    if not can_process_request(user_id):
        # If at capacity, try to queue the request
        if await queue_request(user_id, request_id, limits.get('priority', 0)):
            # Request was queued and is now ready to be processed
            pass
        else:
            # Queue is full or request timed out
            logger.warning(f"Rate limit exceeded for user {user_id}: too many concurrent requests")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many concurrent requests. Please try again later."
            )
    
    # Check rate limits (requests per minute/hour)
    if not check_rate_limit(user_id, limits):
        logger.warning(f"Rate limit exceeded for user {user_id}: too many requests")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Record the start of this request
    record_request_start(user_id, request_id)
    
    # Add cleanup handler to record when request ends
    @request.on_close
    async def on_request_close():
        end_time = time.time()
        duration = end_time - start_time
        
        # Get response status from state (if available)
        success = getattr(request.state, "response_success", True)
        
        # Record usage statistics
        if db and user_id:
            record_usage(
                db, 
                user_id, 
                request.url.path, 
                success, 
                duration, 
                request.client.host
            )
        
        # Record the end of this request
        record_request_end(user_id, request_id)
    
    return user_id


# Periodic task to clean up expired rate limit entries
async def cleanup_task():
    """Periodically clean up expired rate limit entries and process the queue."""
    while True:
        try:
            current_time = time.time()
            
            # Clean up expired rate limit entries
            for user_id in list(RATE_LIMITS.keys()):
                minute_count, minute_reset = RATE_LIMITS[user_id]['minute']
                hour_count, hour_reset = RATE_LIMITS[user_id]['hour']
                
                if current_time > minute_reset:
                    RATE_LIMITS[user_id]['minute'] = (0, current_time + 60)
                
                if current_time > hour_reset:
                    RATE_LIMITS[user_id]['hour'] = (0, current_time + 3600)
                
                # Remove user from tracking if all counters are 0
                if RATE_LIMITS[user_id]['minute'][0] == 0 and RATE_LIMITS[user_id]['hour'][0] == 0:
                    del RATE_LIMITS[user_id]
            
            # Process any queued requests
            await process_queue()
            
            # Clean up timed-out requests in queue
            async with REQUEST_QUEUE_LOCK:
                timeout_threshold = current_time - 60  # 60 seconds timeout
                REQUEST_QUEUE[:] = [
                    item for item in REQUEST_QUEUE 
                    if item[1] >= timeout_threshold
                ]
                
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}")
        
        # Run every 5 seconds
        await asyncio.sleep(5)


# Function to start background tasks
def start_background_tasks():
    """Start background tasks for the rate limiter."""
    asyncio.create_task(cleanup_task())