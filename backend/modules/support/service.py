# modules/support/service.py - Support module service layer
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from fastapi import HTTPException, BackgroundTasks
import uuid
import difflib

from models.ticket import Ticket, TicketComment, TicketAttachment, PriorityEnum, StatusEnum, VisibilityEnum
from models.escalation import EscalationLog
from models.audit import AuditEvent, EmailNotification, EmailStatusEnum
from models import User
from modules.support.schemas import (
    TicketCreate, TicketUpdate, TicketResponse, TicketCreateResponse,
    DuplicateTicketInfo, TicketPreviewRequest, TicketPreviewResponse,
    PreviewData, ValidationError as SchemaValidationError, ModuleEnum
)


class TicketService:
    """Service for ticket CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_ticket(
        self,
        ticket_data: TicketCreate,
        tenant_id: str,
        user_id: str,
        background_tasks: BackgroundTasks
    ) -> TicketCreateResponse:
        """Create ticket with deduplication check, audit logging, email notification"""
        
        # Check for duplicates
        dedup_service = DeduplicationService(self.db)
        existing_ticket = dedup_service.check_duplicate(
            ticket_data=ticket_data,
            tenant_id=tenant_id,
            user_id=user_id
        )
        
        if existing_ticket:
            return TicketCreateResponse(
                is_duplicate=True,
                existing_ticket_id=existing_ticket.id,
                existing_ticket=DuplicateTicketInfo(
                    id=existing_ticket.id,
                    title=existing_ticket.title,
                    status=existing_ticket.status,
                    created_at=existing_ticket.created_at,
                    url=f"/support/tickets/{existing_ticket.id}"
                ),
                message="A ticket already exists for this resource."
            )
        
        # Create new ticket
        ticket = Ticket(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            title=ticket_data.title,
            description=ticket_data.description,
            priority=ticket_data.priority,
            status=StatusEnum.TODO,
            module_reference=ticket_data.module_reference.dict() if ticket_data.module_reference else None,
            created_by=user_id,
            assigned_to=None,
            reopened_count=0,
            reopened_at=None
        )
        
        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)
        
        # Audit log
        audit_service = AuditService(self.db)
        audit_service.log_event(
            entity_type="ticket",
            entity_id=ticket.id,
            action="created",
            actor_id=user_id,
            tenant_id=tenant_id,
            metadata={"title": ticket.title, "priority": ticket.priority.value}
        )
        
        # Send email notification
        notification_service = NotificationService(self.db)
        background_tasks.add_task(
            notification_service.send_ticket_created_email,
            ticket_id=ticket.id,
            tenant_id=tenant_id
        )
        
        return TicketCreateResponse(
            is_duplicate=False,
            ticket_id=ticket.id,
            ticket=TicketResponse.model_validate(ticket),
            message="Ticket created successfully."
        )
    
    def get_tickets(
        self,
        tenant_id: str,
        status: Optional[StatusEnum] = None,
        priority: Optional[PriorityEnum] = None,
        module: Optional[ModuleEnum] = None,
        assigned_to: Optional[str] = None,
        created_by: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Tuple[List[Ticket], int]:
        """List tickets with filters, pagination, tenant scoping"""
        
        query = self.db.query(Ticket).filter(Ticket.tenant_id == tenant_id)
        
        if status:
            query = query.filter(Ticket.status == status)
        if priority:
            query = query.filter(Ticket.priority == priority)
        if assigned_to:
            query = query.filter(Ticket.assigned_to == assigned_to)
        if created_by:
            query = query.filter(Ticket.created_by == created_by)
        if date_from:
            query = query.filter(Ticket.created_at >= date_from)
        if date_to:
            query = query.filter(Ticket.created_at <= date_to)
        if module:
            query = query.filter(Ticket.module_reference['module'].astext == module.value)
        
        total = query.count()
        tickets = query.order_by(Ticket.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        
        return tickets, total
    
    def get_ticket(self, ticket_id: str, tenant_id: str, user_id: str) -> Ticket:
        """Get single ticket with ownership/tenant validation"""
        
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        if ticket.tenant_id != tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return ticket
    
    def update_ticket(
        self,
        ticket_id: str,
        ticket_data: TicketUpdate,
        tenant_id: str,
        user_id: str,
        is_superadmin: bool
    ) -> Ticket:
        """Update ticket with RBAC-enforced field updates"""
        
        ticket = self.get_ticket(ticket_id, tenant_id, user_id)
        
        updated_fields = []
        
        if ticket_data.title is not None:
            ticket.title = ticket_data.title
            updated_fields.append("title")
        
        if ticket_data.description is not None:
            ticket.description = ticket_data.description
            updated_fields.append("description")
        
        if ticket_data.priority is not None:
            if not is_superadmin:
                raise HTTPException(status_code=403, detail="Only Super Admin can change priority")
            ticket.priority = ticket_data.priority
            updated_fields.append("priority")
        
        ticket.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(ticket)
        
        if updated_fields:
            audit_service = AuditService(self.db)
            audit_service.log_event(
                entity_type="ticket",
                entity_id=ticket.id,
                action="updated",
                actor_id=user_id,
                tenant_id=tenant_id,
                metadata={"updated_fields": updated_fields}
            )
        
        return ticket
    
    def assign_ticket(
        self,
        ticket_id: str,
        assignee_id: str,
        tenant_id: str,
        user_id: str,
        background_tasks: BackgroundTasks
    ) -> Ticket:
        """Assign ticket (Super Admin only)"""
        
        ticket = self.get_ticket(ticket_id, tenant_id, user_id)
        
        old_assignee = ticket.assigned_to
        ticket.assigned_to = assignee_id
        ticket.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(ticket)
        
        # Audit log
        audit_service = AuditService(self.db)
        audit_service.log_event(
            entity_type="ticket",
            entity_id=ticket.id,
            action="assigned",
            actor_id=user_id,
            tenant_id=tenant_id,
            metadata={"from": old_assignee, "to": assignee_id}
        )
        
        # Send email
        notification_service = NotificationService(self.db)
        background_tasks.add_task(
            notification_service.send_assignment_email,
            ticket_id=ticket.id,
            assignee_id=assignee_id,
            tenant_id=tenant_id
        )
        
        return ticket
    
    def change_status(
        self,
        ticket_id: str,
        new_status: StatusEnum,
        tenant_id: str,
        user_id: str,
        background_tasks: BackgroundTasks
    ) -> Ticket:
        """Change ticket status (Super Admin only)"""
        
        ticket = self.get_ticket(ticket_id, tenant_id, user_id)
        
        old_status = ticket.status
        ticket.status = new_status
        ticket.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(ticket)
        
        # Audit log
        audit_service = AuditService(self.db)
        audit_service.log_event(
            entity_type="ticket",
            entity_id=ticket.id,
            action="status_changed",
            actor_id=user_id,
            tenant_id=tenant_id,
            metadata={"from": old_status.value, "to": new_status.value}
        )
        
        # Send email
        notification_service = NotificationService(self.db)
        background_tasks.add_task(
            notification_service.send_status_changed_email,
            ticket_id=ticket.id,
            old_status=old_status.value,
            new_status=new_status.value,
            tenant_id=tenant_id
        )
        
        return ticket
    
    def reopen_ticket(
        self,
        ticket_id: str,
        tenant_id: str,
        user_id: str,
        background_tasks: BackgroundTasks
    ) -> Ticket:
        """Reopen ticket (Super Admin only)"""
        
        ticket = self.get_ticket(ticket_id, tenant_id, user_id)
        
        if ticket.status != StatusEnum.CLOSED:
            raise HTTPException(status_code=400, detail="Only closed tickets can be reopened")
        
        ticket.status = StatusEnum.TODO
        ticket.reopened_count += 1
        ticket.reopened_at = datetime.utcnow()
        ticket.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(ticket)
        
        # Audit log
        audit_service = AuditService(self.db)
        audit_service.log_event(
            entity_type="ticket",
            entity_id=ticket.id,
            action="reopened",
            actor_id=user_id,
            tenant_id=tenant_id,
            metadata={"reopened_count": ticket.reopened_count}
        )
        
        # Send email
        notification_service = NotificationService(self.db)
        background_tasks.add_task(
            notification_service.send_reopened_email,
            ticket_id=ticket.id,
            tenant_id=tenant_id
        )
        
        return ticket
    
    def delete_ticket(
        self,
        ticket_id: str,
        tenant_id: str,
        user_id: str
    ) -> None:
        """Delete ticket (Super Admin only) - hard delete with audit"""
        
        ticket = self.get_ticket(ticket_id, tenant_id, user_id)
        
        # Audit log before deletion
        audit_service = AuditService(self.db)
        audit_service.log_event(
            entity_type="ticket",
            entity_id=ticket.id,
            action="deleted",
            actor_id=user_id,
            tenant_id=tenant_id,
            metadata={"title": ticket.title}
        )
        
        self.db.delete(ticket)
        self.db.commit()


class DeduplicationService:
    """Service for duplicate ticket detection"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def check_duplicate(
        self,
        ticket_data: TicketCreate,
        tenant_id: str,
        user_id: str
    ) -> Optional[Ticket]:
        """Check for duplicate tickets"""
        
        # Automatic tickets: exact match on module_reference
        if ticket_data.module_reference:
            return self._check_automatic_duplicate(ticket_data, tenant_id)
        
        # Manual tickets: fuzzy title match
        return self._check_manual_duplicate(ticket_data, tenant_id, user_id)
    
    def _check_automatic_duplicate(
        self,
        ticket_data: TicketCreate,
        tenant_id: str
    ) -> Optional[Ticket]:
        """Check duplicate for automatic tickets"""
        
        module_ref = ticket_data.module_reference
        
        existing = self.db.query(Ticket).filter(
            and_(
                Ticket.tenant_id == tenant_id,
                Ticket.module_reference['module'].astext == module_ref.module.value,
                Ticket.module_reference['resource_type'].astext == module_ref.resource_type,
                Ticket.module_reference['resource_id'].astext == module_ref.resource_id,
                Ticket.status.in_([StatusEnum.TODO, StatusEnum.IN_PROGRESS, StatusEnum.RESOLVED])
            )
        ).first()
        
        return existing
    
    def _check_manual_duplicate(
        self,
        ticket_data: TicketCreate,
        tenant_id: str,
        user_id: str
    ) -> Optional[Ticket]:
        """Check duplicate for manual tickets using fuzzy title match"""
        
        # Get recent tickets by same user (within 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        recent_tickets = self.db.query(Ticket).filter(
            and_(
                Ticket.tenant_id == tenant_id,
                Ticket.created_by == user_id,
                Ticket.created_at >= seven_days_ago,
                Ticket.module_reference.is_(None)
            )
        ).all()
        
        # Fuzzy match on title (85%+ similarity)
        for ticket in recent_tickets:
            similarity = difflib.SequenceMatcher(None, ticket_data.title.lower(), ticket.title.lower()).ratio()
            if similarity >= 0.85:
                return ticket
        
        return None


