import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "JWAS E-Commerce Platform"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/jwas_db"
    
    # Security
    SECRET_KEY: str = "jwas-super-secret-jwt-encryption-key-for-auth-2026-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 365  # 1 year persistence for PWA and mobile users
    
    # URLs
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    
    # Uploads
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    
    # Payment Provider (Razorpay)
    PAYMENT_GATEWAY_KEY_ID: Optional[str] = None
    PAYMENT_GATEWAY_KEY_SECRET: Optional[str] = None
    PAYMENT_WEBHOOK_SECRET: Optional[str] = None
    
    # Email
    EMAIL_PROVIDER_HOST: Optional[str] = None
    EMAIL_PROVIDER_PORT: Optional[int] = 587
    EMAIL_PROVIDER_USER: Optional[str] = None
    EMAIL_PROVIDER_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

settings = Settings()
