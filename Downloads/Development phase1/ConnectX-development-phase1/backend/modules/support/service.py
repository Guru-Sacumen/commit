# modules/support/service.py - Support module service layer
import logging
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from fastapi import HTTPException, BackgroundTasks
import uuid
import difflib
import smtplib
import os
from email.message import EmailMessage

logger = logging.getLogger(__name__)

from models import (
    Ticket, TicketComment, TicketAttachment, User,
    AuditEvent, EmailNotification, EscalationLog
)
from models.audit import EmailStatusEnum
from models.ticket import TicketSequence
from models.ticket import PriorityEnum as ModelPriorityEnum, StatusEnum as ModelStatusEnum, VisibilityEnum as ModelVisibilityEnum
from modules.support.schemas import (
    TicketCreate, TicketUpdate, TicketResponse, TicketCreateResponse,
    DuplicateTicketInfo, TicketPreviewRequest, TicketPreviewResponse,
    PreviewData, ValidationError as SchemaValidationError, ModuleEnum,
    StatusEnum, PriorityEnum, BoardTicket, BoardColumn, BoardResponse,
    ActivityEvent, ActivityTimelineResponse
)


class TicketService:
    """Service for ticket CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _generate_ticket_number(self, tenant_id: str) -> str:
        """
        Generate the next sequential ticket number for a tenant.
        Format: CX-XXXX (e.g., CX-0001, CX-0002, etc.)
        
        Args:
            tenant_id: The tenant ID
            
        Returns:
            str: The next ticket number in CX-XXXX format
        """
        # Get or create sequence for tenant
        sequence = self.db.query(TicketSequence).filter(
            TicketSequence.tenant_id == tenant_id
        ).with_for_update().first()
        
        if not sequence:
            # Create new sequence starting at 1
            sequence = TicketSequence(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                last_number=0
            )
            self.db.add(sequence)
        
        # Increment and get next number
        sequence.last_number += 1
        next_number = sequence.last_number
        
        # Format as CX-XXXX (zero-padded to 4 digits, but allows more)
        ticket_number = f"CX-{next_number:04d}"
        
        return ticket_number
    
    def create_ticket(
        self,
        ticket_data: TicketCreate,
        tenant_id: str,
        user_id: str,
        background_tasks: BackgroundTasks
    ) -> TicketCreateResponse:
        """Create ticket with deduplication check, audit logging, email notification"""
        
        # Check for duplicates (skip if force_create is True)
        existing_ticket = None
        if not ticket_data.force_create:
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
                    ticket_number=existing_ticket.ticket_number,
                    title=existing_ticket.title,
                    status=existing_ticket.status,
                    created_at=existing_ticket.created_at,
                    url=f"/support/tickets/{existing_ticket.id}"
                ),
                message="A ticket already exists for this resource."
            )
        
        # Generate sequential ticket number
        ticket_number = self._generate_ticket_number(tenant_id)
        
        # Create new ticket
        ticket = Ticket(
            id=str(uuid.uuid4()),
            ticket_number=ticket_number,
            tenant_id=tenant_id,
            title=ticket_data.title,
            description=ticket_data.description,
            priority=ticket_data.priority,
            status=StatusEnum.TODO,
            module_reference=ticket_data.module_reference.dict() if ticket_data.module_reference else None,
            created_by_user_id=user_id,
            assigned_to_user_id=None,
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
        tenant_id: Optional[str] = None,
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
        """
        List tickets with filters, pagination, and tenant scoping.
        
        Args:
            tenant_id: The tenant ID for scoping (None for super admin to see all)
            status: Optional status filter
            priority: Optional priority filter
            module: Optional module filter
            assigned_to: Optional assignee filter
            created_by: Optional creator filter
            date_from: Optional start date filter
            date_to: Optional end date filter
            page: Page number (1-indexed)
            page_size: Number of items per page
            
        Returns:
            Tuple[List[Ticket], int]: List of tickets and total count
        """
        
        query = self.db.query(Ticket)
        
        # Only filter by tenant_id if provided (super admin sees all when None)
        if tenant_id is not None:
            query = query.filter(Ticket.tenant_id == tenant_id)
        
        if status:
            query = query.filter(Ticket.status == status)
        if priority:
            query = query.filter(Ticket.priority == priority)
        if assigned_to:
            query = query.filter(Ticket.assigned_to_user_id == assigned_to)
        if created_by:
            query = query.filter(Ticket.created_by_user_id == created_by)
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
        """
        Get single ticket with ownership/tenant validation.
        
        Args:
            ticket_id: The ticket ID to retrieve
            tenant_id: The tenant ID for validation
            user_id: The requesting user ID
            
        Returns:
            Ticket: The ticket if found and accessible
            
        Raises:
            HTTPException: 404 if not found, 403 if access denied
        """
        
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
        is_superadmin: bool,
        is_admin: bool = False,
        background_tasks: BackgroundTasks = None
    ) -> Ticket:
        """
        Update ticket with RBAC-enforced field updates per PRD 7.5.
        
        RBAC Rules:
        - Super Admin: Can only modify ticket status (not title/description/priority)
        - Admin: Can edit tickets in their tenant (title, description, priority)
        - User: Can only edit their own tickets (title, description, priority)
        
        Args:
            ticket_id: The ticket ID
            ticket_data: Fields to update
            tenant_id: The tenant ID
            user_id: The user making the update
            is_superadmin: Whether user is super admin
            is_admin: Whether user is tenant admin
            background_tasks: For async email notifications
            
        Returns:
            Ticket: The updated ticket
            
        Raises:
            HTTPException: If user doesn't have permission to edit
        """
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # RBAC check for editing per PRD 7.5
        # Super Admin: Can only modify ticket status (not title/description/priority)
        # Admin: Can edit tickets in their tenant (title, description, priority)
        # User: Can only edit their own tickets (title, description, priority)
        can_edit = False
        can_edit_priority = False
        
        if is_superadmin:
            # Super Admin cannot edit title/description/priority
            can_edit = False
            can_edit_priority = False
        elif is_admin and ticket.tenant_id == tenant_id:
            can_edit = True
            can_edit_priority = True  # Admin can change priority per PRD 7.5
        elif str(ticket.created_by_user_id) == str(user_id):
            # Compare as strings to handle potential type mismatches
            can_edit = True
            can_edit_priority = True  # User can change priority per PRD 7.5
        
        if not can_edit:
            raise HTTPException(
                status_code=403, 
                detail="Only Admin and ticket creator can edit ticket details"
            )
        
        updated_fields = []
        old_values = {}
        
        if ticket_data.title is not None:
            old_values["title"] = ticket.title
            ticket.title = ticket_data.title
            updated_fields.append("title")
        
        if ticket_data.description is not None:
            old_values["description"] = ticket.description[:100] if ticket.description else None
            ticket.description = ticket_data.description
            updated_fields.append("description")
        
        if ticket_data.priority is not None:
            if not can_edit_priority:
                raise HTTPException(
                    status_code=403, 
                    detail="You don't have permission to change priority"
                )
            old_values["priority"] = ticket.priority.value if ticket.priority else None
            ticket.priority = ticket_data.priority
            updated_fields.append("priority")
        
        ticket.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(ticket)
        
        if updated_fields:
            # Audit log
            audit_service = AuditService(self.db)
            audit_service.log_event(
                entity_type="ticket",
                entity_id=ticket.id,
                action="updated",
                actor_id=user_id,
                tenant_id=tenant_id,
                metadata={"updated_fields": updated_fields, "old_values": old_values}
            )
            
            # Send email notification to super admins
            if background_tasks:
                notification_service = NotificationService(self.db)
                background_tasks.add_task(
                    notification_service.send_ticket_updated_email,
                    ticket_id=ticket.id,
                    updated_by_id=user_id,
                    updated_fields=updated_fields,
                    tenant_id=tenant_id
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
        """
        Assign ticket to a user (Super Admin only).
        
        Args:
            ticket_id: The ticket ID to assign
            assignee_id: The user ID to assign the ticket to
            tenant_id: The tenant ID
            user_id: The user making the assignment
            background_tasks: For async email notifications
            
        Returns:
            Ticket: The updated ticket
        """
        
        ticket = self.get_ticket(ticket_id, tenant_id, user_id)
        
        old_assignee = ticket.assigned_to_user_id
        ticket.assigned_to_user_id = assignee_id
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
        
        return ticket
    
    def change_status(
        self,
        ticket_id: str,
        new_status: StatusEnum,
        tenant_id: str,
        user_id: str,
        background_tasks: BackgroundTasks
    ) -> Ticket:
        """
        Change ticket status (Super Admin only).
        
        Args:
            ticket_id: The ticket ID
            new_status: The new status to set
            tenant_id: The tenant ID
            user_id: The user making the change
            background_tasks: For async email notifications
            
        Returns:
            Ticket: The updated ticket
        """
        
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
        """
        Reopen a closed ticket (Super Admin only).
        
        Args:
            ticket_id: The ticket ID to reopen
            tenant_id: The tenant ID
            user_id: The user reopening the ticket
            background_tasks: For async email notifications
            
        Returns:
            Ticket: The reopened ticket
            
        Raises:
            HTTPException: 400 if ticket is not closed
        """
        
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
        """
        Delete ticket (Super Admin only) - hard delete with audit.
        
        Args:
            ticket_id: The ticket ID to delete
            tenant_id: The tenant ID
            user_id: The user performing the deletion
        """
        
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
        """
        Check for duplicate tickets based on ticket type.
        
        Args:
            ticket_data: The ticket creation data
            tenant_id: The tenant ID
            user_id: The user ID creating the ticket
            
        Returns:
            Optional[Ticket]: Existing duplicate ticket if found, None otherwise
        """
        
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
        """
        Check duplicate for automatic tickets with module_reference.
        
        Args:
            ticket_data: The ticket creation data with module_reference
            tenant_id: The tenant ID
            
        Returns:
            Optional[Ticket]: Existing duplicate ticket if found, None otherwise
        """
        module_ref = ticket_data.module_reference
        
        existing = self.db.query(Ticket).filter(
            and_(
                Ticket.tenant_id == tenant_id,
                Ticket.module_reference['module'].astext == module_ref.module.value,
                Ticket.module_reference['resource_type'].astext == module_ref.resource_type,
                Ticket.module_reference['resource_id'].astext == module_ref.resource_id,
                Ticket.status.in_([ModelStatusEnum.TODO, ModelStatusEnum.IN_PROGRESS, ModelStatusEnum.RESOLVED])
            )
        ).first()
        
        return existing
    
    def _check_manual_duplicate(
        self,
        ticket_data: TicketCreate,
        tenant_id: str,
        user_id: str
    ) -> Optional[Ticket]:
        """
        Check duplicate for manual tickets using fuzzy title match.
        
        Per PRD 7.4.1:
        - Check for existing open tickets (status: To Do, In Progress, Resolved)
        - Same created_by user
        - Created within last 7 days
        - Similar title (85%+ similarity)
        """
        # Get recent open tickets by same user (within 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        # Use ModelStatusEnum for database queries
        recent_tickets = self.db.query(Ticket).filter(
            and_(
                Ticket.tenant_id == tenant_id,
                Ticket.created_by_user_id == user_id,
                Ticket.created_at >= seven_days_ago,
                Ticket.status.in_([ModelStatusEnum.TODO, ModelStatusEnum.IN_PROGRESS, ModelStatusEnum.RESOLVED])
            )
        ).all()
        
        # Fuzzy match on title (85%+ similarity)
        for ticket in recent_tickets:
            similarity = difflib.SequenceMatcher(
                None, 
                ticket_data.title.lower(), 
                ticket.title.lower()
            ).ratio()
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
    """
    Service for email notifications per PRD 7.10.
    
    Sends emails via SMTP and logs to database for audit trail.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.smtp_host = os.getenv("SMTP_HOST")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_pass = os.getenv("SMTP_PASS")
        self.from_addr = os.getenv("FROM_ADDR", "no-reply@connectx.local")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3001")
    
    def _send_email(self, to: str, subject: str, body: str) -> bool:
        """
        Send email via SMTP.
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body text
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        if not self.smtp_host:
            logger.info(f"[email disabled] to={to} subject={subject}")
            return False
        
        try:
            msg = EmailMessage()
            msg["From"] = self.from_addr
            msg["To"] = to
            msg["Subject"] = f"[ConnectX Support] {subject}"
            msg.set_content(body)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                if self.smtp_user and self.smtp_pass:
                    server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
            
            logger.info(f"[email sent] to={to} subject={subject}")
            return True
        except Exception as e:
            logger.error(f"[email error] to={to} error={str(e)}")
            return False
    
    def _get_super_admins(self) -> List[User]:
        """Get all super admin users for notifications."""
        return self.db.query(User).filter(User.superadmin == True).all()
    
    def _create_and_send_notification(
        self, 
        ticket_id: str, 
        recipient: str, 
        subject: str, 
        body: str
    ):
        """
        Create email notification record and send email.
        
        Args:
            ticket_id: The ticket ID
            recipient: Recipient email
            subject: Email subject
            body: Email body
        """
        # Send the email
        sent = self._send_email(recipient, subject, body)
        
        # Log to database
        email_notification = EmailNotification(
            id=str(uuid.uuid4()),
            ticket_id=ticket_id,
            recipient=recipient,
            subject=subject,
            body=body,
            status=EmailStatusEnum.SENT if sent else EmailStatusEnum.FAILED,
            sent_at=datetime.utcnow() if sent else None
        )
        
        self.db.add(email_notification)
        self.db.commit()
    
    def send_ticket_created_email(self, ticket_id: str, tenant_id: str):
        """
        Send ticket created email notification per PRD 7.10.
        Recipients: Assignee (if any) and Super Admin
        """
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        
        ticket_url = f"{self.frontend_url}/support/tickets/{ticket.id}"
        subject = f"Ticket #{ticket.ticket_number}: {ticket.title}"
        body = f"""A new support ticket has been created.

