import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_current_user, get_db
from models import Connector, ConnectorCatalog, ConnectorRequest, ConnectorRequestStatus, User

from .schemas import (
    ConnectorRequestCreate,
    ConnectorRequestOut,
    ConnectorRequestRespond,
    ConnectorStatsOut,
)
from .service import (
    DEFAULT_GUIDE,
    DEFAULT_JSON,
    DEFAULT_LOGO,
    DEFAULT_VERSION,
    decode_request_metadata,
    encode_request_metadata,
    request_to_out,
    require_tenant_access,
    require_tenant_admin,
    status_for_connector,
)


router = APIRouter(tags=["integration-user"])


@router.get("/purchased", response_model=list[dict])
def get_purchased_connectors(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_access(db, tenant_id, user)
    connectors = db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
    request_rows = db.query(ConnectorRequest).filter(ConnectorRequest.tenant_id == tenant_id).all()
    return [
        {
            "connector_id": c.name,
            "name": c.name,
            "type": c.category or c.type or "Unknown",
            "status": status_for_connector(c.name, request_rows),
            "logo_url": _safe_get(c, "logo_url") or DEFAULT_LOGO,
            "guide_url": _safe_get(c, "guide_url") or DEFAULT_GUIDE,
            "json_url": _safe_get(c, "json_url") or DEFAULT_JSON,
            "version_name": _safe_get(c, "version_name") or DEFAULT_VERSION,
            "external_url": _safe_get(c, "external_url"),
            "created_at": c.created_at,
        }
        for c in connectors
    ]


@router.get("/marketplace", response_model=dict)
def get_marketplace_connectors(
    tenant_id: str,
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=24, ge=1, le=120),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_access(db, tenant_id, user)
    purchased_ids = {row.name for row in db.query(Connector).filter(Connector.tenant_id == tenant_id).all()}
    active_request_rows = (
        db.query(ConnectorRequest)
        .filter(
            ConnectorRequest.tenant_id == tenant_id,
            ConnectorRequest.status != ConnectorRequestStatus.DECLINED,
        )
        .all()
    )
    requested_ids = {
        str(row.connector_id or "").strip()
        for row in active_request_rows
        if str(row.connector_id or "").strip()
    }
    excluded_ids = purchased_ids | requested_ids
    query = db.query(ConnectorCatalog)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            ConnectorCatalog.name.ilike(term)
            | ConnectorCatalog.connector_id.ilike(term)
            | ConnectorCatalog.usecase.ilike(term)
        )
    if category and category != "ALL":
        query = query.filter(ConnectorCatalog.type.ilike(f"%{category.strip()}%"))
    if excluded_ids:
        query = query.filter(~ConnectorCatalog.connector_id.in_(excluded_ids))
    total = query.count()
    rows = query.order_by(ConnectorCatalog.name.asc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "items": [
            {
                "connector_id": r.connector_id,
                "name": r.name,
                "type": r.type,
                "usecase": r.usecase,
                "logo_url": _safe_get(r, "logo_url") or DEFAULT_LOGO,
                "guide_url": _safe_get(r, "guide_url") or DEFAULT_GUIDE,
                "json_url": _safe_get(r, "json_url") or DEFAULT_JSON,
                "version_name": _safe_get(r, "version_name") or DEFAULT_VERSION,
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/stats", response_model=ConnectorStatsOut)
def get_tenant_stats(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_access(db, tenant_id, user)
    purchased = db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
    requests = db.query(ConnectorRequest).filter(ConnectorRequest.tenant_id == tenant_id).all()
    deployed = in_progress = 0
    for c in purchased:
        st = status_for_connector(c.name, requests)
        if st == "IN_PROGRESS":
            in_progress += 1
        else:
            deployed += 1
    marketplace_total = db.query(ConnectorCatalog).count()
    return ConnectorStatsOut(
        total_purchased=len(purchased),
        deployed=deployed,
        in_progress=in_progress,
        marketplace_total=marketplace_total,
    )


@router.post("/requests", response_model=ConnectorRequestOut, status_code=201)
def submit_connector_request(
    tenant_id: str,
    payload: ConnectorRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_access(db, tenant_id, user)
    catalog_row = db.query(ConnectorCatalog).filter(ConnectorCatalog.connector_id == payload.connector_id).first()
    if not catalog_row:
        raise HTTPException(status_code=404, detail="Connector not found in catalog")
    already = db.query(Connector).filter(Connector.tenant_id == tenant_id, Connector.name == payload.connector_id).first()
    if already:
        raise HTTPException(status_code=400, detail="Connector already purchased")
    parts = []
    if payload.custom_ingestion_text:
        parts.append(f"Ingestion: {payload.custom_ingestion_text}")
    if payload.custom_action_text:
        parts.append(f"Action: {payload.custom_action_text}")
    if payload.needs_guidance:
        parts.append("Needs guidance")
    request_comment = "; ".join(parts) if parts else None
    row = ConnectorRequest(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        connector_id=catalog_row.connector_id,
        connector_name=catalog_row.name,
        connector_type=catalog_row.type,
        status=ConnectorRequestStatus.PENDING,
        requested_by_user_id=user.id,
        request_comment=request_comment,
        created_at=datetime.utcnow(),
    )
    if hasattr(ConnectorRequest, "logo_url"):
        row.logo_url = _safe_get(catalog_row, "logo_url") or DEFAULT_LOGO
    if hasattr(ConnectorRequest, "guide_url"):
        row.guide_url = _safe_get(catalog_row, "guide_url") or DEFAULT_GUIDE
    if hasattr(ConnectorRequest, "json_url"):
        row.json_url = _safe_get(catalog_row, "json_url") or DEFAULT_JSON
    if hasattr(ConnectorRequest, "version_name"):
        row.version_name = _safe_get(catalog_row, "version_name") or DEFAULT_VERSION
    encode_request_metadata(
        row,
        {
            "selected_ingestion": payload.selected_ingestion,
            "selected_action": payload.selected_action,
            "custom_ingestion_text": payload.custom_ingestion_text,
            "custom_action_text": payload.custom_action_text,
            "needs_guidance": payload.needs_guidance,
            "internal_notes": [],
        },
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return request_to_out(row, db)


@router.get("/requests", response_model=list[ConnectorRequestOut])
def list_tenant_requests(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_access(db, tenant_id, user)
    rows = db.query(ConnectorRequest).filter(ConnectorRequest.tenant_id == tenant_id).order_by(ConnectorRequest.created_at.desc()).all()
    return [request_to_out(row, db) for row in rows]


@router.post("/requests/{request_id}/respond", response_model=ConnectorRequestOut)
def respond_to_clarification(
    tenant_id: str,
    request_id: str,
    payload: ConnectorRequestRespond,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_access(db, tenant_id, user)
    row = db.query(ConnectorRequest).filter(ConnectorRequest.id == request_id, ConnectorRequest.tenant_id == tenant_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    metadata = decode_request_metadata(row)
    metadata["clarification_response"] = payload.clarification_response
    encode_request_metadata(row, metadata)
    row.decision_note = (f"{row.decision_note or ''}\nClarification response: {payload.clarification_response}").strip()
    row.status = ConnectorRequestStatus.PENDING
    db.commit()
    db.refresh(row)
    return request_to_out(row, db)


@router.patch("/connectors/{connector_id}/deployment-status", response_model=dict)
def update_deployment_status(
    tenant_id: str,
    connector_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_admin(db, tenant_id, user)
    status = str(payload.get("status") or "").upper()
    if status not in {"IN_PROGRESS", "DEPLOYED"}:
        raise HTTPException(status_code=400, detail="status must be IN_PROGRESS or DEPLOYED")
    target_key = _normalize_connector_key(connector_id)
    target_variants = _connector_key_variants(connector_id)
    granted_rows = db.query(ConnectorRequest).filter(
        ConnectorRequest.tenant_id == tenant_id,
        ConnectorRequest.status == ConnectorRequestStatus.GRANTED,
    ).all()
    matching = [
        r
        for r in granted_rows
        if _connector_key_variants(r.connector_id).intersection(target_variants)
        or _connector_key_variants(_safe_get(r, "connector_name")).intersection(target_variants)
    ]
    row = max(matching, key=lambda r: r.created_at or datetime.min) if matching else None
    if not row:
        connectors = db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
        connector = next(
            (
                c
                for c in connectors
                if _connector_key_variants(c.name).intersection(target_variants)
            ),
            None,
        )
        if not connector:
            raise HTTPException(status_code=404, detail="Connector not found")
        catalog_rows = db.query(ConnectorCatalog).all()
        catalog = next(
            (
                c
                for c in catalog_rows
                if _connector_key_variants(c.connector_id).intersection(target_variants)
                or _connector_key_variants(c.name).intersection(target_variants)
            ),
            None,
        )
        row = ConnectorRequest(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            connector_id=catalog.connector_id if catalog else connector.name,
            connector_name=catalog.name if catalog else connector.name,
            connector_type=catalog.type if catalog else (connector.category or connector.type or "Unknown"),
            status=ConnectorRequestStatus.GRANTED,
            requested_by_user_id=user.id,
            decision_note="Backfilled for deployment status tracking",
            decided_by_user_id=user.id,
            created_at=datetime.utcnow(),
            decided_at=datetime.utcnow(),
        )
        if hasattr(ConnectorRequest, "logo_url"):
            row.logo_url = (_safe_get(catalog, "logo_url") if catalog else _safe_get(connector, "logo_url")) or DEFAULT_LOGO
        if hasattr(ConnectorRequest, "guide_url"):
            row.guide_url = (_safe_get(catalog, "guide_url") if catalog else _safe_get(connector, "guide_url")) or DEFAULT_GUIDE
        if hasattr(ConnectorRequest, "json_url"):
            row.json_url = (_safe_get(catalog, "json_url") if catalog else _safe_get(connector, "json_url")) or DEFAULT_JSON
        if hasattr(ConnectorRequest, "version_name"):
            row.version_name = (_safe_get(catalog, "version_name") if catalog else _safe_get(connector, "version_name")) or DEFAULT_VERSION
        db.add(row)
        db.flush()
    metadata = decode_request_metadata(row)
    metadata["deployment_status"] = status
    encode_request_metadata(row, metadata)
    db.commit()
    return {"ok": True, "connector_id": connector_id, "status": status}


@router.post("/dummy-request", response_model=dict, status_code=201)
def submit_dummy_request(
    tenant_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_tenant_access(db, tenant_id, user)
    product_name = str(payload.get("product_name") or "").strip()
    description = str(payload.get("description") or "").strip()
    if not product_name:
        raise HTTPException(status_code=400, detail="product_name is required")
    return {
        "ok": True,
        "tenant_id": tenant_id,
        "product_name": product_name,
        "description": description,
        "status": "RECEIVED",
        "request_id": str(uuid.uuid4()),
        "submitted_at": datetime.utcnow().isoformat(),
    }


def _normalize_connector_key(value: str | None) -> str:
    return str(value or "").strip().lower()


def _connector_key_variants(value: str | None) -> set[str]:
    normalized = _normalize_connector_key(value)
    compact = "".join(ch for ch in normalized if ch.isalnum())
    variants = {normalized}
    if compact:
        variants.add(compact)
    return variants


def _safe_get(row, field: str, default=None):
    return getattr(row, field, default)
