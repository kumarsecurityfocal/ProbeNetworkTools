from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import DBAPIError, OperationalError
import time

from .config import settings

# Create SQLAlchemy engine with connection pool settings for better resilience
engine = create_engine(
    settings.sqlalchemy_database_url,
    pool_pre_ping=True,  # Check connection before using from pool
    pool_recycle=300,    # Recycle connections after 5 minutes
    pool_timeout=30,     # Wait up to 30 seconds for a connection
    pool_size=5,         # Maintain up to 5 connections in the pool
    max_overflow=10      # Allow up to 10 connections beyond pool_size
)

# Create SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency for getting a database session.
    
    This function creates a new database session and closes it when done.
    It is used as a FastAPI dependency.
    """
    max_retries = 3
    retry_delay = 1  # seconds
    
    for retry in range(max_retries):
        db = SessionLocal()
        try:
            # Test connection is alive
            db.execute(text("SELECT 1"))
            break
        except (DBAPIError, OperationalError) as e:
            db.close()
            if retry < max_retries - 1:
                print(f"Database connection error, retrying ({retry+1}/{max_retries}): {str(e)}")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                print(f"Failed to connect to database after {max_retries} attempts: {str(e)}")
                raise
    
    try:
        yield db
    finally:
        db.close()