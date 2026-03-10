# models/escalation.py - Escalation log model
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from database import Base


class EscalationLog(Base):
    __tablename__ = "escalation_logs"

    id = Column(String, primary_key=True)
    ticket_id = Column(String, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    from_priority = Column(String, nullable=True)
    to_priority = Column(String, nullable=False)
    from_assignee = Column(String, ForeignKey("users.id"), nullable=True)
    to_assignee = Column(String, ForeignKey("users.id"), nullable=True)
    reason = Column(Text, nullable=False)
    escalated_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    ticket = relationship("Ticket")
    escalator = relationship("User", foreign_keys=[escalated_by])
    from_assignee_user = relationship("User", foreign_keys=[from_assignee])
    to_assignee_user = relationship("User", foreign_keys=[to_assignee])

    __table_args__ = (
        Index("ix_escalation_logs_ticket_id", "ticket_id"),
    )
