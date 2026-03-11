# auth/router.py - FastAPI router for authentication endpoints
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from auth.dependencies import get_db, get_current_user, get_current_superadmin
from auth.services import AuthService, UserService, TenantService
from auth.mfa_service import MFAService
from auth.forgot_password import ForgotPasswordService
from auth.jwt_handler import (
    set_auth_cookies,
    clear_auth_cookies,
    get_refresh_token_from_cookie,
)
from auth.schemas import (
    LoginRequest,
    LoginResponse,
    RefreshResponse,
    LogoutResponse,
    UserCreateRequest,
    UserResponse,
    TenantOnboardRequest,
    TenantOnboardResponse,
    MFASetupResponse,
    MFAVerifyRequest,
    MFAVerifyResponse,
    ImpersonateRequest,
    ImpersonateResponse,
)
from schemas import ForgotPasswordRequest, VerifyCodeRequest, ResetPasswordRequest
from models import User
from config import settings


router = APIRouter(prefix="/api/v1", tags=["auth"])


@router.post("api/v1/auth/login", response_model=LoginResponse)
def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Authenticate user and set httpOnly cookies with JWT tokens.
    
    Args:
        request: Login credentials (email, password, optional totp_token)
        response: FastAPI Response for setting cookies
        db: Database session
    
    Returns:
        LoginResponse with user info
    
    Raises:
        HTTPException: 401 for invalid credentials, 403 for MFA required
    """
    user = AuthService.authenticate_user(db, request.email, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    if MFAService.is_mfa_required(user):
        if not request.totp_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MFA token required",
                headers={"X-MFA-Required": "true"},
            )
        
        if not MFAService.verify_user_mfa(user, request.totp_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid MFA token",
            )
    
    access_token, refresh_token = AuthService.create_tokens(db, user)
    
    secure_cookies = not settings.debug
    set_auth_cookies(response, access_token, refresh_token, secure=secure_cookies)
    
    role = AuthService.get_user_role(user, db)
    
    return LoginResponse(
        user_id=user.id,
        email=user.email,
        role=role,
        mfa_required=False,
    )


@router.post("/auth/refresh", response_model=RefreshResponse)
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Refresh access token using refresh token from cookie.
    Implements token rotation for security.
    
    Args:
        request: FastAPI Request to read cookies
        response: FastAPI Response to set new cookies
        db: Database session
    
    Returns:
        RefreshResponse on success
    
    Raises:
        HTTPException: 401 if refresh token is invalid or expired
    """
    raw_refresh_token = get_refresh_token_from_cookie(request)
    
    if not raw_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )
    
    result = AuthService.refresh_tokens(db, raw_refresh_token)
    
    if not result:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    new_access_token, new_refresh_token, user = result
    
    secure_cookies = not settings.debug
    set_auth_cookies(response, new_access_token, new_refresh_token, secure=secure_cookies)
    
    return RefreshResponse()


@router.post("/auth/logout", response_model=LogoutResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Logout user by revoking refresh token and clearing cookies.
    
    Args:
        request: FastAPI Request to read cookies
        response: FastAPI Response to clear cookies
        db: Database session
    
    Returns:
        LogoutResponse on success
    """
    raw_refresh_token = get_refresh_token_from_cookie(request)
    
    if raw_refresh_token:
        AuthService.revoke_refresh_token(db, raw_refresh_token)
    
    clear_auth_cookies(response)
    
    return LogoutResponse()


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    request: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new user in the current user's tenant.
    Requires admin or super_admin role.
    
    Args:
        request: User creation data
        db: Database session
        current_user: Authenticated user making the request
    
    Returns:
        Created UserResponse
    
    Raises:
        HTTPException: 403 if not authorized, 400 if email exists
    """
    role = AuthService.get_user_role(current_user, db)
    
    if role not in ["super_admin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create users",
        )
    
    tenant_id = AuthService.get_user_tenant_id(current_user, db)
    
    if not tenant_id and not current_user.superadmin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tenant associated with user",
        )
    
    if current_user.superadmin and not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admin must specify tenant context",
        )
    
    try:
        user = UserService.create_user(
            db=db,
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            tenant_id=tenant_id,
            role=request.role,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=request.role,
        tenant_id=tenant_id,
        mfa_enabled=user.mfa_enabled,
        created_at=user.created_at,
    )