Ticket: {ticket.ticket_number}
Title: {ticket.title}
Priority: {ticket.priority.value}
Status: {ticket.status.value}

Description:
{ticket.description[:500]}{'...' if len(ticket.description) > 500 else ''}

View ticket: {ticket_url}
"""
        
        # Notify assignee if assigned
        if ticket.assigned_to_user_id:
            assignee = self.db.query(User).filter(User.id == ticket.assigned_to_user_id).first()
            if assignee:
                self._create_and_send_notification(ticket.id, assignee.email, subject, body)
        
        # Notify all super admins
        for admin in self._get_super_admins():
            self._create_and_send_notification(ticket.id, admin.email, subject, body)
    
    def send_status_changed_email(self, ticket_id: str, old_status: str, new_status: str, tenant_id: str):
        """
        Send status changed email per PRD 7.10.
        Recipients: Creator and Assignee
        """
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        
        ticket_url = f"{self.frontend_url}/support/tickets/{ticket.id}"
        subject = f"Ticket #{ticket.ticket_number}: Status Changed"
        body = f"""Ticket status has been changed.

Ticket: {ticket.ticket_number}
Title: {ticket.title}
Status: {old_status} → {new_status}

View ticket: {ticket_url}
"""
        
        # Notify creator
        creator = self.db.query(User).filter(User.id == ticket.created_by).first()
        if creator:
            self._create_and_send_notification(ticket.id, creator.email, subject, body)
        
        # Notify assignee if different from creator
        if ticket.assigned_to_user_id and ticket.assigned_to_user_id != ticket.created_by:
            assignee = self.db.query(User).filter(User.id == ticket.assigned_to_user_id).first()
            if assignee:
                self._create_and_send_notification(ticket.id, assignee.email, subject, body)
    
    def send_assignment_email(self, ticket_id: str, assignee_id: str, tenant_id: str):
        """
        Send assignment email per PRD 7.10.
        Recipients: New Assignee and Super Admin
        """
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        assignee = self.db.query(User).filter(User.id == assignee_id).first()
        
        if not ticket or not assignee:
            return
        
        ticket_url = f"{self.frontend_url}/support/tickets/{ticket.id}"
        subject = f"Ticket #{ticket.ticket_number}: Assigned to You"
        body = f"""You have been assigned to a support ticket.

