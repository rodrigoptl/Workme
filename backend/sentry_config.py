import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
from sentry_sdk.integrations.pymongo import PyMongoIntegration

def init_sentry():
    """Initialize Sentry for error tracking and performance monitoring"""
    
    sentry_dsn = os.getenv("SENTRY_DSN")
    environment = os.getenv("ENVIRONMENT", "development")
    
    if not sentry_dsn:
        print("Sentry DSN not configured, skipping Sentry initialization")
        return
    
    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=environment,
        integrations=[
            FastApiIntegration(auto_enabling_integrations=False),
            StarletteIntegration(),
            HttpxIntegration(),
            PyMongoIntegration(),
        ],
        
        # Performance Monitoring
        traces_sample_rate=1.0 if environment == "staging" else 0.1,
        
        # Release tracking
        release=os.getenv("SENTRY_RELEASE", "unknown"),
        
        # Error filtering
        before_send=filter_errors,
        
        # User context
        send_default_pii=False,
        
        # Debug mode for staging
        debug=environment == "staging",
        
        # Custom tags
        tags={
            "component": "backend",
            "service": "workme-api"
        }
    )
    
    print(f"Sentry initialized for environment: {environment}")

def filter_errors(event, hint):
    """Filter out known/expected errors"""
    
    # Skip health check failures
    if 'health' in event.get('request', {}).get('url', ''):
        return None
    
    # Skip validation errors (they're expected)
    if event.get('exception', {}).get('values', [{}])[0].get('type') == 'ValidationError':
        return None
    
    # Skip 404s on known endpoints
    if event.get('status_code') == 404:
        return None
    
    return event

def set_user_context(user_id: str, email: str = None, user_type: str = None):
    """Set user context for better error tracking"""
    from sentry_sdk import set_user
    
    set_user({
        "id": user_id,
        "email": email,
        "user_type": user_type
    })

def add_breadcrumb(message: str, category: str = "custom", level: str = "info", data: dict = None):
    """Add custom breadcrumb for debugging"""
    from sentry_sdk import add_breadcrumb as sentry_add_breadcrumb
    
    sentry_add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data or {}
    )

def capture_exception(error: Exception, extra_data: dict = None):
    """Capture exception with additional context"""
    from sentry_sdk import capture_exception as sentry_capture_exception
    from sentry_sdk import set_extra
    
    if extra_data:
        for key, value in extra_data.items():
            set_extra(key, value)
    
    sentry_capture_exception(error)

def capture_message(message: str, level: str = "info", extra_data: dict = None):
    """Capture custom message"""
    from sentry_sdk import capture_message as sentry_capture_message
    from sentry_sdk import set_extra
    
    if extra_data:
        for key, value in extra_data.items():
            set_extra(key, value)
    
    sentry_capture_message(message, level=level)