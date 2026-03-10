# config.py - Environment variables and settings
import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    model_config = {"extra": "ignore"}
    
    # Database
    database_url: str = "postgresql://user:password@localhost:5432/connectx"
    
    # JWT
    jwt_secret: str = "dev_connectx_jwt_secret_xK9#mP2@vL8$nQ5"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    
    # Email
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    from_addr: str = "no-reply@connectx.local"
    
    # File Storage
    upload_dir: str = "uploads"
    max_file_size: int = 10485760  # 10MB
    allowed_extensions: str = "pdf,doc,docx,txt,jpg,jpeg,png,gif"
    
    # Application
    debug: bool = False
    log_level: str = "INFO"


# Global settings instance
settings = Settings()
