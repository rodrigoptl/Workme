from fastapi import APIRouter, HTTPException, Depends
from pymongo import MongoClient
from datetime import datetime
import os
import sys
import psutil
import asyncio
from typing import Dict, Any

router = APIRouter(prefix="/api", tags=["health"])

def get_mongo_client():
    """Get MongoDB client for health checks"""
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        raise HTTPException(status_code=500, detail="MongoDB URL not configured")
    return MongoClient(mongo_url)

@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@router.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with all dependencies"""
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "checks": {}
    }
    
    overall_healthy = True
    
    # Database health check
    try:
        client = get_mongo_client()
        # Test connection with timeout
        client.server_info()
        health_status["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": 0  # Could measure actual response time
        }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_healthy = False
    
    # System resources check
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        health_status["checks"]["system"] = {
            "status": "healthy",
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "disk_percent": (disk.used / disk.total) * 100,
            "python_version": sys.version
        }
        
        # Alert if resources are critical
        if cpu_percent > 90 or memory.percent > 90:
            health_status["checks"]["system"]["status"] = "warning"
            
    except Exception as e:
        health_status["checks"]["system"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # External services check
    health_status["checks"]["external_services"] = {}
    
    # Stripe connectivity (without exposing keys)
    try:
        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        if stripe_key and stripe_key != "sk_test_fake":
            # In a real implementation, you'd test Stripe connectivity
            health_status["checks"]["external_services"]["stripe"] = {"status": "configured"}
        else:
            health_status["checks"]["external_services"]["stripe"] = {"status": "not_configured"}
    except Exception as e:
        health_status["checks"]["external_services"]["stripe"] = {
            "status": "error",
            "error": str(e)
        }
    
    # Emergent LLM connectivity
    try:
        llm_key = os.getenv("EMERGENT_LLM_KEY")
        if llm_key and llm_key != "test-key":
            health_status["checks"]["external_services"]["emergent_llm"] = {"status": "configured"}
        else:
            health_status["checks"]["external_services"]["emergent_llm"] = {"status": "not_configured"}
    except Exception as e:
        health_status["checks"]["external_services"]["emergent_llm"] = {
            "status": "error",
            "error": str(e)
        }
    
    # Overall status
    if not overall_healthy:
        health_status["status"] = "unhealthy"
        raise HTTPException(status_code=503, detail=health_status)
    
    return health_status

@router.get("/health/liveness")
async def liveness_probe():
    """Kubernetes liveness probe - checks if app is running"""
    return {"status": "alive"}

@router.get("/health/readiness")
async def readiness_probe():
    """Kubernetes readiness probe - checks if app is ready to serve traffic"""
    
    # Check database connectivity
    try:
        client = get_mongo_client()
        client.server_info()
    except Exception:
        raise HTTPException(status_code=503, detail="Database not ready")
    
    return {"status": "ready"}

@router.get("/metrics")
async def metrics_endpoint():
    """Basic metrics endpoint for monitoring"""
    
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Process metrics
        process = psutil.Process()
        process_memory = process.memory_info()
        
        return {
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "disk_percent": (disk.used / disk.total) * 100,
                "load_average": os.getloadavg() if hasattr(os, 'getloadavg') else None
            },
            "process": {
                "memory_mb": process_memory.rss / 1024 / 1024,
                "threads": process.num_threads(),
                "open_files": len(process.open_files()),
                "connections": len(process.connections())
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to collect metrics: {str(e)}")