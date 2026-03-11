# auth/services.py - Authentication service layer
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext

from models import User, Tenant, Membership, RefreshToken, RoleEnum
from auth.jwt_handler import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    get_refresh_token_expiry,
    decode_token,
)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """
    Authentication service handling user authentication, token management,
    and password operations.
    """
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password using bcrypt.
        
        Args:
            password: Plain text password
        
        Returns:
            Bcrypt hashed password string
        """
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.
        
        Args:
            plain_password: Plain text password to verify
            hashed_password: Stored bcrypt hash
        
        Returns:
            True if password matches, False otherwise
        """
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_user_role(user: User, db: Session) -> str:
        """
        Get the user's role string for JWT payload.
        
        Args:
            user: User model instance
            db: Database session
        
        Returns:
            Role string (super_admin, admin, user)
        """
        if user.superadmin:
            return "super_admin"
        
        membership = db.query(Membership).filter(
            Membership.user_id == user.id
        ).first()
        
        if membership:
            if membership.role == RoleEnum.ADMIN:
                return "admin"
        
        return "user"
    
    @staticmethod
    def get_user_tenant_id(user: User, db: Session) -> Optional[str]:
        """
        Get the user's tenant ID.
        
        Args:
            user: User model instance
            db: Database session
        
        Returns:
            Tenant ID string or None for super_admin
        """
        if user.superadmin:
            return None
        
        if user.tenant_id:
            return user.tenant_id
        
        membership = db.query(Membership).filter(
            Membership.user_id == user.id
        ).first()
        
        return membership.tenant_id if membership else None
    
    @staticmethod
    def authenticate_user(
        db: Session,
        email: str,
        password: str,
    ) -> Optional[User]:
        """
        Authenticate a user by email and password.
        
        Args:
            db: Database session
            email: User's email address
            password: Plain text password
        
        Returns:
            User instance if authenticated, None otherwise
        """
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            return None
        
        if user.auth_provider != "LOCAL":
            return None
        
        if not AuthService.verify_password(password, user.password_hash):
            return None
        
        return user
    
    @staticmethod
    def create_tokens(
        db: Session,
        user: User,
        impersonated_by: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Create access and refresh tokens for a user.
        
        Args:
            db: Database session
            user: User model instance
            impersonated_by: User ID of impersonating super_admin
        
        Returns:
            Tuple of (access_token, raw_refresh_token)
        """
        role = AuthService.get_user_role(user, db)
        tenant_id = AuthService.get_user_tenant_id(user, db)
        
        access_token = create_access_token(
            user_id=user.id,
            tenant_id=tenant_id,
            role=role,
            impersonated_by=impersonated_by,
        )
        
        raw_refresh_token, hashed_refresh_token = create_refresh_token()
        
        refresh_token_record = RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token=hashed_refresh_token,
            expires_at=get_refresh_token_expiry(),
        )
        db.add(refresh_token_record)
        db.commit()
        
        return access_token, raw_refresh_token
    
    @staticmethod
    def refresh_tokens(
        db: Session,
        raw_refresh_token: str,
    ) -> Optional[Tuple[str, str, User]]:
        """
        Refresh access token using refresh token with rotation.
        
        Args:
            db: Database session
            raw_refresh_token: Raw refresh token from client
        
        Returns:
            Tuple of (new_access_token, new_raw_refresh_token, user) or None
        """
        hashed_token = hash_refresh_token(raw_refresh_token)
        
        token_record = db.query(RefreshToken).filter(
            RefreshToken.token == hashed_token,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        ).first()
        
        if not token_record:
            return None
        
        user = db.query(User).filter(User.id == token_record.user_id).first()
        if not user:
            return None
        
        token_record.revoked = True
        
        new_raw_token, new_hashed_token = create_refresh_token()
        
        new_token_record = RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token=new_hashed_token,
            expires_at=get_refresh_token_expiry(),
        )
        
        token_record.replaced_by = new_token_record.id
        
        db.add(new_token_record)
        db.commit()
        
        role = AuthService.get_user_role(user, db)
        tenant_id = AuthService.get_user_tenant_id(user, db)
        
        access_token = create_access_token(
            user_id=user.id,
            tenant_id=tenant_id,
            role=role,
        )
        
        return access_token, new_raw_token, user
    
    @staticmethod
    def revoke_refresh_token(db: Session, raw_refresh_token: str) -> bool:
        """
        Revoke a refresh token (logout).
        
        Args:
            db: Database session
            raw_refresh_token: Raw refresh token from client
        
        Returns:
            True if token was revoked, False if not found
        """
        hashed_token = hash_refresh_token(raw_refresh_token)
        
        token_record = db.query(RefreshToken).filter(
            RefreshToken.token == hashed_token,
        ).first()
        
        if not token_record:
            return False
        
        token_record.revoked = True
        db.commit()
        return True
    
    @staticmethod
    def revoke_all_user_tokens(db: Session, user_id: str) -> int:
        """
        Revoke all refresh tokens for a user.
        
        Args:
            db: Database session
            user_id: User's ID
        
        Returns:
            Number of tokens revoked
        """
        result = db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,
        ).update({"revoked": True})
        
        db.commit()
        return result
    
    @staticmethod
    def cleanup_expired_tokens(db: Session) -> int:
        """
        Remove expired refresh tokens from database.
        
        Args:
            db: Database session
        
        Returns:
            Number of tokens deleted
        """
        result = db.query(RefreshToken).filter(
            RefreshToken.expires_at < datetime.now(timezone.utc),
        ).delete()
        
        db.commit()
        return result


class UserService:
    """
    User management service for creating and managing users.
    """
    
    @staticmethod
    def create_user(
        db: Session,
        email: str,
        password: str,
        full_name: str,
        tenant_id: str,
        role: str = "user",
    ) -> User:
        """
        Create a new user with tenant membership.
        
        Args:
            db: Database session
            email: User's email address
            password: Plain text password
            full_name: User's display name
            tenant_id: Tenant ID to associate user with
            role: User role (admin, user)
        
        Returns:
            Created User instance
        
        Raises:
            ValueError: If email already exists
        """
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise ValueError("Email already in use")
        
        role_enum = RoleEnum.ADMIN if role == "admin" else RoleEnum.MEMBER
        
        user = User(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            email=email,
            password_hash=AuthService.hash_password(password),
            full_name=full_name,
            mfa_enabled=False,
        )
        db.add(user)
        db.flush()
        
        membership = Membership(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            user_id=user.id,
            role=role_enum,
        )
        db.add(membership)
        
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            if "users_email_key" in str(exc) or "unique constraint" in str(exc).lower():
                raise ValueError("Email already in use") from exc
            raise
        
        db.refresh(user)
        return user
    
    @staticmethod
    def create_super_admin(
        db: Session,
        email: str,
        password: str,
        full_name: str,
    ) -> User:
        """
        Create a super admin user (no tenant association).
        
        Args:
            db: Database session
            email: User's email address
            password: Plain text password
            full_name: User's display name
        
        Returns:
            Created User instance
        
        Raises:
            ValueError: If email already exists
        """
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise ValueError("Email already in use")
        
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=AuthService.hash_password(password),
            full_name=full_name,
            superadmin=True,
            mfa_enabled=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        """
        Get a user by their ID.
        
        Args:
            db: Database session
            user_id: User's ID
        
        Returns:
            User instance or None
        """
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """
        Get a user by their email.
        
        Args:
            db: Database session
            email: User's email address
        
        Returns:
            User instance or None
        """
        return db.query(User).filter(User.email == email).first()


class TenantService:
    """
    Tenant management service for onboarding and managing tenants.
    """
    
    @staticmethod
    def create_tenant(
        db: Session,
        name: str,
        domain: Optional[str] = None,
    ) -> Tenant:
        """
        Create a new tenant.
        
        Args:
            db: Database session
            name: Tenant name
            domain: Optional tenant domain
        
        Returns:
            Created Tenant instance
        
        Raises:
            ValueError: If tenant name or domain already exists
        """
        existing = db.query(Tenant).filter(Tenant.name == name).first()
        if existing:
            raise ValueError("Tenant name already exists")
        
        if domain:
            existing_domain = db.query(Tenant).filter(Tenant.domain == domain).first()
            if existing_domain:
                raise ValueError("Domain already in use")
        
        tenant = Tenant(
            id=str(uuid.uuid4()),
            name=name,
            domain=domain,
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        return tenant
    
    @staticmethod
    def onboard_tenant(
        db: Session,
        tenant_name: str,
        tenant_domain: Optional[str],
        admin_email: str,
        admin_password: str,
        admin_full_name: str,
    ) -> Tuple[Tenant, User]:
        """
        Onboard a new tenant with first admin user.
        
        Args:
            db: Database session
            tenant_name: Name for the new tenant
            tenant_domain: Optional domain for the tenant
            admin_email: Admin user's email
            admin_password: Admin user's password
            admin_full_name: Admin user's display name
        
        Returns:
            Tuple of (Tenant, User) instances
        
        Raises:
            ValueError: If tenant or user creation fails
        """
        tenant = TenantService.create_tenant(db, tenant_name, tenant_domain)
        
        try:
            admin_user = UserService.create_user(
                db=db,
                email=admin_email,
                password=admin_password,
                full_name=admin_full_name,
                tenant_id=tenant.id,
                role="admin",
            )
        except ValueError:
            db.rollback()
            raise
        
        return tenant, admin_user
    
    @staticmethod
    def get_tenant_by_id(db: Session, tenant_id: str) -> Optional[Tenant]:
        """
        Get a tenant by ID.
        
        Args:
            db: Database session
            tenant_id: Tenant's ID
        
        Returns:
            Tenant instance or None
        """
        return db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    @staticmethod
    def get_tenant_by_domain(db: Session, domain: str) -> Optional[Tenant]:
        """
        Get a tenant by domain.
        
        Args:
            db: Database session
            domain: Tenant's domain
        
        Returns:
            Tenant instance or None
        """
        return db.query(Tenant).filter(Tenant.domain == domain).first()
