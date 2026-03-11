# auth/__init__.py
import secrets
import string
from .dependencies import (
    get_db,
    get_current_user,
    get_current_admin,
    get_current_tenant_member,
    get_current_superadmin,
    get_token,
)
from .jwt_handler import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token,
    set_auth_cookies,
    clear_auth_cookies,
    get_token_from_cookie,
    get_refresh_token_from_cookie,
    hash_refresh_token,
    get_refresh_token_expiry,
)
from .rbac import check_permission
from .services import AuthService, UserService, TenantService
from .mfa_service import MFAService
from .router import router as auth_router

# Password handling functions - use AuthService for new code
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password
    
    Returns:
        Bcrypt hashed password string
    """
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain: Plain text password
        hashed: Bcrypt hashed password
    
    Returns:
        True if password matches
    """
    return pwd_context.verify(plain, hashed)


# User creation functions (moved from original auth.py)
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from models import User, Membership, RoleEnum
from google_authenticator.totp_service import TOTPService


def create_user_with_membership(db: Session, email: str, full_name: str, password: str, tenant_id: str, role: RoleEnum):
    # Check for existing email which would violate the unique constraint.
    existing_user = db.query(User.id).filter(User.email == email).first()
    if existing_user:
        raise ValueError("Email already in use")

    # Generate TOTP secret for admins and members
    totp_secret = None
    mfa_enabled = False
    if role in [RoleEnum.ADMIN, RoleEnum.MEMBER]:
        totp_secret = TOTPService.generate_secret()
        mfa_enabled = True

    # Multiple admins allowed per tenant - removing restriction
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        full_name=full_name,
        password_hash=hash_password(password),
        totp_secret=totp_secret,
        mfa_enabled=mfa_enabled,
    )
    db.add(user)
    db.flush()
    m = Membership(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        user_id=user.id,
        role=role,
    )
    db.add(m)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # handle duplicate email or admin constraint
        if "users_email_key" in str(exc) or "unique constraint" in str(exc).lower():
            raise ValueError("Email already in use") from exc
        # Multiple admins allowed per tenant - removing admin constraint check
        raise
    db.refresh(user)
    return user, m


def create_superadmin(db: Session, email: str, full_name: str, password: str):
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        full_name=full_name,
        password_hash=hash_password(password),
        superadmin=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def generate_secure_password(length: int = 10) -> str:
    """
    Generate a secure random password.
    
    Args:
        length: Password length (default 10)
        
    Returns:
        Secure random password string
    """
    # Ensure at least one character from each required set
    lowercase = secrets.choice(string.ascii_lowercase)
    uppercase = secrets.choice(string.ascii_uppercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice("!@#$%^&*")
    
    # Fill the rest with random characters from all sets
    all_chars = string.ascii_letters + string.digits + "!@#$%^&*"
    remaining_length = length - 4
    random_chars = ''.join(secrets.choice(all_chars) for _ in range(remaining_length))
    
    # Combine and shuffle
    password_chars = list(lowercase + uppercase + digit + special + random_chars)
    secrets.SystemRandom().shuffle(password_chars)
    
    return ''.join(password_chars)
