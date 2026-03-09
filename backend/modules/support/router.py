# modules/support/router.py - Support module router
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from auth import get_current_user, get_db
from models import User, Notification, Tenant
from schemas import NotificationOut


router = APIRouter(prefix="/support", tags=["support"])


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