class TicketPreviewService:
    """Service for ticket preview and validation"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def preview_ticket(self, preview_data: TicketPreviewRequest) -> TicketPreviewResponse:
        """Validate payload and generate formatted preview"""
        
        validation_errors = []
        
        # Validate title
        if len(preview_data.title) < 1:
            validation_errors.append(SchemaValidationError(
                field="title",
                message="Title cannot be empty"
            ))
        
        # Validate description
        if len(preview_data.description) < 1:
            validation_errors.append(SchemaValidationError(
                field="description",
                message="Description cannot be empty"
            ))
        
        if validation_errors:
            return TicketPreviewResponse(
                preview=None,
                validation_errors=validation_errors,
                is_valid=False
            )
        
        # Generate preview
        preview = PreviewData(
            title=preview_data.title,
            module=preview_data.module_reference.module.value if preview_data.module_reference else None,
            priority=preview_data.priority,
            description=preview_data.description,
            metadata=preview_data.metadata,
            attachments=[]
        )
        
        return TicketPreviewResponse(
            preview=preview,
            validation_errors=[],
            is_valid=True
        )


class IntegrationService:
    """Service for module reference validation"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def validate_module_reference(
        self,
        module: ModuleEnum,
        resource_type: str,
        resource_id: str,
        tenant_id: str
    ) -> bool:
        """Check resource exists in source module, prevent cross-tenant leaks"""
        
        # In real implementation, would query the respective module tables
        # For now, return True as placeholder
        return True
    
    def get_module_resource_url(
        self,
        module: ModuleEnum,
        resource_type: str,
        resource_id: str
    ) -> str:
        """Generate frontend URL for module resource"""
        
        url_map = {
            ModuleEnum.INTEGRATION_LIBRARY: f"/integration/{resource_type}/{resource_id}",
            ModuleEnum.LAB: f"/lab/{resource_type}/{resource_id}",
            ModuleEnum.AUTOMATED_TESTING: f"/testing/{resource_type}/{resource_id}",
            ModuleEnum.AGENTIC_MONITOR: f"/monitor/{resource_type}/{resource_id}"
        }
        
        return url_map.get(module, f"/{module.value}/{resource_id}")


