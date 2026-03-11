# modules/support/router.py - Support module router
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
import os

from auth import get_current_user, get_db, get_current_superadmin
from models import User, Notification, Tenant, Ticket, Membership, RoleEnum, TicketComment, TicketAttachment
from schemas import NotificationOut
from modules.support.service import (
    BoardService, ActivityService, CommentService, 
    AttachmentService, EscalationService, TicketService, TicketPreviewService
)
from modules.support.schemas import (
    BoardResponse, StatusUpdateRequest, StatusUpdateResponse,
    ActivityTimelineResponse, StatusEnum, PriorityEnum, ModuleEnum,
    CommentCreate, CommentUpdate, CommentResponse, CommentListResponse,
    AttachmentResponse, AttachmentUpload, AttachmentListResponse, AttachmentUploadResponse, SignedUrlResponse,
    EscalationCreate, EscalationResponse, EscalationHistoryResponse,
    TicketCreate, TicketUpdate, TicketResponse, TicketCreateResponse, TicketListResponse,
    TicketPreviewRequest, TicketPreviewResponse
)


router = APIRouter(prefix="/support", tags=["support"])


def _ticket_to_response(ticket: Ticket) -> TicketResponse:
    """
    Convert Ticket model to TicketResponse with creator and assignee names.
    
    Args:
        ticket: Ticket model instance with relationships loaded
        
    Returns:
        TicketResponse: Response schema with all display fields
    """
    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        tenant_id=ticket.tenant_id,
        title=ticket.title,
        description=ticket.description,
        priority=ticket.priority,
        status=ticket.status,
        module_reference=ticket.module_reference,
        created_by=ticket.created_by_user_id,
        created_by_user_id=ticket.created_by_user_id,
        created_by_name=ticket.creator.full_name if ticket.creator else None,
        assigned_to=ticket.assigned_to_user_id,
        assigned_to_user_id=ticket.assigned_to_user_id,
        assigned_to_name=ticket.assignee.full_name if ticket.assignee else None,
        reopened_count=ticket.reopened_count,
        reopened_at=ticket.reopened_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at
    )


@router.get("/health", response_model=dict)
def support_health():
    """Support module health check"""
    return {"ok": True, "module": "support"}


@router.get("/notifications", response_model=list[NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get user notifications"""
    notifications = (
        db.query(Notification)
        .filter(Notification.recipient_user_id == user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [NotificationOut(
        id=n.id,
        tenant_id=n.tenant_id,
        recipient_user_id=n.recipient_user_id,
        actor_user_id=n.actor_user_id,
        title=n.title,
        message=n.message,
        entity_type=n.entity_type,
        entity_id=n.entity_id,
        is_read=n.is_read,
        created_at=n.created_at
    ) for n in notifications]


@router.patch("/notifications/{notification_id}/read", response_model=dict)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Mark notification as read"""
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.recipient_user_id == user.id
        )
        .first()
    )
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    db.commit()
    return {"ok": True}


@router.patch("/notifications/read-all", response_model=dict)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Mark all notifications as read"""
    (
        db.query(Notification)
        .filter(
            Notification.recipient_user_id == user.id,
            Notification.is_read == False
        )
        .update({"is_read": True})
    )
    db.commit()
    return {"ok": True}


@router.delete("/notifications/{notification_id}", response_model=dict)
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete notification"""
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.recipient_user_id == user.id
        )
        .first()
    )
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    return {"ok": True}


