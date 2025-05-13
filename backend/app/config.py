import os
from datetime import timedelta
from typing import Optional

from pydantic import BaseSettings

class Settings(BaseSettings):
    # Database settings
    POSTGRES_USER: str = os.getenv("PGUSER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("PGPASSWORD", "postgres")
    POSTGRES_HOST: str = os.getenv("PGHOST", "db")
    POSTGRES_PORT: str = os.getenv("PGPORT", "5432")
    POSTGRES_DB: str = os.getenv("PGDATABASE", "probeops")
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    
    # If DATABASE_URL is provided, use it directly
    # Otherwise, construct it from individual components
    @property
    def sqlalchemy_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # JWT settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS settings
    CORS_ORIGINS: list = ["*"]

    # Probe settings
    PROBE_TIMEOUT: int = 5  # seconds

    class Config:
        env_file = ".env.backend"


settings = Settings()
