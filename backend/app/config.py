from pydantic_settings import BaseSettings
import os
from typing import Optional


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
    CORS_ORIGINS: list = ["*"]
    
    # Diagnostic tool settings
    PROBE_TIMEOUT: int = 5  # seconds
    
    class Config:
        env_file = ".env.backend"


settings = Settings()