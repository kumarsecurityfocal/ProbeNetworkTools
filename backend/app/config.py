from pydantic_settings import BaseSettings
import os
import json
from typing import Optional, List, Union, Any


# Custom field validator function for CORS_ORIGINS
def parse_cors_origins(v: Union[str, List[str]]) -> List[str]:
    """
    Parse CORS_ORIGINS from either a JSON string or comma-separated string.
    Falls back to default in case of parsing errors.
    """
    if isinstance(v, list):
        return v
    
    # Default value if parsing fails
    default = ["*"]
    
    if not v or not isinstance(v, str):
        return default
    
    # Try to parse as JSON
    try:
        origins = json.loads(v)
        if isinstance(origins, list):
            return origins
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Try to parse as comma-separated string
    if ',' in v:
        return [origin.strip() for origin in v.split(',') if origin.strip()]
    
    # Just return the single value as a list
    return [v]


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
    
    # CORS settings
    CORS_ORIGINS: List[str] = ["*"]
    
    # Diagnostic tool settings
    PROBE_TIMEOUT: int = 5  # seconds
    
    class Config:
        env_file = ".env.backend"
        env_file_encoding = 'utf-8'
        extra = "ignore"
        
        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str):
            if field_name == "CORS_ORIGINS":
                return parse_cors_origins(raw_val)
            return raw_val


settings = Settings()