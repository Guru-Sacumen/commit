# auth/dependencies.py - FastAPI authentication dependencies
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, Membership, RoleEnum
from auth.jwt_handler import decode_token, get_token_from_cookie
from auth.rbac import check_permission


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_db():
    """
    Database dependency that provides a SQLAlchemy session.
    
    Yields:
        Session: Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_token(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
) -> str:
    """
    Extract JWT token from httpOnly cookie or Authorization header.
    Cookie takes precedence for security.
    
    Args:
        request: FastAPI Request object
        bearer_token: Optional Bearer token from header
    
    Returns:
        JWT token string
    
    Raises:
        HTTPException: 401 if no token found
    """
    cookie_token = get_token_from_cookie(request)
    
    if cookie_token:
        return cookie_token
    
    if bearer_token:
        return bearer_token
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    token: str = Depends(get_token),
    db: Session = Depends(get_db),
) -> User:
    """
    Get current authenticated user from JWT token.
    
    Args:
        token: JWT token from cookie or header
        db: Database session
    
    Returns:
        Authenticated User instance
    
    Raises:
        HTTPException: 401 if token invalid or user not found
    """
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if not payload:
        raise cred_exc
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise cred_exc

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise cred_exc
    return user


def get_current_admin(
    tenant_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current admin user (company admin or superadmin)"""
    # company admin or superadmin may pass through
    if user.superadmin:
        return user
    membership = (
        db.query(Membership)
        .filter(Membership.tenant_id == tenant_id, Membership.user_id == user.id)
        .first()
    )
    if not membership or membership.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def get_current_tenant_member(
    tenant_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current tenant member (any member or superadmin)"""
    # superadmin can inspect any tenant context
    if user.superadmin:
        return user
    membership = (
        db.query(Membership)
        .filter(Membership.tenant_id == tenant_id, Membership.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Tenant access required")
    return user


def get_current_superadmin(user: User = Depends(get_current_user)):
    """Get current superadmin user"""
    if not user.superadmin:
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return user


def require_permission(permission: str):
    """Dependency factory for requiring specific permissions"""
    def permission_dependency(user: User = Depends(get_current_user)):
        if not check_permission(user, permission):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return permission_dependency
