# auth/__init__.py
from .dependencies import (
    get_db,
    get_current_user,
    get_current_admin,
    get_current_tenant_member,
    get_current_superadmin,
)
from .jwt_handler import create_access_token
from .rbac import check_permission

# Password handling functions
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
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
