import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, diagnostics, api_keys, subscriptions, scheduled_probes, metrics
from app.database import engine, Base, get_db
from app.config import settings
from app.initialize_db import initialize_database
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ProbeOps API",
    description="API for network diagnostics and operations",
    version="0.1.0",
)

# Configure CORS with values from settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with proper prefix
# Note: In production, NGINX strips the /api prefix, so these routes need to match
# what the frontend expects after the /api is stripped
app.include_router(auth.router, prefix="", tags=["Authentication"])
app.include_router(diagnostics.router, prefix="", tags=["Diagnostics"])
app.include_router(api_keys.router, prefix="", tags=["API Keys"])
app.include_router(subscriptions.router, prefix="", tags=["Subscriptions"])
app.include_router(scheduled_probes.router, prefix="", tags=["Scheduled Probes"])
app.include_router(metrics.router, prefix="", tags=["Metrics"])

@app.get("/", tags=["Root"])
async def root():
    return {"message": "Welcome to ProbeOps API"}

@app.get("/health", tags=["Health"])
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint to verify API and database connection.
    """
    try:
        # Check database connection by executing a simple query
        from sqlalchemy import text
        db.execute(text("SELECT 1")).fetchall()
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@app.on_event("startup")
async def startup_event():
    """
    Run initialization tasks when the application starts.
    """
    logger.info("Starting ProbeOps API")
    
    # Initialize database (tiers, users, etc.)
    try:
        init_result = initialize_database()
        logger.info(f"Database initialization completed: {init_result}")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
    
    logger.info("ProbeOps API started successfully")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
