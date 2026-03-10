# models/audit.py - Audit and email notification models
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, Index, JSON
from sqlalchemy.orm import relationship
from database import Base


class EmailStatusEnum(str, PyEnum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    actor_id = Column(String, ForeignKey("users.id"), nullable=False)
    event_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)

    actor = relationship("User")
    tenant = relationship("Tenant")

    __table_args__ = (
        Index("ix_audit_events_entity_type", "entity_type"),
        Index("ix_audit_events_entity_id", "entity_id"),
        Index("ix_audit_events_action", "action"),
        Index("ix_audit_events_created_at", "created_at"),
        Index("ix_audit_events_tenant_id", "tenant_id"),
    )


class EmailNotification(Base):
    __tablename__ = "email_notifications"

    id = Column(String, primary_key=True)
    ticket_id = Column(String, ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    status = Column(Enum(EmailStatusEnum, name="email_status_enum"), default=EmailStatusEnum.PENDING, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    ticket = relationship("Ticket")

    __table_args__ = (
        Index("ix_email_notifications_ticket_id", "ticket_id"),
        Index("ix_email_notifications_status", "status"),
    )