Ticket: {ticket.ticket_number}
Title: {ticket.title}
Priority: {ticket.priority.value}
Status: {ticket.status.value}

Description:
{ticket.description[:500]}{'...' if len(ticket.description) > 500 else ''}

View ticket: {ticket_url}
"""
        
        # Notify assignee
        self._create_and_send_notification(ticket.id, assignee.email, subject, body)
        
        # Notify super admins
        for admin in self._get_super_admins():
            if admin.id != assignee_id:
                admin_body = f"""Ticket has been assigned.

Ticket: {ticket.ticket_number}
Title: {ticket.title}
Assigned To: {assignee.full_name}

View ticket: {ticket_url}
"""
                self._create_and_send_notification(ticket.id, admin.email, f"Ticket #{ticket.ticket_number}: Assignment Update", admin_body)
    
    def send_comment_added_email(self, ticket_id: str, comment_id: str, tenant_id: str, commenter_id: str = None):
        """
        Send comment added email per PRD 7.10.
        Recipients: Creator, Assignee, and Super Admin
        """
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        
        # Get the comment
        comment = self.db.query(TicketComment).filter(TicketComment.id == comment_id).first()
        comment_preview = comment.body[:200] if comment else "New comment added"
        
        commenter = self.db.query(User).filter(User.id == commenter_id).first() if commenter_id else None
        commenter_name = commenter.full_name if commenter else "Someone"
        
        ticket_url = f"{self.frontend_url}/support/tickets/{ticket.id}"
        subject = f"Ticket #{ticket.ticket_number}: New Comment"
        body = f"""A new comment has been added to the ticket.

