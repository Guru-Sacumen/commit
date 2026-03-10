# models/ticket.py - Support module ticket models
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text, Integer, Enum, Index, JSON
from sqlalchemy.orm import relationship
from database import Base


class PriorityEnum(str, PyEnum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class StatusEnum(str, PyEnum):
    TODO = "To Do"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    CLOSED = "Closed"


class VisibilityEnum(str, PyEnum):
    INTERNAL = "internal"
    USER = "user"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    recipient_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    actor_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(Enum(PriorityEnum, name="priority_enum"), default=PriorityEnum.MEDIUM, nullable=False)
    status = Column(Enum(StatusEnum, name="status_enum"), default=StatusEnum.TODO, nullable=False)
    module_reference = Column(JSON, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)
    reopened_count = Column(Integer, default=0, nullable=False)
    reopened_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = relationship("User", foreign_keys=[created_by])
    assignee = relationship("User", foreign_keys=[assigned_to])
    tenant = relationship("Tenant")
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_tickets_status", "status"),
        Index("ix_tickets_priority", "priority"),
        Index("ix_tickets_assigned_to", "assigned_to"),
        Index("ix_tickets_created_by", "created_by"),
        Index("ix_tickets_created_at", "created_at"),
        Index("ix_tickets_reopened_count", "reopened_count"),
        Index("ix_tickets_tenant_id", "tenant_id"),
    )


class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id = Column(String, primary_key=True)
    ticket_id = Column(String, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    visibility = Column(Enum(VisibilityEnum, name="visibility_enum"), default=VisibilityEnum.USER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    ticket = relationship("Ticket", back_populates="comments")
    author = relationship("User")

    __table_args__ = (
        Index("ix_ticket_comments_ticket_id", "ticket_id"),
    )


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id = Column(String, primary_key=True)
    ticket_id = Column(String, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    comment_id = Column(String, ForeignKey("ticket_comments.id", ondelete="SET NULL"), nullable=True)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    ticket = relationship("Ticket", back_populates="attachments")
    uploader = relationship("User")

    __table_args__ = (
        Index("ix_ticket_attachments_ticket_id", "ticket_id"),
    )
