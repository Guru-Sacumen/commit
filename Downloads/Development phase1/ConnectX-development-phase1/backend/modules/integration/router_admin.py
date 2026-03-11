import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_admin, get_db
from models import Connector, ConnectorRequest, User

from .schemas import TenantConnectorCreate
from .service import DEFAULT_GUIDE, DEFAULT_JSON, DEFAULT_LOGO, DEFAULT_VERSION

router = APIRouter(tags=["integration-admin"])


def _normalize_connector_key(value: str | None) -> str:
    return str(value or "").strip().lower()


def _connector_key_variants(value: str | None) -> set[str]:
    normalized = _normalize_connector_key(value)
    compact = "".join(ch for ch in normalized if ch.isalnum())
    variants = {normalized}
    if compact:
        variants.add(compact)
    return variants


@router.get("/connectors", response_model=list[dict])
def get_admin_connectors(
    tenant_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    connectors = db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "category": c.category,
            "type": c.type,
            "logo_url": c.logo_url,
            "external_url": c.external_url,
            "created_at": c.created_at,
        }
        for c in connectors
    ]


@router.get("/connector-requests", response_model=list[dict])
def get_admin_connector_requests(
    tenant_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    requests = db.query(ConnectorRequest).filter(ConnectorRequest.tenant_id == tenant_id).all()
    return [
        {
            "id": r.id,
            "connector_id": r.connector_id,
            "connector_name": r.connector_name,
            "connector_type": r.connector_type,
            "status": r.status,
            "requested_by_user_id": r.requested_by_user_id,
            "request_comment": r.request_comment,
            "created_at": r.created_at,
        }
        for r in requests
    ]


@router.post("/connectors", response_model=dict, status_code=201)
def add_tenant_connector(
    tenant_id: str,
    payload: TenantConnectorCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from models import Tenant

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    name = payload.name or payload.connector_id
    existing = db.query(Connector).filter(Connector.tenant_id == tenant_id, Connector.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Connector already exists for this tenant")
    connector = Connector(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        name=name,
        category=payload.category or "Unknown",
        type=payload.type or "prebuilt",
        logo_url=payload.logo_url or DEFAULT_LOGO,
        guide_url=DEFAULT_GUIDE,
        json_url=DEFAULT_JSON,
        version_name=DEFAULT_VERSION,
        external_url=payload.external_url or "",
        created_at=datetime.utcnow(),
    )
    db.add(connector)
    db.commit()
    db.refresh(connector)
    return {
        "id": connector.id,
        "tenant_id": connector.tenant_id,
        "name": connector.name,
        "category": connector.category,
        "type": connector.type,
        "logo_url": connector.logo_url,
        "external_url": connector.external_url,
        "created_at": connector.created_at,
    }


@router.delete("/connectors/{connector_id}", response_model=dict)
def delete_tenant_connector(
    tenant_id: str,
    connector_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    target_variants = _connector_key_variants(connector_id)
    connectors = db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
    connector = next(
        (
            row
            for row in connectors
            if _connector_key_variants(row.name).intersection(target_variants)
        ),
        None,
    )
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    db.delete(connector)
    db.commit()
    return {"ok": True, "message": "Connector deleted"}