Ticket: {ticket.ticket_number}
Title: {ticket.title}
Comment by: {commenter_name}

Comment:
{comment_preview}{'...' if len(comment_preview) >= 200 else ''}

View ticket: {ticket_url}
"""
        
        notified_ids = set()
        
        # Notify creator
        creator = self.db.query(User).filter(User.id == ticket.created_by).first()
        if creator and creator.id != commenter_id:
            self._create_and_send_notification(ticket.id, creator.email, subject, body)
            notified_ids.add(creator.id)
        
        # Notify assignee if different
        if ticket.assigned_to_user_id and ticket.assigned_to_user_id not in notified_ids and ticket.assigned_to_user_id != commenter_id:
            assignee = self.db.query(User).filter(User.id == ticket.assigned_to_user_id).first()
            if assignee:
                self._create_and_send_notification(ticket.id, assignee.email, subject, body)
                notified_ids.add(assignee.id)
        
        # Notify super admins
        for admin in self._get_super_admins():
            if admin.id not in notified_ids and admin.id != commenter_id:
                self._create_and_send_notification(ticket.id, admin.email, subject, body)
    
    def send_ticket_updated_email(
        self, 
        ticket_id: str, 
        updated_by_id: str, 
        updated_fields: list, 
        tenant_id: str
    ):
        """
        Send ticket updated email notification to super admins.
        """
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        
        updated_by = self.db.query(User).filter(User.id == updated_by_id).first()
        updated_by_name = updated_by.full_name if updated_by else "Unknown"
        
        ticket_url = f"{self.frontend_url}/support/tickets/{ticket.id}"
        fields_str = ", ".join(updated_fields)
        subject = f"Ticket #{ticket.ticket_number}: Updated"
        body = f"""Ticket has been updated.

