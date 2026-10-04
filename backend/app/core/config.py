from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "TrustGuard AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = Field(default="trustguard_forensic_super_secret_jwt_key_2026_x!9qZ")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./trustguard.db",
        description="PostgreSQL in Docker/production, SQLite for zero-config local development"
    )

    # Storage (MinIO / Local File Storage adapter)
    STORAGE_TYPE: str = Field(default="local")  # 'local' or 'minio'
    LOCAL_STORAGE_DIR: str = Field(default="./storage")
    MINIO_ENDPOINT: str = Field(default="localhost:9000")
    MINIO_ACCESS_KEY: str = Field(default="trustguard_minio")
    MINIO_SECRET_KEY: str = Field(default="trustguard_secret_2026")
    MINIO_BUCKET_NAME: str = Field(default="trustguard-evidence")
    MINIO_SECURE: bool = False

    # Redis / Celery
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "*"
    ]

    # Operational Modes
    DEMO_MODE: bool = Field(default=True)
    ENVIRONMENT: str = Field(default="development")

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="allow"
    )

settings = Settings()
