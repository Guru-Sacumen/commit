# schemas/__init__.py - Shared Pydantic schemas
from .user import (
    Token,
    TokenData,
    UserBase,
    UserCreate,
    UserUpdate,
    UserPasswordUpdate,
    UserCreateRequest,
    UserOut,
    GoogleLogin,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TOTPSetup,
    TOTPVerify,
    TOTPLoginRequest,
)
from .tenant import (
    TenantUpdate,
    CompanyCreate,
    CompanyAdminCreate,
    TenantConnectorCreate,
)
from .connector import (
    ConnectorCatalogCreate,
    ConnectorCatalogUpdate,
    ConnectorRequestCreate,
    ConnectorRequestDecision,
    NotificationOut,
)

# Export all schemas for easy importing
__all__ = [
    "Token",
    "TokenData",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserPasswordUpdate",
    "UserCreateRequest",
    "UserOut",
    "GoogleLogin",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "TOTPSetup",
    "TOTPVerify",
    "TOTPLoginRequest",
    "TenantUpdate",
    "CompanyCreate",
    "CompanyAdminCreate",
    "TenantConnectorCreate",
    "ConnectorCatalogCreate",
    "ConnectorCatalogUpdate",
    "ConnectorRequestCreate",
    "ConnectorRequestDecision",
    "NotificationOut",
]