Ticket: {ticket.ticket_number}
Title: {ticket.title}
Updated by: {updated_by_name}
Updated fields: {fields_str}

View ticket: {ticket_url}
"""
        
        # Notify super admins (except the one who made the change)
        for admin in self._get_super_admins():
            if admin.id != updated_by_id:
                self._create_and_send_notification(ticket.id, admin.email, subject, body)
    
    def send_escalation_email(self, ticket_id: str, escalation_id: str, tenant_id: str):
        """
        Send escalation email per PRD 7.10.
        Recipients: New Assignee, Super Admin, and escalation team
        """
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        
        ticket_url = f"{self.frontend_url}/support/tickets/{ticket.id}"
        subject = f"Ticket #{ticket.ticket_number}: ESCALATED"
        body = f"""Ticket has been escalated.

Ticket: {ticket.ticket_number}
Title: {ticket.title}
New Priority: {ticket.priority.value}

View ticket: {ticket_url}
"""
        
        # Notify creator
        creator = self.db.query(User).filter(User.id == ticket.created_by).first()
        if creator:
            self._create_and_send_notification(ticket.id, creator.email, subject, body)
        
        # Notify assignee
        if ticket.assigned_to_user_id:
            assignee = self.db.query(User).filter(User.id == ticket.assigned_to_user_id).first()
            if assignee:
                self._create_and_send_notification(ticket.id, assignee.email, subject, body)
        
        # Notify super admins
        for admin in self._get_super_admins():
            self._create_and_send_notification(ticket.id, admin.email, subject, body)
    
    def send_reopened_email(self, ticket_id: str, tenant_id: str):
        """
        Send reopened email per PRD 7.10.
        Recipients: Creator and Assignee
        """
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        
        ticket_url = f"{self.frontend_url}/support/tickets/{ticket.id}"
        subject = f"Ticket #{ticket.ticket_number}: Reopened"
        body = f"""Ticket has been reopened.

Ticket: {ticket.ticket_number}
Title: {ticket.title}
Reopened Count: {ticket.reopened_count}