@router.get("/assignees", response_model=list)
def get_assignable_users(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get list of users who can be assigned to tickets (Super Admin only).
    
    Returns all super admin users who can handle support tickets.
    
    Args:
        db: Database session
        user: Current authenticated user
        
    Returns:
        List of assignable users with id, full_name, and email
    """
    if not user.superadmin:
        raise HTTPException(status_code=403, detail="Superadmin access required")
    
    # Get all super admin users who can be assigned to tickets
    assignable_users = db.query(User).filter(User.superadmin == True).all()
    
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email
        }
        for u in assignable_users
    ]


@router.get("/stats", response_model=dict)
def get_support_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get support statistics"""
    if not user.superadmin:
        raise HTTPException(status_code=403, detail="Superadmin access required")
    
    total_users = db.query(User).count()
    total_tenants = db.query(Tenant).count()
    total_notifications = db.query(Notification).count()
    unread_notifications = db.query(Notification).filter(Notification.is_read == False).count()
    
    return {
        "total_users": total_users,
        "total_tenants": total_tenants,
        "total_notifications": total_notifications,
        "unread_notifications": unread_notifications,
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# TICKET CRUD ENDPOINTS (Session 4)
# ============================================================================

@router.post("/tickets", response_model=TicketCreateResponse)
def create_ticket(
    ticket_data: TicketCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Create a new support ticket (manual creation).
    
    - User/Admin can create tickets
    - Deduplication check performed
    - Audit event logged
    - Email notification sent asynchronously
    """
    # Get tenant_id from user's membership
    membership = db.query(Membership).filter(
        Membership.user_id == user.id
    ).first()
    
    if not membership and not user.superadmin:
        raise HTTPException(
            status_code=403,
            detail="User must belong to a tenant to create tickets"
        )
    
    tenant_id = membership.tenant_id if membership else None
    
    # Super admin creating ticket needs a tenant context
    if user.superadmin and not tenant_id:
        raise HTTPException(
            status_code=400,
            detail="Super Admin must specify tenant context for ticket creation"
        )
    
    ticket_service = TicketService(db)
    return ticket_service.create_ticket(
        ticket_data=ticket_data,
        tenant_id=tenant_id,
        user_id=user.id,
        background_tasks=background_tasks
    )


@router.post("/tickets/from-module", response_model=TicketCreateResponse)
def create_ticket_from_module(
    ticket_data: TicketCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Create a ticket from another module (automatic creation).
    
    - Requires module_reference in ticket_data
    - Deduplication based on module_reference
    - Used by Integration Library, Lab, Automated Testing, Agentic Monitor
    """
    if not ticket_data.module_reference:
        raise HTTPException(
            status_code=400,
            detail="module_reference is required for automatic ticket creation"
        )
    
    # Get tenant_id from user's membership
    membership = db.query(Membership).filter(
        Membership.user_id == user.id
    ).first()
    
    if not membership and not user.superadmin:
        raise HTTPException(
            status_code=403,
            detail="User must belong to a tenant to create tickets"
        )
    
    tenant_id = membership.tenant_id if membership else None
    
    if user.superadmin and not tenant_id:
        raise HTTPException(
            status_code=400,
            detail="Super Admin must specify tenant context for ticket creation"
        )
    
    ticket_service = TicketService(db)
    return ticket_service.create_ticket(
        ticket_data=ticket_data,
        tenant_id=tenant_id,
        user_id=user.id,
        background_tasks=background_tasks
    )


@router.post("/tickets/preview", response_model=TicketPreviewResponse)
def preview_ticket(
    preview_data: TicketPreviewRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Validate and preview ticket before creation.
    
    - Returns formatted preview data
    - Lists validation errors if any
    - Does not create the ticket
    """
    preview_service = TicketPreviewService(db)
    return preview_service.preview_ticket(preview_data)


@router.get("/tickets/board", response_model=BoardResponse)
def get_board_data(
    priority: Optional[str] = Query(None, description="Filter by priority"),
    assigned_to: Optional[str] = Query(None, description="Filter by assignee ID"),
    module: Optional[str] = Query(None, description="Filter by source module"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get Kanban board data with tickets grouped by status.
    
    Returns tickets organized into columns (To Do, In Progress, Resolved, Closed).
    Access is role-based:
    - Super Admin: All tickets across all tenants
    - Admin: All tickets within their tenant
    - User: Only tickets they created
    """
    board_service = BoardService(db)
    
    # Determine role-based access
    is_superadmin = user.superadmin
    tenant_id = None
    user_id = None
    
    if not is_superadmin:
        membership = db.query(Membership).filter(
            Membership.user_id == user.id
        ).first()
        
        if membership:
            if membership.role == RoleEnum.ADMIN:
                tenant_id = membership.tenant_id
            else:
                user_id = user.id
        else:
            user_id = user.id
    
    return board_service.get_board_data(
        tenant_id=tenant_id,
        user_id=user_id,
        is_superadmin=is_superadmin,
        priority=priority,
        assigned_to=assigned_to,
        module=module
    )


@router.get("/tickets", response_model=TicketListResponse)
def list_tickets(
    status: Optional[StatusEnum] = Query(None, description="Filter by status"),
    priority: Optional[PriorityEnum] = Query(None, description="Filter by priority"),
    module: Optional[ModuleEnum] = Query(None, description="Filter by source module"),
    assigned_to: Optional[str] = Query(None, description="Filter by assignee ID"),
    created_by: Optional[str] = Query(None, description="Filter by creator ID"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    List tickets with filters and pagination.
    
    Access is role-based:
    - Super Admin: All tickets across all tenants
    - Admin: All tickets within their tenant
    - User: Only tickets they created
    """
    # Determine tenant scoping based on role
    membership = db.query(Membership).filter(
        Membership.user_id == user.id
    ).first()
    
    tenant_id = None
    creator_filter = None
    
    if user.superadmin:
        # Super admin sees all tickets
        pass
    elif membership:
        tenant_id = membership.tenant_id
        if membership.role != RoleEnum.ADMIN:
            # Regular user only sees own tickets
            creator_filter = user.id
    else:
        # No membership - only see own tickets
        creator_filter = user.id
    
    ticket_service = TicketService(db)
    tickets, total = ticket_service.get_tickets(
        tenant_id=tenant_id,
        status=status,
        priority=priority,
        module=module,
        assigned_to=assigned_to,
        created_by=created_by or creator_filter,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size
    )
    
    return TicketListResponse(
        tickets=[_ticket_to_response(t) for t in tickets],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get single ticket detail.
    
    Access is role-based:
    - Super Admin: Any ticket
    - Admin: Tickets in their tenant
    - User: Only tickets they created
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access permissions
    _check_ticket_access(db, user, ticket)
    
    return _ticket_to_response(ticket)


@router.patch("/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: str,
    ticket_data: TicketUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update ticket fields with RBAC enforcement.
    
    - Super Admin: Can edit any ticket including priority
    - Admin: Can edit tickets in their tenant (except priority)
    - User: Can only edit their own tickets (title/description only)
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Get membership and determine role
    membership = db.query(Membership).filter(
        Membership.user_id == user.id
    ).first()
    
    tenant_id = membership.tenant_id if membership else ticket.tenant_id
    is_admin = membership.role == RoleEnum.ADMIN if membership else False
    
    ticket_service = TicketService(db)
    updated_ticket = ticket_service.update_ticket(
        ticket_id=ticket_id,
        ticket_data=ticket_data,
        tenant_id=tenant_id,
        user_id=user.id,
        is_superadmin=user.superadmin,
        is_admin=is_admin,
        background_tasks=background_tasks
    )
    
    return _ticket_to_response(updated_ticket)


@router.post("/tickets/{ticket_id}/assign", response_model=TicketResponse)
def assign_ticket(
    ticket_id: str,
    assignee_id: str = Query(..., description="User ID to assign ticket to"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Assign ticket to a user (Super Admin only).
    
    - Creates audit event
    - Sends email notification to assignee
    """
    if not user.superadmin:
        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can assign tickets"
        )
    
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Verify assignee exists
    assignee = db.query(User).filter(User.id == assignee_id).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee user not found")
    
    ticket_service = TicketService(db)
    updated_ticket = ticket_service.assign_ticket(
        ticket_id=ticket_id,
        assignee_id=assignee_id,
        tenant_id=ticket.tenant_id,
        user_id=user.id,
        background_tasks=background_tasks
    )
    
    return _ticket_to_response(updated_ticket)


@router.post("/tickets/{ticket_id}/status", response_model=TicketResponse)
def change_ticket_status(
    ticket_id: str,
    new_status: StatusEnum = Query(..., description="New status"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Change ticket status (Super Admin only).
    
    - Creates audit event
    - Sends email notification
    """
    if not user.superadmin:
        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can change ticket status"
        )
    
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket_service = TicketService(db)
    updated_ticket = ticket_service.change_status(
        ticket_id=ticket_id,
        new_status=new_status,
        tenant_id=ticket.tenant_id,
        user_id=user.id,
        background_tasks=background_tasks
    )
    
    return _ticket_to_response(updated_ticket)


@router.post("/tickets/{ticket_id}/reopen", response_model=TicketResponse)
def reopen_ticket(
    ticket_id: str,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Reopen a closed ticket (Super Admin only).
    
    - Only closed tickets can be reopened
    - Increments reopened_count
    - Creates audit event
    - Sends email notification
    """
    if not user.superadmin:
        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can reopen tickets"
        )
    
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket_service = TicketService(db)
    updated_ticket = ticket_service.reopen_ticket(
        ticket_id=ticket_id,
        tenant_id=ticket.tenant_id,
        user_id=user.id,
        background_tasks=background_tasks
    )
    
    return _ticket_to_response(updated_ticket)


@router.post("/tickets/{ticket_id}/escalate", response_model=EscalationResponse)
def escalate_ticket_endpoint(
    ticket_id: str,
    escalation_data: EscalationCreate,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Escalate a ticket (Admin or Super Admin).
    
    - Changes priority and/or assignee
    - Creates escalation log
    - Creates audit event
    - Sends email notification
    """
    # Check if user is Admin or Super Admin
    membership = db.query(Membership).filter(
        Membership.user_id == user.id
    ).first()
    
    is_admin = membership and membership.role == RoleEnum.ADMIN
    
    if not user.superadmin and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only Admin or Super Admin can escalate tickets"
        )
    
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Admin can only escalate tickets in their tenant
    if is_admin and not user.superadmin:
        if ticket.tenant_id != membership.tenant_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Ticket belongs to different tenant"
            )
    
    escalation_service = EscalationService(db)
    escalation = escalation_service.escalate_ticket(
        ticket_id=ticket_id,
        escalated_by_id=user.id,
        reason=escalation_data.reason,
        new_priority=escalation_data.to_priority.value if escalation_data.to_priority else None,
        new_assignee_id=escalation_data.to_assignee
    )
    
    return EscalationResponse(
        id=escalation.id,
        ticket_id=escalation.ticket_id,
        from_priority=escalation.old_priority,
        to_priority=escalation.new_priority or ticket.priority,
        from_assignee=escalation.old_assignee_id,
        to_assignee=escalation.new_assignee_id,
        reason=escalation.reason,
        escalated_by=escalation.escalated_by_id,
        created_at=escalation.created_at
    )


@router.delete("/tickets/{ticket_id}", response_model=dict)
def delete_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Delete a ticket (Super Admin only).
    
    - Hard delete with audit logging
    """
    if not user.superadmin:
        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can delete tickets"
        )
    
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket_service = TicketService(db)
    ticket_service.delete_ticket(
        ticket_id=ticket_id,
        tenant_id=ticket.tenant_id,
        user_id=user.id
    )
    
    return {"ok": True, "message": "Ticket deleted successfully"}


@router.patch("/tickets/{ticket_id}/status", response_model=StatusUpdateResponse)
def update_ticket_status(
    ticket_id: str,
    request: StatusUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update ticket status via drag-and-drop.
    
    Only Super Admin can change ticket status.
    Creates an audit event for the status change.
    """
    # Only Super Admin can change status
    if not user.superadmin:
        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can change ticket status"
        )
    
    board_service = BoardService(db)
    
    try:
        result = board_service.update_ticket_status_via_drag(
            ticket_id=ticket_id,
            new_status=request.new_status.value,
            actor_id=user.id
        )
        return StatusUpdateResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tickets/{ticket_id}/activity", response_model=ActivityTimelineResponse)
def get_ticket_activity(
    ticket_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get activity timeline for a ticket.
    
    Returns chronological list of audit events (status changes, assignments,
    comments, attachments, etc.) for the specified ticket.
    
    Access is role-based:
    - Super Admin: Can view activity for any ticket
    - Admin: Can view activity for tickets in their tenant
    - User: Can view activity for tickets they created
    """
    # Verify ticket exists and user has access
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access permissions
    if not user.superadmin:
        membership = db.query(Membership).filter(
            Membership.user_id == user.id
        ).first()
        
        if membership:
            if membership.role == RoleEnum.ADMIN:
                # Admin can only access tickets in their tenant
                if ticket.tenant_id != membership.tenant_id:
                    raise HTTPException(
                        status_code=403,
                        detail="Access denied: Ticket belongs to different tenant"
                    )
            else:
                # User can only access their own tickets
                if ticket.created_by_user_id != user.id:
                    raise HTTPException(
                        status_code=403,
                        detail="Access denied: You can only view your own tickets"
                    )
        else:
            # No membership - can only access own tickets
            if ticket.created_by_user_id != user.id:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied: You can only view your own tickets"
                )
    
    activity_service = ActivityService(db)
    return activity_service.get_ticket_activity(
        ticket_id=ticket_id,
        page=page,
        page_size=page_size
    )


# ============================================================================
# COMMENT ENDPOINTS
# ============================================================================

@router.get("/tickets/{ticket_id}/comments", response_model=CommentListResponse)
def get_ticket_comments(
    ticket_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get comments for a ticket.
    
    Internal comments are only visible to Super Admin.
    """
    # Verify ticket exists and user has access
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access permissions
    _check_ticket_access(db, user, ticket)
    
    comment_service = CommentService(db)
    comments, total = comment_service.get_comments(
        ticket_id=ticket_id,
        is_superadmin=user.superadmin,
        page=page,
        page_size=page_size
    )
    
    # Format response
    comment_responses = [
        CommentResponse(
            id=c.id,
            ticket_id=c.ticket_id,
            author_id=c.author_id,
            author_name=c.author.full_name if c.author else "Unknown",
            author_avatar=None,
            body=c.body,
            visibility=c.visibility,
            is_deleted=c.is_deleted,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in comments
    ]
    
    # Calculate pagination info
    total_pages = (total + page_size - 1) // page_size
    has_more = page < total_pages
    
    return CommentListResponse(
        ticket_id=ticket_id,
        comments=comment_responses,
        total_count=total,
        page=page,
        page_size=page_size,
        has_more=has_more
    )


@router.post("/tickets/{ticket_id}/comments", response_model=CommentResponse)
def create_comment(
    ticket_id: str,
    request: CommentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Add a comment to a ticket.
    
    Internal comments can only be created by Super Admin.
    Sends email notifications per PRD 7.10.
    """
    # Verify ticket exists and user has access
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    _check_ticket_access(db, user, ticket)
    
    # Only Super Admin can create internal comments
    if request.visibility.value == "internal" and not user.superadmin:
        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can create internal comments"
        )
    
    comment_service = CommentService(db)
    
    try:
        comment = comment_service.create_comment(
            ticket_id=ticket_id,
            author_id=user.id,
            body=request.body,
            visibility=request.visibility.value
        )
        
        # Send email notification (only for user-visible comments)
        if request.visibility.value != "internal":
            from modules.support.service import NotificationService
            notification_service = NotificationService(db)
            background_tasks.add_task(
                notification_service.send_comment_added_email,
                ticket_id=ticket_id,
                comment_id=comment.id,
                tenant_id=ticket.tenant_id,
                commenter_id=user.id
            )
        
        return CommentResponse(
            id=comment.id,
            ticket_id=comment.ticket_id,
            author_id=comment.author_id,
            author_name=user.full_name,
            author_avatar=None,
            body=comment.body,
            visibility=comment.visibility,
            is_deleted=comment.is_deleted,
            created_at=comment.created_at,
            updated_at=comment.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/tickets/{ticket_id}/comments/{comment_id}", response_model=CommentResponse)
def update_comment(
    ticket_id: str,
    comment_id: str,
    request: CommentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Update a comment (author only).
    """
    comment_service = CommentService(db)
    
    try:
        comment = comment_service.update_comment(
            comment_id=comment_id,
            author_id=user.id,
            body=request.body
        )
        
        return CommentResponse(
            id=comment.id,
            ticket_id=comment.ticket_id,
            author_id=comment.author_id,
            author_name=comment.author.full_name if comment.author else "Unknown",
            author_avatar=None,
            body=comment.body,
            visibility=comment.visibility,
            is_deleted=comment.is_deleted,
            created_at=comment.created_at,
            updated_at=comment.updated_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/tickets/{ticket_id}/comments/{comment_id}", response_model=dict)
def delete_comment(
    ticket_id: str,
    comment_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Delete a comment (author or Super Admin only).
    """
    comment_service = CommentService(db)
    
    try:
        comment_service.delete_comment(
            comment_id=comment_id,
            actor_id=user.id,
            is_superadmin=user.superadmin
        )
        return {"ok": True, "message": "Comment deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# ATTACHMENT ENDPOINTS
# ============================================================================

@router.get("/tickets/{ticket_id}/attachments", response_model=AttachmentListResponse)
def get_ticket_attachments(
    ticket_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get all attachments for a ticket.
    """
    # Verify ticket exists and user has access
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    _check_ticket_access(db, user, ticket)
    
    attachment_service = AttachmentService(db)
    attachments = attachment_service.get_attachments(ticket_id)
    
    attachment_responses = [
        AttachmentResponse(
            id=a.id,
            ticket_id=a.ticket_id,
            uploaded_by_id=a.uploaded_by_id,
            uploaded_by_name=a.uploader.full_name if a.uploader else "Unknown",
            filename=a.filename,
            file_size=a.file_size,
            mime_type=a.mime_type,
            created_at=a.created_at
        )
        for a in attachments
    ]
    
    return AttachmentListResponse(
        ticket_id=ticket_id,
        attachments=attachment_responses,
        total_count=len(attachment_responses)
    )


@router.post("/tickets/{ticket_id}/attachments", response_model=AttachmentUploadResponse)
async def upload_attachment(
    ticket_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Upload a file attachment to a ticket.
    
    Max file size: 10MB.
    Allowed types: images, PDF, Word, Excel, text, CSV, ZIP, log files.
    """
    # Verify ticket exists and user has access
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    _check_ticket_access(db, user, ticket)
    
    # Read file content
    file_content = await file.read()
    
    attachment_service = AttachmentService(db)
    
    try:
        attachment = attachment_service.upload_file(
            ticket_id=ticket_id,
            uploaded_by_id=user.id,
            filename=file.filename,
            file_content=file_content,
            mime_type=file.content_type or "application/octet-stream"
        )
        
        return AttachmentUploadResponse(
            ok=True,
            attachment=AttachmentResponse(
                id=attachment.id,
                ticket_id=attachment.ticket_id,
                uploaded_by_id=attachment.uploaded_by_id,
                uploaded_by_name=user.full_name,
                filename=attachment.filename,
                file_size=attachment.file_size,
                mime_type=attachment.mime_type,
                created_at=attachment.created_at
            ),
            message="File uploaded successfully"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tickets/{ticket_id}/attachments/{attachment_id}/download", response_model=SignedUrlResponse)
def get_attachment_download_url(
    ticket_id: str,
    attachment_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get a signed download URL for an attachment (expires in 1 hour).
    """
    # Verify ticket exists and user has access
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    _check_ticket_access(db, user, ticket)
    
    attachment_service = AttachmentService(db)
    
    try:
        # Get attachment info for filename
        attachment = db.query(TicketAttachment).filter(
            TicketAttachment.id == attachment_id
        ).first()
        
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")
        
        # Generate signed URL
        url = attachment_service.generate_signed_url(attachment_id)
        
        # Set expiration time (1 hour from now)
        from datetime import datetime, timedelta
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        return SignedUrlResponse(
            url=url,
            expires_at=expires_at,
            filename=attachment.filename
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/tickets/{ticket_id}/attachments/{attachment_id}", response_model=dict)
def delete_attachment(
    ticket_id: str,
    attachment_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Delete an attachment (uploader or Super Admin only).
    """
    attachment_service = AttachmentService(db)
    
    try:
        attachment_service.delete_attachment(
            attachment_id=attachment_id,
            actor_id=user.id,
            is_superadmin=user.superadmin
        )
        return {"ok": True, "message": "Attachment deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/attachments/{attachment_id}/file")
def download_attachment_file(
    attachment_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Download the actual attachment file.
    
    Returns the file as a downloadable response.
    """
    attachment = db.query(TicketAttachment).filter(
        TicketAttachment.id == attachment_id,
        TicketAttachment.is_deleted == False
    ).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Verify ticket access
    ticket = db.query(Ticket).filter(Ticket.id == attachment.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    _check_ticket_access(db, user, ticket)
    
    # Check if file exists
    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(
        path=attachment.file_path,
        filename=attachment.filename,
        media_type=attachment.mime_type
    )


# ============================================================================
# ESCALATION ENDPOINTS
# ============================================================================

@router.post("/tickets/{ticket_id}/escalate", response_model=EscalationResponse)
def escalate_ticket(
    ticket_id: str,
    request: EscalationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Escalate a ticket (Super Admin only).
    
    Can optionally change priority and/or assignee.
    """
    if not user.superadmin:
        raise HTTPException(
            status_code=403,
            detail="Only Super Admin can escalate tickets"
        )
    
    # Verify ticket exists
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    escalation_service = EscalationService(db)
    
    try:
        escalation = escalation_service.escalate_ticket(
            ticket_id=ticket_id,
            escalated_by_id=user.id,
            reason=request.reason,
            new_priority=request.new_priority.value if request.new_priority else None,
            new_assignee_id=request.new_assignee_id
        )
        
        # Get names for response
        escalated_by_name = user.full_name
        old_assignee_name = None
        new_assignee_name = None
        
        if escalation.old_assignee_id:
            old_assignee = db.query(User).filter(User.id == escalation.old_assignee_id).first()
            old_assignee_name = old_assignee.full_name if old_assignee else None
        
        if escalation.new_assignee_id:
            new_assignee = db.query(User).filter(User.id == escalation.new_assignee_id).first()
            new_assignee_name = new_assignee.full_name if new_assignee else None
        
        return EscalationResponse(
            id=escalation.id,
            ticket_id=escalation.ticket_id,
            escalated_by_id=escalation.escalated_by_id,
            escalated_by_name=escalated_by_name,
            reason=escalation.reason,
            old_priority=escalation.old_priority,
            new_priority=escalation.new_priority,
            old_assignee_id=escalation.old_assignee_id,
            old_assignee_name=old_assignee_name,
            new_assignee_id=escalation.new_assignee_id,
            new_assignee_name=new_assignee_name,
            created_at=escalation.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tickets/{ticket_id}/escalations", response_model=EscalationHistoryResponse)
def get_escalation_history(
    ticket_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get escalation history for a ticket.
    """
    # Verify ticket exists and user has access
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    _check_ticket_access(db, user, ticket)
    
    escalation_service = EscalationService(db)
    escalations = escalation_service.get_escalation_history(ticket_id)
    
    escalation_responses = [
        EscalationResponse(
            id=e.id,
            ticket_id=e.ticket_id,
            escalated_by_id=e.escalated_by_id,
            escalated_by_name=e.escalated_by.full_name if e.escalated_by else "Unknown",
            reason=e.reason,
            old_priority=e.old_priority,
            new_priority=e.new_priority,
            old_assignee_id=e.old_assignee_id,
            old_assignee_name=e.old_assignee.full_name if e.old_assignee else None,
            new_assignee_id=e.new_assignee_id,
            new_assignee_name=e.new_assignee.full_name if e.new_assignee else None,
            created_at=e.created_at
        )
        for e in escalations
    ]
    
    return EscalationHistoryResponse(
        ticket_id=ticket_id,
        escalations=escalation_responses,
        total_count=len(escalation_responses)
    )


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _check_ticket_access(db: Session, user: User, ticket: Ticket) -> None:
    """
    Check if user has access to a ticket.
    
    Raises HTTPException if access denied.
    """
    if user.superadmin:
        return
    
    membership = db.query(Membership).filter(
        Membership.user_id == user.id
    ).first()
    
    if membership:
        if membership.role == RoleEnum.ADMIN:
            if ticket.tenant_id != membership.tenant_id:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied: Ticket belongs to different tenant"
                )
        else:
            if ticket.created_by_user_id != user.id:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied: You can only access your own tickets"
                )
    else:
        if ticket.created_by_user_id != user.id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only access your own tickets"
            )
