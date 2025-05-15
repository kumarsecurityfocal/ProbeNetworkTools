from pydantic_settings import BaseSettings
from pydantic import validator
import os
import json
from typing import Optional, List, Union


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
    
    # CORS settings - using Union type to allow both string and list inputs
    # This enables Pydantic to handle various formats correctly
    CORS_ORIGINS: Union[str, List[str]] = ["*"]
    
    # Diagnostic tool settings
    PROBE_TIMEOUT: int = 5  # seconds
    
    # Validator that runs before the model is created (pre=True)
    # This ensures it runs during Alembic's initialization
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        """
        Parse CORS_ORIGINS from various formats:
        - JSON string arrays: '["http://localhost", "http://frontend"]'
        - Comma-separated strings: 'http://localhost,http://frontend'
        - Single string values: 'http://localhost'
        - List objects (already parsed): ['http://localhost', 'http://frontend']
        """
        # If it's already a list, return it as is
        if isinstance(v, list):
            return v
            
        # Default value if parsing fails
        default = ["*"]
        
        # If it's not a string or is empty, return default
        if not v or not isinstance(v, str):
            return default
            
        # Handle JSON-formatted string
        if v.startswith("[") and v.endswith("]"):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                # If JSON parsing fails, try manual extraction
                raw_values = v[1:-1]  # Remove the brackets
                if raw_values:
                    return [item.strip().strip('"').strip("'") for item in raw_values.split(",")]
                return default
                
        # Handle comma-separated string
        if "," in v:
            return [item.strip() for item in v.split(",") if item.strip()]
            
        # Handle single value
        return [v]
    
    class Config:
        # Look for .env.backend in both the current directory and /app
        # This ensures it works both in development and in Docker
        env_file = [".env.backend", "/app/.env.backend", "../.env.backend"]
        env_file_encoding = 'utf-8'
        extra = "ignore"


# Initialize settings
settings = Settings()