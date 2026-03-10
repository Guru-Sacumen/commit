# auth/schemas.py - Pydantic schemas for authentication endpoints
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class LoginRequest(BaseModel):
    """
    Request schema for user login.
    
    Attributes:
        email: User's email address
        password: User's password
        totp_token: Optional TOTP token for MFA
    """
    email: EmailStr
    password: str = Field(..., min_length=8)
    totp_token: Optional[str] = Field(None, pattern=r"^\d{6}$")


class LoginResponse(BaseModel):
    """
    Response schema for successful login.
    
    Attributes:
        message: Success message
        user_id: Authenticated user's ID
        email: User's email
        role: User's role
        mfa_required: Whether MFA verification is needed
    """
    message: str = "Login successful"
    user_id: str
    email: str
    role: str
    mfa_required: bool = False


class RefreshResponse(BaseModel):
    """
    Response schema for token refresh.
    
    Attributes:
        message: Success message
    """
    message: str = "Token refreshed successfully"


class LogoutResponse(BaseModel):
    """
    Response schema for logout.
    
    Attributes:
        message: Success message
    """
    message: str = "Logged out successfully"


class UserCreateRequest(BaseModel):
    """
    Request schema for creating a new user.
    
    Attributes:
        email: User's email address
        password: User's password (min 8 chars)
        full_name: User's display name
        role: User role (admin or user)
    """
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1, max_length=255)
    role: str = Field(default="user", pattern=r"^(admin|user)$")
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        Validate password strength.
        
        Args:
            v: Password string
        
        Returns:
            Validated password
        
        Raises:
            ValueError: If password doesn't meet requirements
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserResponse(BaseModel):
    """
    Response schema for user data.
    
    Attributes:
        id: User's UUID
        email: User's email
        full_name: User's display name
        role: User's role
        tenant_id: Associated tenant ID
        mfa_enabled: Whether MFA is enabled
        created_at: Account creation timestamp
    """
    id: str
    email: str
    full_name: Optional[str]
    role: str
    tenant_id: Optional[str]
    mfa_enabled: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class TenantOnboardRequest(BaseModel):
    """
    Request schema for tenant onboarding.
    
    Attributes:
        tenant_name: Name for the new tenant
        tenant_domain: Optional domain for the tenant
        admin_email: First admin's email
        admin_password: First admin's password
        admin_full_name: First admin's display name
    """
    tenant_name: str = Field(..., min_length=1, max_length=255)
    tenant_domain: Optional[str] = Field(None, max_length=255)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8)
    admin_full_name: str = Field(..., min_length=1, max_length=255)
    
    @field_validator("admin_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        Validate password strength.
        
        Args:
            v: Password string
        
        Returns:
            Validated password
        
        Raises:
            ValueError: If password doesn't meet requirements
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class TenantOnboardResponse(BaseModel):
    """
    Response schema for tenant onboarding.
    
    Attributes:
        message: Success message
        tenant_id: Created tenant's ID
        tenant_name: Created tenant's name
        admin_user_id: Created admin user's ID
        admin_email: Created admin user's email
    """
    message: str = "Tenant onboarded successfully"
    tenant_id: str
    tenant_name: str
    admin_user_id: str
    admin_email: str


class MFASetupResponse(BaseModel):
    """
    Response schema for MFA setup.
    
    Attributes:
        qr_code: Base64 encoded QR code image
        secret: TOTP secret for manual entry
        message: Instructions for user
    """
    qr_code: str
    secret: str
    message: str = "Scan the QR code with your authenticator app"


class MFAVerifyRequest(BaseModel):
    """
    Request schema for MFA verification.
    
    Attributes:
        token: 6-digit TOTP token
    """
    token: str = Field(..., pattern=r"^\d{6}$")


class MFAVerifyResponse(BaseModel):
    """
    Response schema for MFA verification.
    
    Attributes:
        message: Success message
        verified: Whether verification was successful
    """
    message: str
    verified: bool


class ImpersonateRequest(BaseModel):
    """
    Request schema for super admin impersonation.
    
    Attributes:
        user_id: ID of user to impersonate
    """
    user_id: str


class ImpersonateResponse(BaseModel):
    """
    Response schema for impersonation.
    
    Attributes:
        message: Success message
        impersonated_user_id: ID of impersonated user
        impersonated_email: Email of impersonated user
    """
    message: str = "Impersonation successful"
    impersonated_user_id: str
    impersonated_email: str


class ErrorResponse(BaseModel):
    """
    Standard error response schema.
    
    Attributes:
        detail: Error message
        code: Optional error code
    """
    detail: str
    code: Optional[str] = None
