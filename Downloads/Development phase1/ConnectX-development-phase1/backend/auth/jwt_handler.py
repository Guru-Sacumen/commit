# auth/jwt_handler.py - JWT creation, decoding, validation with httpOnly cookie support
import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, Any
from dotenv import load_dotenv
from jose import jwt, JWTError
from fastapi import Response, Request, HTTPException, status
from config import settings

load_dotenv()

SECRET_KEY = settings.jwt_secret
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

if not isinstance(SECRET_KEY, str):
    SECRET_KEY = str(SECRET_KEY)

COOKIE_NAME_ACCESS = "access_token"
COOKIE_NAME_REFRESH = "refresh_token"


def create_access_token(
    user_id: str,
    tenant_id: Optional[str],
    role: str,
    expires_delta: Optional[timedelta] = None,
    impersonated_by: Optional[str] = None,
) -> str:
    """
    Create a JWT access token with required payload fields.
    
    Args:
        user_id: User's unique identifier (sub)
        tenant_id: Tenant's unique identifier (tid)
        role: User's role (super_admin, admin, user)
        expires_delta: Optional custom expiration time
        impersonated_by: User ID of the impersonating super_admin
    
    Returns:
        Encoded JWT access token string
    
    Raises:
        ValueError: If user_id is empty
    """
    if not user_id:
        raise ValueError("user_id is required for token creation")
    
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    
    payload: Dict[str, Any] = {
        "sub": user_id,
        "tid": tenant_id,
        "role": role,
        "iat": now,
        "exp": expire,
    }
    
    if impersonated_by:
        payload["impersonated_by"] = impersonated_by
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token() -> Tuple[str, str]:
    """
    Generate a cryptographically secure refresh token.
    
    Returns:
        Tuple of (raw_token, hashed_token) - raw for client, hashed for storage
    """
    raw_token = secrets.token_urlsafe(64)
    hashed_token = hashlib.sha256(raw_token.encode()).hexdigest()
    return raw_token, hashed_token


def hash_refresh_token(raw_token: str) -> str:
    """
    Hash a refresh token for secure storage comparison.
    
    Args:
        raw_token: The raw refresh token from client
    
    Returns:
        SHA256 hash of the token
    """
    return hashlib.sha256(raw_token.encode()).hexdigest()


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: The JWT token string
    
    Returns:
        Decoded payload dict or None if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_token(token: str) -> bool:
    """
    Verify if a token is valid without returning payload.
    
    Args:
        token: The JWT token string
    
    Returns:
        True if valid, False otherwise
    """
    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return True
    except JWTError:
        return False


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    secure: bool = True,
) -> None:
    """
    Set httpOnly cookies for access and refresh tokens.
    
    Args:
        response: FastAPI Response object
        access_token: JWT access token
        refresh_token: Raw refresh token
        secure: Whether to set Secure flag (True for production)
    """
    response.set_cookie(
        key=COOKIE_NAME_ACCESS,
        value=access_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    
    response.set_cookie(
        key=COOKIE_NAME_REFRESH,
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",
    )


def clear_auth_cookies(response: Response) -> None:
    """
    Clear authentication cookies on logout.
    
    Args:
        response: FastAPI Response object
    """
    response.delete_cookie(key=COOKIE_NAME_ACCESS, path="/")
    response.delete_cookie(key=COOKIE_NAME_REFRESH, path="/api/v1/auth")


def get_token_from_cookie(request: Request) -> Optional[str]:
    """
    Extract access token from httpOnly cookie.
    
    Args:
        request: FastAPI Request object
    
    Returns:
        Access token string or None
    """
    return request.cookies.get(COOKIE_NAME_ACCESS)


def get_refresh_token_from_cookie(request: Request) -> Optional[str]:
    """
    Extract refresh token from httpOnly cookie.
    
    Args:
        request: FastAPI Request object
    
    Returns:
        Refresh token string or None
    """
    return request.cookies.get(COOKIE_NAME_REFRESH)


def get_refresh_token_expiry() -> datetime:
    """
    Calculate refresh token expiration datetime.
    
    Returns:
        Datetime when refresh token expires
    """
    return datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
