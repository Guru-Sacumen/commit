# models/user.py - User related models
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Enum, Index
from sqlalchemy.orm import relationship
from models.base import Base


class User(Base):
    """
    User model for multi-tenant SaaS platform.
    
    Attributes:
        id: UUID primary key
        tenant_id: Foreign key to tenant (nullable for super_admin)
        email: Unique email address
        password_hash: Bcrypt hashed password
        full_name: User's display name
        role: User role (super_admin, admin, user)
        mfa_enabled: Whether MFA is enabled
        mfa_secret: TOTP secret for MFA
        created_at: Timestamp of creation
    """
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    superadmin = Column(Boolean, default=False)
    auth_provider = Column(String, nullable=False, default="LOCAL")
    google_subject = Column(String, nullable=True, unique=True)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    mfa_secret = Column(String, nullable=True)
    totp_secret = Column(String, nullable=True)
    totp_verified = Column(Boolean, default=False, nullable=False)

    memberships = relationship("Membership", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    tenant = relationship("Tenant", foreign_keys=[tenant_id])


class PasswordReset(Base):
    """
    Password reset token model.
    
    Attributes:
        token: Unique reset token (primary key)
        user_id: Foreign key to user
        created_at: Timestamp of creation
    """
    __tablename__ = "password_resets"

    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class RefreshToken(Base):
    """
    Refresh token model for JWT token rotation.
    
    Attributes:
        id: UUID primary key
        user_id: Foreign key to user
        token: Hashed refresh token
        expires_at: Token expiration timestamp
        created_at: Timestamp of creation
        revoked: Whether token has been revoked
        replaced_by: Token that replaced this one (for rotation tracking)
    """
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    revoked = Column(Boolean, default=False, nullable=False)
    replaced_by = Column(String, nullable=True)

    user = relationship("User", back_populates="refresh_tokens")

    __table_args__ = (
        Index("ix_refresh_tokens_user_id", "user_id"),
        Index("ix_refresh_tokens_expires_at", "expires_at"),
    )
