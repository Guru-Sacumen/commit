# models/connector.py - Connector related models
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Enum, Text, Index
from sqlalchemy.orm import relationship
from models.base import Base, ConnectorRequestStatus


class Connector(Base):
    __tablename__ = "connectors"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    type = Column(String, nullable=False)
    logo_url = Column(String, nullable=True)
    external_url = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="connectors")


class ConnectorCatalog(Base):
    __tablename__ = "connector_catalog"

    id = Column(String, primary_key=True)
    connector_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    usecase = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ConnectorCategory(Base):
    __tablename__ = "connector_categories"

    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ConnectorRequest(Base):
    __tablename__ = "connector_requests"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    connector_id = Column(String, nullable=False)
    connector_name = Column(String, nullable=False)
    connector_type = Column(String, nullable=False)
    status = Column(
        Enum(ConnectorRequestStatus, name="connectorrequeststatus"),
        default=ConnectorRequestStatus.PENDING,
        nullable=False,
    )
    requested_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    decided_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    decision_note = Column(String, nullable=True)
    request_comment = Column(String, nullable=True)
    attachment_name = Column(String, nullable=True)
    attachment_url = Column(String, nullable=True)
    granted_access_url = Column(String, nullable=True)
    sla_due_at = Column(DateTime, nullable=True)
    escalation_notified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)
    escalated_at = Column(DateTime, nullable=True)
