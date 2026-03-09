# models/user.py - User related models
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    superadmin = Column(Boolean, default=False)
    auth_provider = Column(String, nullable=False, default="LOCAL")
    google_subject = Column(String, nullable=True, unique=True)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    totp_secret = Column(String, nullable=True)
    totp_verified = Column(Boolean, default=False, nullable=False)

    memberships = relationship("Membership", back_populates="user")


class PasswordReset(Base):
    __tablename__ = "password_resets"

    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
