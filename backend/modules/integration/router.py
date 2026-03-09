# modules/integration/router.py - Integration module router
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from auth import get_current_user, get_db
from models import User, ConnectorCatalog, Connector, Tenant, Membership, RoleEnum


router = APIRouter(prefix="/integration", tags=["integration"])


@router.get("/health", response_model=dict)
def integration_health():
    """Integration module health check"""
    return {"ok": True, "module": "integration"}


@router.get("/catalog", response_model=list[dict])
def get_connector_catalog(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get all available connectors from catalog"""
    connectors = db.query(ConnectorCatalog).all()
    return [
        {
            "id": connector.id,
            "connector_id": connector.connector_id,
            "name": connector.name,
            "type": connector.type,
            "created_at": connector.created_at
        }
        for connector in connectors
    ]


@router.get("/tenant/{tenant_id}/connectors", response_model=list[dict])
def get_tenant_connectors(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get connectors for a specific tenant"""
    connectors = (
        db.query(Connector)
        .filter(Connector.tenant_id == tenant_id)
        .all()
    )
    return [
        {
            "id": connector.id,
            "name": connector.name,
            "category": connector.category,
            "type": connector.type,
            "logo_url": connector.logo_url,
            "external_url": connector.external_url,
            "created_at": connector.created_at
        }
        for connector in connectors
    ]


@router.post("/tenant/{tenant_id}/connectors/{connector_id}/test", response_model=dict)
def test_connector_connection(
    tenant_id: str,
    connector_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Test connection to a specific connector"""
    # Check if user has access to this tenant
    membership = (
        db.query(Membership)
        .filter(Membership.tenant_id == tenant_id, Membership.user_id == user.id)
        .first()
    )
    if not membership and not user.superadmin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if connector exists for this tenant
    connector = (
        db.query(Connector)
        .filter(Connector.tenant_id == tenant_id, Connector.name == connector_id)
        .first()
    )
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    # Placeholder for actual connection testing logic
    return {
        "ok": True,
        "connector_id": connector_id,
        "test_result": "success",
        "message": "Connection test successful"
    }


@router.post("/tenant/{tenant_id}/connectors", response_model=dict, status_code=201)
def add_tenant_connector(
    tenant_id: str,
    connector_data: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Add a connector to a tenant"""
    # Check if user is admin or superadmin
    membership = (
        db.query(Membership)
        .filter(
            Membership.tenant_id == tenant_id,
            Membership.user_id == user.id
        )
        .first()
    )
    
    if not (user.superadmin or (membership and membership.role == RoleEnum.ADMIN)):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify connector exists in catalog
    catalog_connector = (
        db.query(ConnectorCatalog)
        .filter(ConnectorCatalog.connector_id == connector_data.get("connector_id"))
        .first()
    )
    
    if not catalog_connector:
        raise HTTPException(status_code=400, detail="Connector not found in catalog")
    
    # Check if already exists
    existing = (
        db.query(Connector)
        .filter(
            Connector.tenant_id == tenant_id,
            Connector.name == connector_data.get("connector_id")
        )
        .first()
    )
    
    if existing:
        raise HTTPException(status_code=400, detail="Connector already exists for tenant")
    
    # Create new connector
    connector = Connector(
        id=connector_data.get("id", f"conn_{datetime.utcnow().timestamp()}"),
        tenant_id=tenant_id,
        name=connector_data.get("connector_id"),
        category=connector_data.get("category", catalog_connector.type),
        type=connector_data.get("type", catalog_connector.type),
        logo_url=connector_data.get("logo_url", ""),
        external_url=connector_data.get("external_url", "")
    )
    
    db.add(connector)
    db.commit()
    
    return {
        "id": connector.id,
        "connector_id": connector.name,
        "name": connector.name
    }


@router.delete("/tenant/{tenant_id}/connectors/{connector_id}", response_model=dict)
def remove_tenant_connector(
    tenant_id: str,
    connector_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Remove a connector from a tenant"""
    # Check if user is admin or superadmin
    membership = (
        db.query(Membership)
        .filter(
            Membership.tenant_id == tenant_id,
            Membership.user_id == user.id
        )
        .first()
    )
    
    if not (user.superadmin or (membership and membership.role == RoleEnum.ADMIN)):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    connector = (
        db.query(Connector)
        .filter(
            Connector.tenant_id == tenant_id,
            Connector.id == connector_id
        )
        .first()
    )
    
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    db.delete(connector)
    db.commit()
    
    return {"ok": True}


@router.get("/stats", response_model=dict)
def get_integration_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get integration library statistics"""
    if not user.superadmin:
        raise HTTPException(status_code=403, detail="Superadmin access required")
    
    total_catalog_connectors = db.query(ConnectorCatalog).count()
    total_tenant_connectors = db.query(Connector).count()
    total_tenants_with_connectors = (
        db.query(Connector.tenant_id)
        .distinct()
        .count()
    )
    
    return {
        "total_catalog_connectors": total_catalog_connectors,
        "total_tenant_connectors": total_tenant_connectors,
        "total_tenants_with_connectors": total_tenants_with_connectors,
        "timestamp": datetime.utcnow().isoformat()
    }