class NotificationService:
    """Service for email notifications"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def send_ticket_created_email(self, ticket_id: str, tenant_id: str):
        """Send ticket created email notification"""
        
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        
        creator = self.db.query(User).filter(User.id == ticket.created_by).first()
        if not creator:
            return
        
        email_notification = EmailNotification(
            id=str(uuid.uuid4()),
            ticket_id=ticket.id,
            recipient=creator.email,
            subject=f"Ticket Created: {ticket.title}",
            body=f"Your ticket '{ticket.title}' has been created successfully.\n\nPriority: {ticket.priority.value}\nStatus: {ticket.status.value}\n\nView ticket: /support/tickets/{ticket.id}",
            status=EmailStatusEnum.PENDING
        )
        
        self.db.add(email_notification)
        self.db.commit()
    
    def send_status_changed_email(self, ticket_id: str, old_status: str, new_status: str, tenant_id: str):
        """Send status changed email"""
        
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        
        creator = self.db.query(User).filter(User.id == ticket.created_by).first()
        if not creator:
            return
        
        email_notification = EmailNotification(
            id=str(uuid.uuid4()),
            ticket_id=ticket.id,
            recipient=creator.email,
            subject=f"Ticket Status Changed: {ticket.title}",
            body=f"Ticket status changed from '{old_status}' to '{new_status}'.\n\nView ticket: /support/tickets/{ticket.id}",
            status=EmailStatusEnum.PENDING
        )
        
        self.db.add(email_notification)
        self.db.commit()
    
    def send_assignment_email(self, ticket_id: str, assignee_id: str, tenant_id: str):
        """Send assignment email"""
        
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        assignee = self.db.query(User).filter(User.id == assignee_id).first()
        
        if not ticket or not assignee:
            return
        
        email_notification = EmailNotification(
            id=str(uuid.uuid4()),
            ticket_id=ticket.id,
            recipient=assignee.email,
            subject=f"Ticket Assigned: {ticket.title}",
            body=f"You have been assigned to ticket '{ticket.title}'.\n\nPriority: {ticket.priority.value}\n\nView ticket: /support/tickets/{ticket.id}",
            status=EmailStatusEnum.PENDING
        )
        
        self.db.add(email_notification)
        self.db.commit()
    
    def send_comment_added_email(self, ticket_id: str, comment_id: str, tenant_id: str):
        """Send comment added email"""
        
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        
        creator = self.db.query(User).filter(User.id == ticket.created_by).first()
        if not creator:
            return
        
        email_notification = EmailNotification(
            id=str(uuid.uuid4()),
            ticket_id=ticket.id,
            recipient=creator.email,
            subject=f"New Comment on Ticket: {ticket.title}",
            body=f"A new comment has been added to your ticket '{ticket.title}'.\n\nView ticket: /support/tickets/{ticket.id}",
            status=EmailStatusEnum.PENDING
        )
        
        self.db.add(email_notification)
        self.db.commit()
    
    def send_escalation_email(self, ticket_id: str, escalation_id: str, tenant_id: str):
        """Send escalation email"""
        
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        
        creator = self.db.query(User).filter(User.id == ticket.created_by).first()
        if not creator:
            return
        
        email_notification = EmailNotification(
            id=str(uuid.uuid4()),
            ticket_id=ticket.id,
            recipient=creator.email,
            subject=f"Ticket Escalated: {ticket.title}",
            body=f"Your ticket '{ticket.title}' has been escalated.\n\nNew Priority: {ticket.priority.value}\n\nView ticket: /support/tickets/{ticket.id}",
            status=EmailStatusEnum.PENDING
        )
        
        self.db.add(email_notification)
        self.db.commit()
    
    def send_reopened_email(self, ticket_id: str, tenant_id: str):
        """Send reopened email"""
        
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        
        creator = self.db.query(User).filter(User.id == ticket.created_by).first()
        if not creator:
            return
        
        email_notification = EmailNotification(
            id=str(uuid.uuid4()),
            ticket_id=ticket.id,
            recipient=creator.email,
            subject=f"Ticket Reopened: {ticket.title}",
            body=f"Your ticket '{ticket.title}' has been reopened.\n\nReopened Count: {ticket.reopened_count}\n\nView ticket: /support/tickets/{ticket.id}",
            status=EmailStatusEnum.PENDING
        )
        
        self.db.add(email_notification)
        self.db.commit()


class AuditService:
    """Service for audit logging"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def log_event(
        self,
        entity_type: str,
        entity_id: str,
        action: str,
        actor_id: str,
        tenant_id: str,
        metadata: Optional[Dict] = None
    ):
        """Log audit event"""
        
        audit_event = AuditEvent(
            id=str(uuid.uuid4()),
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_id=actor_id,
            tenant_id=tenant_id,
            event_metadata=metadata
        )
        
        self.db.add(audit_event)
        self.db.commit()
