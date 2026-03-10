# models/tenant.py - Tenant related models
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from models.base import Base, RoleEnum


class Tenant(Base):
    """
    Tenant model for multi-tenant SaaS platform.
    
    Attributes:
        id: UUID primary key
        name: Unique tenant name
        domain: Optional domain for tenant identification
        created_at: Timestamp of creation
    """
    __tablename__ = "tenants"

    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    domain = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("Membership", back_populates="tenant")
    connectors = relationship("Connector", back_populates="tenant")


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(RoleEnum, name="roleenum"), default="MEMBER", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="members")
    user = relationship("User", back_populates="memberships")

    __table_args__ = (
        {"schema": None},  # Add table args if needed
    )
