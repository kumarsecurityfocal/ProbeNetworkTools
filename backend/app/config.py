from pydantic_settings import BaseSettings
from pydantic import field_validator
import os
from typing import Optional, List


class Settings(BaseSettings):
    """Application settings."""
    
    # Database settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg2://postgres:postgres@db:5432/probeops"
    )
    
    @property
    def sqlalchemy_database_url(self) -> str:
        """Get the database URL."""
        return self.DATABASE_URL
    
    # JWT settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS settings - default to "*" (allow all origins)
    # Use comma-separated string format in .env file
    CORS_ORIGINS: List[str] = ["*"]
    
    # Diagnostic tool settings
    PROBE_TIMEOUT: int = 5  # seconds
    
    class Config:
        env_file = ".env.backend"
        env_file_encoding = 'utf-8'
        extra = "ignore"
        validate_assignment = True
        
    # Use model_validator to directly manipulate the final settings
    # This is cleaner than the previous approach with custom parsing


settings = Settings()

# Set CORS_ORIGINS directly from environment to avoid JSON parsing issues
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
if cors_origins_env:
    if cors_origins_env.startswith("[") and cors_origins_env.endswith("]"):
        # Try to extract values from JSON-like string without actual JSON parsing
        raw_values = cors_origins_env[1:-1]  # Remove the brackets
        if raw_values:
            values = [v.strip().strip('"').strip("'") for v in raw_values.split(",")]
            settings.CORS_ORIGINS = values
    elif "," in cors_origins_env:
        # Handle comma-separated format
        settings.CORS_ORIGINS = [v.strip() for v in cors_origins_env.split(",") if v.strip()]
    else:
        # Single value
        settings.CORS_ORIGINS = [cors_origins_env]