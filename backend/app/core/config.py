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
    
    # Database (using PostgreSQL)
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/dreflowpro",
        env="DATABASE_URL"
    )
    
    # Redis Settings
    REDIS_URL: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")
    
    # Cache Settings
    CACHE_TTL: int = Field(default=3600, env="CACHE_TTL")  # 1 hour default
    SESSION_TTL: int = Field(default=86400, env="SESSION_TTL")  # 24 hours default
    
    # File Storage
    UPLOAD_FOLDER: str = Field(default="uploads", env="UPLOAD_FOLDER")
    MAX_UPLOAD_SIZE: int = Field(default=100 * 1024 * 1024, env="MAX_UPLOAD_SIZE")  # 100MB
    ALLOWED_EXTENSIONS: list[str] = Field(
        default=["csv", "xlsx", "xls", "json", "txt"],
        env="ALLOWED_EXTENSIONS"
    )
    
    # Environment
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    
    # External Services
    OPENAI_API_KEY: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    
    # OAuth Settings
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None, env="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None, env="GOOGLE_CLIENT_SECRET")
    
    GITHUB_CLIENT_ID: Optional[str] = Field(default=None, env="GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET: Optional[str] = Field(default=None, env="GITHUB_CLIENT_SECRET")
    
    MICROSOFT_CLIENT_ID: Optional[str] = Field(default=None, env="MICROSOFT_CLIENT_ID")
    MICROSOFT_CLIENT_SECRET: Optional[str] = Field(default=None, env="MICROSOFT_CLIENT_SECRET")
    
    # OAuth Redirect URLs
    OAUTH_REDIRECT_URL: str = Field(default="http://localhost:8000/auth/oauth/{provider}/callback", env="OAUTH_REDIRECT_URL")
    
    # CORS
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3003", "http://127.0.0.1:3003"],
        env="CORS_ORIGINS"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()

def get_settings() -> Settings:
    """Get application settings instance."""
    return settings