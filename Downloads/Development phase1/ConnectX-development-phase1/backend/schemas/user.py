# schemas/user.py - User related Pydantic schemas
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from models import RoleEnum


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str
    tenant_id: Optional[str] = None
    role: Optional[RoleEnum] = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[RoleEnum] = None  # for admin changing role
    password: Optional[str] = None  # for admin changing password


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class UserCreateRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: RoleEnum = RoleEnum.MEMBER


class UserOut(BaseModel):
    """
    User output schema - uses str for email to support local domains.
    """
    id: str
    email: str  # Use str instead of EmailStr to allow local domains like .local
    full_name: Optional[str] = None
    created_at: datetime
    role: RoleEnum
    superadmin: bool = False
    auth_provider: str
    google_subject: Optional[str] = None
    tenant_id: Optional[str] = None
    mfa_enabled: bool
    totp_verified: bool = False
    generated_password: Optional[str] = None  # For displaying auto-generated passwords

    model_config = ConfigDict(from_attributes=True)


class GoogleLogin(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    # unique identifier obtained from the OAuth provider
    google_subject: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str  # 6-digit verification code


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class TOTPSetup(BaseModel):
    qr_code: str  # base64 encoded QR code image
    secret: str  # TOTP secret for manual entry


class TOTPVerify(BaseModel):
    token: str  # 6-digit TOTP token


class TOTPLoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_token: Optional[str] = None  # TOTP token if MFA enabled


class ResendInvitationResponse(BaseModel):
    success: bool
    message: str
