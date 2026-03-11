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


class TicketSequence(Base):
    """
    Sequence table for generating serial ticket numbers per tenant.
    Ensures unique, sequential ticket IDs in CX-XXXX format.
    """
    __tablename__ = "ticket_sequences"

    id = Column(String, primary_key=True, default="global")
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, unique=True)
    last_number = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Ticket(Base):
    """
    Support ticket model with workflow status, priority, and module reference.
    
    Supports both manual tickets (created in Support section) and automatic
    tickets (triggered from Integration Library, Lab, Testing, Agentic Monitor).
    """
    __tablename__ = "tickets"

    id = Column(String, primary_key=True)
    ticket_number = Column(String(20), unique=True, nullable=False, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(
        Enum(
            PriorityEnum,
            name="priority_enum",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
            native_enum=False,
            validate_strings=False,
        ),
        default=PriorityEnum.MEDIUM,
        nullable=False,
    )
    status = Column(
        Enum(
            StatusEnum,
            name="status_enum",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
            native_enum=False,
            validate_strings=False,
        ),
        default=StatusEnum.TODO,
        nullable=False,
    )
    module_reference = Column(JSON, nullable=True)
    created_by_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    assigned_to_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Aliases for API compatibility
    @property
    def created_by(self):
        return self.created_by_user_id
    
    @property
    def assigned_to(self):
        return self.assigned_to_user_id
    
    reopened_count = Column(Integer, default=0, nullable=False)
    reopened_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = relationship("User", foreign_keys=[created_by_user_id])
    assignee = relationship("User", foreign_keys=[assigned_to_user_id])
    tenant = relationship("Tenant")
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_tickets_status", "status"),
        Index("ix_tickets_priority", "priority"),
        Index("ix_tickets_assigned_to_user_id", "assigned_to_user_id"),
        Index("ix_tickets_created_by_user_id", "created_by_user_id"),
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
    visibility = Column(
        Enum(
            VisibilityEnum,
            name="visibility_enum",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
            native_enum=False,
            validate_strings=False,
        ),
        default=VisibilityEnum.USER,
        nullable=False,
    )
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    ticket = relationship("Ticket", back_populates="comments")
    author = relationship("User")

    __table_args__ = (
        Index("ix_ticket_comments_ticket_id", "ticket_id"),
    )


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id = Column(String, primary_key=True)
    ticket_id = Column(String, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    ticket = relationship("Ticket", back_populates="attachments")
    uploader = relationship("User", foreign_keys=[uploaded_by_id])

    __table_args__ = (
        Index("ix_ticket_attachments_ticket_id", "ticket_id"),
    )
