from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import secrets


class Settings(BaseSettings):
    """Application configuration settings."""
    
    # Application
    APP_NAME: str = "DReflowPro ETL Platform"
    VERSION: str = "0.1.0"
    DEBUG: bool = Field(default=False, env="DEBUG")
    
    # Security
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    
    # Database (using SQLite for development)
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./dreflowpro.db",
        env="DATABASE_URL"
    )
    
    # Redis
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        env="REDIS_URL"
    )
    
    # Celery
    CELERY_BROKER_URL: str = Field(
        default="redis://localhost:6379/0",
        env="CELERY_BROKER_URL"
    )
    CELERY_RESULT_BACKEND: str = Field(
        default="redis://localhost:6379/0",
        env="CELERY_RESULT_BACKEND"
    )
    
    # File Storage
    UPLOAD_FOLDER: str = Field(default="uploads", env="UPLOAD_FOLDER")
    MAX_UPLOAD_SIZE: int = Field(default=100 * 1024 * 1024, env="MAX_UPLOAD_SIZE")  # 100MB
    ALLOWED_EXTENSIONS: list[str] = Field(
        default=["csv", "xlsx", "xls", "json", "txt"],
        env="ALLOWED_EXTENSIONS"
    )
    
    # External Services
    OPENAI_API_KEY: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    
    # CORS
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        env="CORS_ORIGINS"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()