View ticket: {ticket_url}
"""
        
        # Notify creator
        creator = self.db.query(User).filter(User.id == ticket.created_by).first()
        if creator:
            self._create_and_send_notification(ticket.id, creator.email, subject, body)
        
        # Notify assignee if different from creator
        if ticket.assigned_to_user_id and ticket.assigned_to_user_id != ticket.created_by:
            assignee = self.db.query(User).filter(User.id == ticket.assigned_to_user_id).first()
            if assignee:
                self._create_and_send_notification(ticket.id, assignee.email, subject, body)


class AuditService:
    """
    Service for audit logging.
    
    Logs all ticket-related events for compliance and tracking.
    """
    
    def __init__(self, db: Session):
        """Initialize AuditService with database session."""
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
        """
        Log an audit event to the database.
        
        Args:
            entity_type: Type of entity (e.g., 'ticket')
            entity_id: ID of the entity
            action: Action performed (e.g., 'created', 'updated')
            actor_id: ID of the user performing the action
            tenant_id: The tenant ID
            metadata: Optional additional event data
        """
        
        audit_event = AuditEvent(
            id=str(uuid.uuid4()),
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_id=actor_id,
            tenant_id=tenant_id,
            event_data=metadata
        )
        
        self.db.add(audit_event)
        self.db.commit()


class BoardService:
    """
    Service for Kanban board operations.
    
    Provides board data grouped by ticket status for drag-and-drop UI.
    """
    
    def __init__(self, db: Session):
        """Initialize BoardService with database session."""
        self.db = db
    
    def get_board_data(
        self,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        is_superadmin: bool = False,
        priority: Optional[str] = None,
        assigned_to: Optional[str] = None,
        module: Optional[str] = None
    ) -> BoardResponse:
        """
        Get Kanban board data grouped by status.
        
        Args:
            tenant_id: Optional tenant ID for filtering
            user_id: Optional user ID for filtering
            is_superadmin: Whether user is super admin (sees all tickets)
            priority: Optional priority filter
            assigned_to: Optional assignee filter
            module: Optional module filter
            
        Returns:
            BoardResponse: Board data with columns and tickets
        """
        
        query = self.db.query(Ticket)
        
        # Apply role-based filtering
        if not is_superadmin:
            if tenant_id:
                query = query.filter(Ticket.tenant_id == tenant_id)
            if user_id:
                query = query.filter(Ticket.created_by_user_id == user_id)
        
        # Apply filters
        if priority:
            query = query.filter(Ticket.priority == priority)
        if assigned_to:
            query = query.filter(Ticket.assigned_to_user_id == assigned_to)
        if module:
            query = query.filter(Ticket.module_reference['module'].astext == module)
        
        tickets = query.all()
        
        # Group by status
        columns = []
        for status in [ModelStatusEnum.TODO, ModelStatusEnum.IN_PROGRESS, ModelStatusEnum.RESOLVED, ModelStatusEnum.CLOSED]:
            status_tickets = [t for t in tickets if t.status == status]
            columns.append(BoardColumn(
                status=StatusEnum(status.value),
                tickets=[BoardTicket(
                    id=t.id,
                    ticket_number=t.ticket_number,
                    title=t.title,
                    priority=PriorityEnum(t.priority.value),
                    assigned_to=t.assigned_to_user_id,
                    created_at=t.created_at,
                    module_reference=t.module_reference
                ) for t in status_tickets],
                count=len(status_tickets)
            ))
        
        return BoardResponse(
            columns=columns,
            total_tickets=len(tickets)
        )


class ActivityService:
    """
    Service for ticket activity timeline.
    
    Retrieves audit events for tickets to display activity history.
    """
    
    def __init__(self, db: Session):
        """Initialize ActivityService with database session."""
        self.db = db
    
    def get_ticket_activity(
        self,
        ticket_id: str,
        page: int = 1,
        page_size: int = 20
    ) -> ActivityTimelineResponse:
        """
        Get activity timeline for a ticket.
        
        Args:
            ticket_id: The ticket ID
            page: Page number (1-indexed)
            page_size: Number of events per page
            
        Returns:
            ActivityTimelineResponse: Paginated activity events
        """
        
        query = self.db.query(AuditEvent).filter(
            AuditEvent.entity_type == "ticket",
            AuditEvent.entity_id == ticket_id
        ).order_by(AuditEvent.created_at.desc())
        
        total = query.count()
        events = query.offset((page - 1) * page_size).limit(page_size).all()
        
        activity_events = []
        for event in events:
            actor = self.db.query(User).filter(User.id == event.actor_id).first()
            activity_events.append(ActivityEvent(
                event_type=event.action,
                actor_name=actor.full_name if actor else "Unknown",
                timestamp=event.created_at,
                description=self._format_description(event)
            ))
        
        return ActivityTimelineResponse(
            events=activity_events,
            total=total
        )
    
    def _format_description(self, event: AuditEvent) -> str:
        """Format event description"""
        descriptions = {
            "created": "created this ticket",
            "updated": "updated this ticket",
            "assigned": "assigned this ticket",
            "status_changed": "changed the status",
            "reopened": "reopened this ticket",
            "escalated": "escalated this ticket",
            "comment_added": "added a comment",
            "attachment_uploaded": "uploaded an attachment",
            "attachment_deleted": "deleted an attachment"
        }
        return descriptions.get(event.action, f"performed action: {event.action}")


class CommentService:
    """
    Service for ticket comments.
    
    Handles CRUD operations for ticket comments with visibility filtering.
    """
    
    def __init__(self, db: Session):
        """Initialize CommentService with database session."""
        self.db = db
    
    def get_comments(
        self,
        ticket_id: str,
        is_superadmin: bool = False,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[TicketComment], int]:
        """
        Get comments for a ticket with visibility filtering.
        
        Args:
            ticket_id: The ticket ID
            is_superadmin: Whether user can see internal comments
            page: Page number (1-indexed)
            page_size: Number of comments per page
            
        Returns:
            Tuple[List[TicketComment], int]: Comments and total count
        """
        
        query = self.db.query(TicketComment).options(
            joinedload(TicketComment.author)
        ).filter(
            TicketComment.ticket_id == ticket_id,
            TicketComment.is_deleted == False
        )
        
        if not is_superadmin:
            query = query.filter(TicketComment.visibility == ModelVisibilityEnum.USER)
        
        # Count without joinedload for efficiency
        count_query = self.db.query(TicketComment).filter(
            TicketComment.ticket_id == ticket_id,
            TicketComment.is_deleted == False
        )
        if not is_superadmin:
            count_query = count_query.filter(TicketComment.visibility == ModelVisibilityEnum.USER)
        total = count_query.count()
        
        comments = query.order_by(TicketComment.created_at.asc()).offset((page - 1) * page_size).limit(page_size).all()
        
        return comments, total
    
    def create_comment(
        self,
        ticket_id: str,
        author_id: str,
        body: str,
        visibility: str
    ) -> TicketComment:
        """
        Create a new comment on a ticket.
        
        Args:
            ticket_id: The ticket ID
            author_id: The comment author's user ID
            body: The comment text
            visibility: Comment visibility ('internal' or 'user')
            
        Returns:
            TicketComment: The created comment
            
        Raises:
            HTTPException: 404 if ticket not found
        """
        
        # Get ticket to retrieve tenant_id
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        comment = TicketComment(
            id=str(uuid.uuid4()),
            ticket_id=ticket_id,
            author_id=author_id,
            body=body,
            visibility=ModelVisibilityEnum(visibility)
        )
        
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        
        # Audit log
        audit_service = AuditService(self.db)
        audit_service.log_event(
            entity_type="ticket",
            entity_id=ticket_id,
            action="comment_added",
            actor_id=author_id,
            tenant_id=ticket.tenant_id,
            metadata={"comment_id": comment.id, "visibility": visibility}
        )
        
        return comment
    
    def update_comment(
        self,
        comment_id: str,
        body: str,
        author_id: str
    ) -> TicketComment:
        """
        Update a comment (author only).
        
        Args:
            comment_id: The comment ID
            body: The new comment text
            author_id: The requesting user ID
            
        Returns:
            TicketComment: The updated comment
            
        Raises:
            HTTPException: 404 if not found, 403 if not author
        """
        
        comment = self.db.query(TicketComment).filter(TicketComment.id == comment_id).first()
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        if comment.author_id != author_id:
            raise HTTPException(status_code=403, detail="Only the author can update this comment")
        
        comment.body = body
        comment.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(comment)
        
        return comment
    
    def delete_comment(
        self,
        comment_id: str,
        actor_id: str,
        is_superadmin: bool = False
    ) -> None:
        """
        Soft delete a comment.
        
        Args:
            comment_id: The comment ID
            actor_id: The requesting user ID
            is_superadmin: Whether user is super admin
            
        Raises:
            HTTPException: 404 if not found, 403 if not authorized
        """
        
        comment = self.db.query(TicketComment).filter(TicketComment.id == comment_id).first()
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        if not is_superadmin and comment.author_id != actor_id:
            raise HTTPException(status_code=403, detail="Only the author or Super Admin can delete this comment")
        
        comment.is_deleted = True
        self.db.commit()


class AttachmentService:
    """
    Service for ticket attachments.
    
    Handles file uploads, downloads, and deletion for ticket attachments.
    Enforces file size and MIME type restrictions.
    """
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_MIME_TYPES = [
        'application/pdf',
        'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
        'text/plain', 'text/csv',
        'application/json', 'application/xml',
        'application/zip', 'application/x-tar',
        'text/x-log'
    ]
    
    def __init__(self, db: Session):
        """Initialize AttachmentService with database session."""
        self.db = db
    
    def get_attachments(self, ticket_id: str) -> List[TicketAttachment]:
        """
        Get all non-deleted attachments for a ticket.
        
        Args:
            ticket_id: The ticket ID
            
        Returns:
            List[TicketAttachment]: List of attachments
        """
        
        return self.db.query(TicketAttachment).options(
            joinedload(TicketAttachment.uploader)
        ).filter(
            TicketAttachment.ticket_id == ticket_id,
            TicketAttachment.is_deleted == False
        ).order_by(TicketAttachment.created_at.desc()).all()
    
    def upload_file(
        self,
        ticket_id: str,
        uploaded_by_id: str,
        filename: str,
        file_content: bytes,
        mime_type: str
    ) -> TicketAttachment:
        """
        Upload a new attachment file.
        
        Args:
            ticket_id: The ticket ID
            uploaded_by_id: The uploader's user ID
            filename: Original filename
            file_content: File content as bytes
            mime_type: MIME type of the file
            
        Returns:
            TicketAttachment: The created attachment record
            
        Raises:
            HTTPException: 400 if file too large or type not allowed, 404 if ticket not found
        """
        import os
        
        file_size = len(file_content)
        
        # Validate file size
        if file_size > self.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        # Validate mime type
        if mime_type not in self.ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"File type {mime_type} not allowed")
        
        # Get ticket for tenant_id
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Generate stored filename and path
        attachment_id = str(uuid.uuid4())
        file_ext = os.path.splitext(filename)[1] if '.' in filename else ''
        stored_filename = f"{attachment_id}{file_ext}"
        
        # Create uploads directory if not exists
        upload_dir = os.path.join("uploads", "attachments", ticket_id)
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, stored_filename)
        
        # Save file to disk
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        attachment = TicketAttachment(
            id=attachment_id,
            ticket_id=ticket_id,
            uploaded_by_id=uploaded_by_id,
            filename=filename,
            stored_filename=stored_filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
            is_deleted=False
        )
        
        self.db.add(attachment)
        self.db.commit()
        self.db.refresh(attachment)
        
        # Audit log
        audit_service = AuditService(self.db)
        audit_service.log_event(
            entity_type="ticket",
            entity_id=ticket_id,
            action="attachment_uploaded",
            actor_id=uploaded_by_id,
            tenant_id=ticket.tenant_id,
            metadata={"attachment_id": attachment.id, "filename": filename}
        )
        
        return attachment
    
    def generate_signed_url(self, attachment_id: str) -> str:
        """
        Generate a download URL for the attachment.
        
        Args:
            attachment_id: The attachment ID
            
        Returns:
            str: The download URL
            
        Raises:
            HTTPException: If attachment not found
        """
        attachment = self.db.query(TicketAttachment).filter(
            TicketAttachment.id == attachment_id,
            TicketAttachment.is_deleted == False
        ).first()
        
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")
        
        # Return the file download endpoint URL
        return f"/api/v1/support/attachments/{attachment_id}/file"
    
    def delete_attachment(
        self,
        attachment_id: str,
        actor_id: str,
        is_superadmin: bool = False
    ) -> None:
        """
        Soft delete an attachment.
        
        Args:
            attachment_id: The attachment ID
            actor_id: The requesting user ID
            is_superadmin: Whether user is super admin
            
        Raises:
            HTTPException: 404 if not found, 403 if not authorized
        """
        
        attachment = self.db.query(TicketAttachment).filter(
            TicketAttachment.id == attachment_id,
            TicketAttachment.is_deleted == False
        ).first()
        
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")
        
        if not is_superadmin and attachment.uploaded_by_id != actor_id:
            raise HTTPException(status_code=403, detail="Only the uploader or Super Admin can delete this attachment")
        
        # Get ticket for tenant_id
        ticket = self.db.query(Ticket).filter(Ticket.id == attachment.ticket_id).first()
        
        # Audit log before deletion
        audit_service = AuditService(self.db)
        audit_service.log_event(
            entity_type="ticket",
            entity_id=attachment.ticket_id,
            action="attachment_deleted",
            actor_id=actor_id,
            tenant_id=ticket.tenant_id if ticket else None,
            metadata={"attachment_id": attachment_id, "filename": attachment.filename}
        )
        
        # Soft delete
        attachment.is_deleted = True
        self.db.commit()


class EscalationService:
    """
    Service for ticket escalations.
    
    Handles ticket escalation with priority and assignee changes.
    """
    
    def __init__(self, db: Session):
        """Initialize EscalationService with database session."""
        self.db = db
    
    def escalate_ticket(
        self,
        ticket_id: str,
        escalated_by_id: str,
        reason: str,
        new_priority: Optional[str] = None,
        new_assignee_id: Optional[str] = None
    ) -> EscalationLog:
        """
        Escalate a ticket with optional priority and assignee changes.
        
        Args:
            ticket_id: The ticket ID to escalate
            escalated_by_id: The user ID performing the escalation
            reason: Reason for escalation
            new_priority: Optional new priority level
            new_assignee_id: Optional new assignee user ID
            
        Returns:
            EscalationLog: The escalation log record
            
        Raises:
            HTTPException: 404 if ticket not found
        """
        
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        old_priority = ticket.priority.value if ticket.priority else None
        old_assignee = ticket.assigned_to_user_id
        
        # Update ticket
        if new_priority:
            ticket.priority = ModelPriorityEnum(new_priority)
        if new_assignee_id:
            ticket.assigned_to_user_id = new_assignee_id
        
        ticket.updated_at = datetime.utcnow()
        
        # Create escalation log
        escalation = EscalationLog(
            id=str(uuid.uuid4()),
            ticket_id=ticket_id,
            from_priority=old_priority,
            to_priority=new_priority or old_priority,
            from_assignee=old_assignee,
            to_assignee=new_assignee_id,
            reason=reason,
            escalated_by=escalated_by_id
        )
        
        self.db.add(escalation)
        self.db.commit()
        self.db.refresh(escalation)
        
        # Audit log
        audit_service = AuditService(self.db)
        audit_service.log_event(
            entity_type="ticket",
            entity_id=ticket_id,
            action="escalated",
            actor_id=escalated_by_id,
            tenant_id=ticket.tenant_id,
            metadata={
                "escalation_id": escalation.id,
                "reason": reason,
                "from_priority": old_priority,
                "to_priority": new_priority
            }
        )
        
        return escalation
    
    def get_escalation_history(self, ticket_id: str) -> List[EscalationLog]:
        """
        Get escalation history for a ticket.
        
        Args:
            ticket_id: The ticket ID
            
        Returns:
            List[EscalationLog]: List of escalation records ordered by date
        """
        
        return self.db.query(EscalationLog).filter(
            EscalationLog.ticket_id == ticket_id
        ).order_by(EscalationLog.created_at.desc()).all()
