# modules/monitor/router.py - Monitor module router
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from auth import get_current_user, get_db
from models import User, Tenant, Membership, RoleEnum
from .service import MonitorService


router = APIRouter(prefix="/monitor", tags=["monitor"])


@router.get("/health", response_model=dict)
def monitor_health():
    """Monitor module health check"""
    return {"ok": True, "module": "monitor"}


@router.get("/tenant/{tenant_id}/metrics", response_model=dict)
def get_tenant_metrics(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    timeframe: str = Query(default="24h", regex="^(1h|24h|7d|30d)$")
):
    """Get metrics for a tenant"""
    service = MonitorService(db)
    metrics = service.get_tenant_metrics(tenant_id, timeframe)
    return metrics


@router.get("/tenant/{tenant_id}/alerts", response_model=list[dict])
def get_tenant_alerts(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(default=50, ge=1, le=200)
):
    """Get alerts for a tenant"""
    service = MonitorService(db)
    alerts = service.get_tenant_alerts(tenant_id, severity, status, limit)
    return alerts


@router.post("/tenant/{tenant_id}/alerts/{alert_id}/acknowledge", response_model=dict)
def acknowledge_alert(
    tenant_id: str,
    alert_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Acknowledge an alert"""
    service = MonitorService(db)
    result = service.acknowledge_alert(alert_id, user.id)
    return result


@router.get("/tenant/{tenant_id}/connectors/{connector_id}/status", response_model=dict)
def get_connector_status(
    tenant_id: str,
    connector_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get status and health of a specific connector"""
    service = MonitorService(db)
    status = service.get_connector_status(tenant_id, connector_id)
    return status


@router.get("/tenant/{tenant_id}/dashboard", response_model=dict)
def get_dashboard_data(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get dashboard data for a tenant"""
    service = MonitorService(db)
    dashboard = service.get_dashboard_data(tenant_id)
    return dashboard