@router.get("/users/me", response_model=UserResponse)
def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get current authenticated user's information.
    
    Args:
        db: Database session
        current_user: Authenticated user
    
    Returns:
        UserResponse with current user data
    """
    role = AuthService.get_user_role(current_user, db)
    tenant_id = AuthService.get_user_tenant_id(current_user, db)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=role,
        tenant_id=tenant_id,
        mfa_enabled=current_user.mfa_enabled,
        created_at=current_user.created_at,
    )


@router.post("/tenants/onboard", response_model=TenantOnboardResponse, status_code=status.HTTP_201_CREATED)
def onboard_tenant(
    request: TenantOnboardRequest,
    db: Session = Depends(get_db),
):
    """
    Onboard a new tenant with first admin user.
    This is a public endpoint for self-service tenant registration.
    
    Args:
        request: Tenant onboarding data
        db: Database session
    
    Returns:
        TenantOnboardResponse with created tenant and admin info
    
    Raises:
        HTTPException: 400 if tenant name or admin email already exists
    """
    try:
        tenant, admin_user = TenantService.onboard_tenant(
            db=db,
            tenant_name=request.tenant_name,
            tenant_domain=request.tenant_domain,
            admin_email=request.admin_email,
            admin_password=request.admin_password,
            admin_full_name=request.admin_full_name,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    return TenantOnboardResponse(
        tenant_id=tenant.id,
        tenant_name=tenant.name,
        admin_user_id=admin_user.id,
        admin_email=admin_user.email,
    )


@router.post("/auth/mfa/setup", response_model=MFASetupResponse)
def setup_mfa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Setup MFA for current user by generating TOTP secret and QR code.
    
    Args:
        db: Database session
        current_user: Authenticated user
    
    Returns:
        MFASetupResponse with QR code and secret
    
    Raises:
        HTTPException: 400 if MFA already set up
    """
    try:
        secret, qr_code = MFAService.setup_mfa(db, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    return MFASetupResponse(
        qr_code=qr_code,
        secret=secret,
    )


@router.post("/auth/mfa/verify", response_model=MFAVerifyResponse)
def verify_mfa(
    request: MFAVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Verify MFA token to complete MFA setup.
    
    Args:
        request: MFA verification request with token
        db: Database session
        current_user: Authenticated user
    
    Returns:
        MFAVerifyResponse indicating success or failure
    
    Raises:
        HTTPException: 400 if MFA not set up
    """
    try:
        verified = MFAService.verify_and_enable_mfa(db, current_user, request.token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    if verified:
        return MFAVerifyResponse(
            message="MFA enabled successfully",
            verified=True,
        )
    else:
        return MFAVerifyResponse(
            message="Invalid MFA token",
            verified=False,
        )


@router.post("/admin/impersonate", response_model=ImpersonateResponse)
def impersonate_user(
    request: ImpersonateRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    """
    Super admin impersonation - generate JWT with impersonated_by field.
    Only accessible by super_admin users.
    
    Args:
        request: Impersonation request with target user_id
        response: FastAPI Response for setting cookies
        db: Database session
        current_user: Authenticated super_admin
    
    Returns:
        ImpersonateResponse with impersonated user info
    
    Raises:
        HTTPException: 403 if not super_admin, 404 if user not found
    """
    target_user = UserService.get_user_by_id(db, request.user_id)
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    if target_user.superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot impersonate another super admin",
        )
    
    access_token, refresh_token = AuthService.create_tokens(
        db=db,
        user=target_user,
        impersonated_by=current_user.id,
    )
    
    secure_cookies = not settings.debug
    set_auth_cookies(response, access_token, refresh_token, secure=secure_cookies)
    
    return ImpersonateResponse(
        impersonated_user_id=target_user.id,
        impersonated_email=target_user.email,
    )


# Forgot Password Endpoints
@router.post("/auth/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Initiate password reset process by sending verification code to user's email.
    
    Args:
        request: ForgotPasswordRequest with email
        db: Database session
    
    Returns:
        Success message
        
    Raises:
        HTTPException: 400 for invalid email format
    """
    try:
        result = ForgotPasswordService.initiate_password_reset(db, request.email)
        return result
    except HTTPException:
        # Re-raise HTTP exceptions as-is (preserves status code and detail)
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/auth/verify-code")
def verify_code(
    request: VerifyCodeRequest,
    db: Session = Depends(get_db),
):
    """
    Verify the 6-digit code sent to user's email.
    
    Args:
        request: VerifyCodeRequest with email and code
        db: Database session
    
    Returns:
        Success message with reset token
        
    Raises:
        HTTPException: 404 if email not found, 400 for invalid/expired code
    """
    try:
        result = ForgotPasswordService.verify_code(db, request.email, request.code)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/auth/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Reset password using verified token.
    
    Args:
        request: ResetPasswordRequest with token and new password
        db: Database session
    
    Returns:
        Success message
        
    Raises:
        HTTPException: 404 for invalid token, 400 for invalid password
    """
    try:
        result = ForgotPasswordService.reset_password(db, request.token, request.new_password)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
