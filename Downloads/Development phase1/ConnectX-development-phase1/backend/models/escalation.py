# models/escalation.py - Escalation log model
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from database import Base


class EscalationLog(Base):
    __tablename__ = "escalation_logs"

    id = Column(String, primary_key=True)
    ticket_id = Column(String, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    escalated_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    old_priority = Column(String, nullable=True)
    new_priority = Column(String, nullable=True)
    old_assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
    new_assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    ticket = relationship("Ticket")
    escalator = relationship("User", foreign_keys=[escalated_by_id])
    old_assignee_user = relationship("User", foreign_keys=[old_assignee_id])
    new_assignee_user = relationship("User", foreign_keys=[new_assignee_id])

    __table_args__ = (
        Index("ix_escalation_logs_ticket_id", "ticket_id"),
    )
