# modules/integration/router.py - Integration module router
import json
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user, get_db
from models import (
    Connector,
    ConnectorCatalog,
    ConnectorRequest,
    ConnectorRequestStatus,
    Membership,
    RoleEnum,
    User,
)
from .schemas import (
    ConnectorRequestCreate,
    ConnectorRequestDecision,
    ConnectorRequestOut,
    ConnectorRequestRespond,
    ConnectorStatsOut,
    ConnectorUsecaseOut,
)


router = APIRouter(prefix="/integration", tags=["integration"])

DEFAULT_LOGO = "https://via.placeholder.com/28"
DEFAULT_GUIDE = "Guide"
DEFAULT_JSON = "JSON"
DEFAULT_VERSION = "v1.0.0"


def _normalize_connector_key(value: str | None) -> str:
    return str(value or "").strip().lower()


def _require_tenant_access(db: Session, tenant_id: str, user: User) -> Membership | None:
    if user.superadmin:
        return None
    membership = (
        db.query(Membership)
        .filter(Membership.tenant_id == tenant_id, Membership.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Tenant access required")
    return membership


def _require_tenant_admin(db: Session, tenant_id: str, user: User) -> Membership | None:
    membership = _require_tenant_access(db, tenant_id, user)
    if user.superadmin:
        return None
    if not membership or membership.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return membership


def _parse_usecases(usecase_text: str | None) -> tuple[list[str], list[str]]:
    ingestion: list[str] = []
    action: list[str] = []
    if not usecase_text or not str(usecase_text).strip():
        return ingestion, action
    text = str(usecase_text).strip()
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        lower = line.lower()
        if lower.startswith("ingestion:"):
            ingestion.append(line.split(":", 1)[1].strip())
        elif lower.startswith("action:"):
            action.append(line.split(":", 1)[1].strip())
    # Plain text fallback: if no ingestion/action lines found, treat content as ingestion
    if not ingestion and not action and text:
        for part in (p.strip() for p in text.replace(";", "\n").replace("|", "\n").split(",")):
            if part:
                ingestion.append(part)
        if not ingestion:
            ingestion.append(text)
    return ingestion, action


def _decode_request_metadata(row: ConnectorRequest) -> dict:
    raw = row.attachment_url or ""
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        return {}
    return {}


def _encode_request_metadata(row: ConnectorRequest, payload: dict) -> None:
    row.attachment_url = json.dumps(payload)


def _request_to_out(row: ConnectorRequest, db: Session) -> ConnectorRequestOut:
    metadata = _decode_request_metadata(row)
    requester = None
    if row.requested_by_user_id:
        requester = db.query(User).filter(User.id == row.requested_by_user_id).first()
    status = row.status.value if hasattr(row.status, "value") else str(row.status)
    if metadata.get("clarification_question") and status == ConnectorRequestStatus.PENDING.value:
        status = "CLARIFICATION_REQUIRED"
    return ConnectorRequestOut(
        id=row.id,
        tenant_id=row.tenant_id,
        connector_id=row.connector_id,
        connector_name=row.connector_name,
        connector_type=row.connector_type,
        logo_url=row.logo_url or DEFAULT_LOGO,
        guide_url=row.guide_url or DEFAULT_GUIDE,
        json_url=row.json_url or DEFAULT_JSON,
        version_name=row.version_name or DEFAULT_VERSION,
        status=status,
        requested_by_user_id=row.requested_by_user_id,
        requested_by_email=requester.email if requester else None,
        requested_by_name=requester.full_name if requester else None,
        selected_ingestion=metadata.get("selected_ingestion", []),
        selected_action=metadata.get("selected_action", []),
        custom_ingestion_text=metadata.get("custom_ingestion_text"),
        custom_action_text=metadata.get("custom_action_text"),
        needs_guidance=bool(metadata.get("needs_guidance", False)),
        clarification_question=metadata.get("clarification_question"),
        clarification_response=metadata.get("clarification_response"),
        internal_notes=metadata.get("internal_notes", []),
        decision_note=row.decision_note,
        created_at=row.created_at,
        decided_at=row.decided_at,
    )


def _status_for_connector(connector_id: str, requests: list[ConnectorRequest]) -> str:
    target = _normalize_connector_key(connector_id)
    matches = [
        row
        for row in requests
        if _normalize_connector_key(row.connector_id) == target
    ]
    if not matches:
        return "DEPLOYED"
    latest = max(matches, key=lambda row: row.created_at or datetime.min)
    metadata = _decode_request_metadata(latest)
    deployment = str(metadata.get("deployment_status", "")).upper()
    if deployment in {"IN_PROGRESS", "DEPLOYED"}:
        return deployment
    if latest.status == ConnectorRequestStatus.GRANTED:
        return "IN_PROGRESS"
    return "DEPLOYED"


@router.get("/health", response_model=dict)
def integration_health():
    return {"ok": True, "module": "integration"}


@router.get("/connectors/categories", response_model=list[dict])
def get_connector_categories(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get all connector types directly from DB catalog with counts."""
    rows = (
        db.query(
            ConnectorCatalog.type.label("name"),
            func.count(ConnectorCatalog.id).label("count"),
        )
        .group_by(ConnectorCatalog.type)
        .order_by(ConnectorCatalog.type.asc())
        .all()
    )

    return [
        {
            "id": str(index + 1),
            "name": row.name,
            "count": int(row.count or 0),
            "description": None,
            "created_at": None,
        }
        for index, row in enumerate(rows)
    ]


@router.get("/tenant/{tenant_id}/connectors/purchased", response_model=list[dict])
def get_purchased_connectors(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_tenant_access(db, tenant_id, user)
    connectors = db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
    request_rows = db.query(ConnectorRequest).filter(ConnectorRequest.tenant_id == tenant_id).all()
    return [
        {
            "connector_id": connector.name,
            "name": connector.name,
            "type": connector.category or connector.type or "Unknown",
            "status": _status_for_connector(connector.name, request_rows),
            "logo_url": connector.logo_url or DEFAULT_LOGO,
            "guide_url": connector.guide_url or DEFAULT_GUIDE,
            "json_url": connector.json_url or DEFAULT_JSON,
            "version_name": connector.version_name or DEFAULT_VERSION,
            "external_url": connector.external_url,
            "created_at": connector.created_at,
        }
        for connector in connectors
    ]


@router.get("/tenant/{tenant_id}/marketplace", response_model=dict)
def get_marketplace_connectors(
    tenant_id: str,
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=24, ge=1, le=120),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_tenant_access(db, tenant_id, user)

    purchased_ids = {
        row.name for row in db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
    }
    query = db.query(ConnectorCatalog)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            ConnectorCatalog.name.ilike(term)
            | ConnectorCatalog.connector_id.ilike(term)
            | ConnectorCatalog.usecase.ilike(term)
        )
    if category and category != "ALL":
        # Categories shown in UI can be broad labels (e.g. "Analytics")
        # while catalog types may be specific (e.g. "Analytics Software").
        # Use partial, case-insensitive matching to keep chips and results aligned.
        query = query.filter(ConnectorCatalog.type.ilike(f"%{category.strip()}%"))

    query = query.filter(~ConnectorCatalog.connector_id.in_(purchased_ids))
    total = query.count()
    rows = (
        query.order_by(ConnectorCatalog.name.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {
        "items": [
            {
                "connector_id": row.connector_id,
                "name": row.name,
                "type": row.type,
                "usecase": row.usecase,
                "logo_url": row.logo_url or DEFAULT_LOGO,
                "guide_url": row.guide_url or DEFAULT_GUIDE,
                "json_url": row.json_url or DEFAULT_JSON,
                "version_name": row.version_name or DEFAULT_VERSION,
            }
            for row in rows
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/connectors/{connector_id}/usecases", response_model=ConnectorUsecaseOut)
def get_connector_usecases(
    connector_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    row = (
        db.query(ConnectorCatalog)
        .filter(ConnectorCatalog.connector_id == connector_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    ingestion, action = _parse_usecases(row.usecase)
    return ConnectorUsecaseOut(
        connector_id=row.connector_id,
        connector_name=row.name,
        connector_type=row.type,
        ingestion=ingestion,
        action=action,
    )


def _get_dummy_guide_path() -> Path:
    return Path(__file__).resolve().parents[2] / "connector_dummy" / "guide.md"


def _get_dummy_config_path() -> Path:
    return Path(__file__).resolve().parents[2] / "connector_dummy" / "config.json"


@router.get("/connectors/{connector_id}/guide")
def get_connector_guide(
    connector_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return dummy guide content for any connector."""
    row = (
        db.query(ConnectorCatalog)
        .filter(ConnectorCatalog.connector_id == connector_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    path = _get_dummy_guide_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="Guide not available")
    content = path.read_text(encoding="utf-8")
    return PlainTextResponse(content, media_type="text/markdown")


@router.get("/connectors/{connector_id}/json")
def get_connector_json(
    connector_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return dummy JSON config for any connector."""
    row = (
        db.query(ConnectorCatalog)
        .filter(ConnectorCatalog.connector_id == connector_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    path = _get_dummy_config_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="JSON config not available")
    content = path.read_text(encoding="utf-8").replace("{{connector_name}}", row.name)
    return json.loads(content)


@router.get("/tenant/{tenant_id}/stats", response_model=ConnectorStatsOut)
def get_tenant_integration_stats(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_tenant_access(db, tenant_id, user)
    purchased = db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
    requests = db.query(ConnectorRequest).filter(ConnectorRequest.tenant_id == tenant_id).all()
    deployed = 0
    in_progress = 0
    for connector in purchased:
        status = _status_for_connector(connector.name, requests)
        if status == "IN_PROGRESS":
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


@router.post("/tenant/{tenant_id}/requests", response_model=ConnectorRequestOut, status_code=201)
def submit_connector_request(
    tenant_id: str,
    payload: ConnectorRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_tenant_access(db, tenant_id, user)
    catalog_row = (
        db.query(ConnectorCatalog)
        .filter(ConnectorCatalog.connector_id == payload.connector_id)
        .first()
    )
    if not catalog_row:
        raise HTTPException(status_code=404, detail="Connector not found in catalog")

    already_purchased = (
        db.query(Connector)
        .filter(Connector.tenant_id == tenant_id, Connector.name == payload.connector_id)
        .first()
    )
    if already_purchased:
        raise HTTPException(status_code=400, detail="Connector already purchased")

    request_comment_parts = []
    if payload.custom_ingestion_text:
        request_comment_parts.append(f"Ingestion: {payload.custom_ingestion_text}")
    if payload.custom_action_text:
        request_comment_parts.append(f"Action: {payload.custom_action_text}")
    if payload.needs_guidance:
        request_comment_parts.append("Needs guidance")
    request_comment = "; ".join(request_comment_parts) if request_comment_parts else None

    row = ConnectorRequest(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        connector_id=catalog_row.connector_id,
        connector_name=catalog_row.name,
        connector_type=catalog_row.type,
        logo_url=catalog_row.logo_url or DEFAULT_LOGO,
        guide_url=catalog_row.guide_url or DEFAULT_GUIDE,
        json_url=catalog_row.json_url or DEFAULT_JSON,
        version_name=catalog_row.version_name or DEFAULT_VERSION,
        status=ConnectorRequestStatus.PENDING,
        requested_by_user_id=user.id,
        request_comment=request_comment,
        created_at=datetime.utcnow(),
    )
    _encode_request_metadata(
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
    return _request_to_out(row, db)


@router.get("/tenant/{tenant_id}/requests", response_model=list[ConnectorRequestOut])
def list_tenant_requests(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_tenant_access(db, tenant_id, user)
    rows = (
        db.query(ConnectorRequest)
        .filter(ConnectorRequest.tenant_id == tenant_id)
        .order_by(ConnectorRequest.created_at.desc())
        .all()
    )
    return [_request_to_out(row, db) for row in rows]


@router.get("/tenant/{tenant_id}/requests/{request_id}", response_model=ConnectorRequestOut)
def get_tenant_request_details(
    tenant_id: str,
    request_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_tenant_access(db, tenant_id, user)
    row = (
        db.query(ConnectorRequest)
        .filter(ConnectorRequest.id == request_id, ConnectorRequest.tenant_id == tenant_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    return _request_to_out(row, db)


@router.post("/tenant/{tenant_id}/requests/{request_id}/respond", response_model=ConnectorRequestOut)
def respond_to_clarification(
    tenant_id: str,
    request_id: str,
    payload: ConnectorRequestRespond,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_tenant_access(db, tenant_id, user)
    row = (
        db.query(ConnectorRequest)
        .filter(ConnectorRequest.id == request_id, ConnectorRequest.tenant_id == tenant_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    metadata = _decode_request_metadata(row)
    metadata["clarification_response"] = payload.clarification_response
    _encode_request_metadata(row, metadata)
    row.decision_note = (
        f"{row.decision_note or ''}\nClarification response: {payload.clarification_response}"
    ).strip()
    row.status = ConnectorRequestStatus.PENDING
    db.commit()
    db.refresh(row)
    return _request_to_out(row, db)


@router.get("/superadmin/requests", response_model=list[ConnectorRequestOut])
def list_superadmin_requests(
    tenant_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.superadmin:
        raise HTTPException(status_code=403, detail="Superadmin access required")
    query = db.query(ConnectorRequest)
    if tenant_id:
        query = query.filter(ConnectorRequest.tenant_id == tenant_id)
    if status:
        if status == "CLARIFICATION_REQUIRED":
            query = query.filter(ConnectorRequest.status == ConnectorRequestStatus.PENDING)
        elif status in ConnectorRequestStatus.__members__:
            query = query.filter(ConnectorRequest.status == ConnectorRequestStatus[status])
    rows = query.order_by(ConnectorRequest.created_at.desc()).all()
    items = [_request_to_out(row, db) for row in rows]
    if status == "CLARIFICATION_REQUIRED":
        items = [item for item in items if item.clarification_question]
    return items


@router.patch("/superadmin/requests/{request_id}", response_model=ConnectorRequestOut)
def decide_request(
    request_id: str,
    payload: ConnectorRequestDecision,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.superadmin:
        raise HTTPException(status_code=403, detail="Superadmin access required")
    row = db.query(ConnectorRequest).filter(ConnectorRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    action = payload.action.lower().strip()
    metadata = _decode_request_metadata(row)
    if "internal_notes" not in metadata:
        metadata["internal_notes"] = []

    if action == "approve":
        row.status = ConnectorRequestStatus.GRANTED
        row.decision_note = payload.reason or "Approved"
        metadata["deployment_status"] = "IN_PROGRESS"
        existing = (
            db.query(Connector)
            .filter(Connector.tenant_id == row.tenant_id, Connector.name == row.connector_id)
            .first()
        )
        if not existing:
            connector = Connector(
                id=str(uuid.uuid4()),
                tenant_id=row.tenant_id,
                name=row.connector_id,
                category=row.connector_type or "Unknown",
                type="prebuilt",
                logo_url=row.logo_url or DEFAULT_LOGO,
                guide_url=row.guide_url or DEFAULT_GUIDE,
                json_url=row.json_url or DEFAULT_JSON,
                version_name=row.version_name or DEFAULT_VERSION,
                external_url="",
                created_at=datetime.utcnow(),
            )
            db.add(connector)
    elif action == "decline":
        row.status = ConnectorRequestStatus.DECLINED
        row.decision_note = payload.reason or "Declined"
    elif action == "clarify":
        question = (payload.question or "").strip()
        if not question:
            raise HTTPException(status_code=400, detail="Clarification question required")
        row.status = ConnectorRequestStatus.PENDING
        row.decision_note = f"Clarification requested: {question}"
        metadata["clarification_question"] = question
    else:
        raise HTTPException(status_code=400, detail="Unsupported action")

    if payload.internal_note:
        metadata["internal_notes"].append(
            f"{datetime.utcnow().isoformat()} - {user.email}: {payload.internal_note}"
        )

    row.decided_by_user_id = user.id
    row.decided_at = datetime.utcnow()
    _encode_request_metadata(row, metadata)
    db.commit()
    db.refresh(row)
    return _request_to_out(row, db)


@router.post("/superadmin/requests/{request_id}/notes", response_model=ConnectorRequestOut)
def add_superadmin_note(
    request_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.superadmin:
        raise HTTPException(status_code=403, detail="Superadmin access required")
    note = str(payload.get("note") or "").strip()
    if not note:
        raise HTTPException(status_code=400, detail="note is required")
    row = db.query(ConnectorRequest).filter(ConnectorRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    metadata = _decode_request_metadata(row)
    notes = metadata.get("internal_notes", [])
    notes.append(f"{datetime.utcnow().isoformat()} - {user.email}: {note}")
    metadata["internal_notes"] = notes
    _encode_request_metadata(row, metadata)
    db.commit()
    db.refresh(row)
    return _request_to_out(row, db)


@router.patch("/tenant/{tenant_id}/connectors/{connector_id}/deployment-status", response_model=dict)
def update_deployment_status(
    tenant_id: str,
    connector_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_tenant_admin(db, tenant_id, user)
    status = str(payload.get("status") or "").upper()
    if status not in {"IN_PROGRESS", "DEPLOYED"}:
        raise HTTPException(status_code=400, detail="status must be IN_PROGRESS or DEPLOYED")
    target_key = _normalize_connector_key(connector_id)
    granted_rows = (
        db.query(ConnectorRequest)
        .filter(
            ConnectorRequest.tenant_id == tenant_id,
            ConnectorRequest.status == ConnectorRequestStatus.GRANTED,
        )
        .all()
    )
    matching_rows = [
        row
        for row in granted_rows
        if _normalize_connector_key(row.connector_id) == target_key
    ]
    row = max(matching_rows, key=lambda r: r.created_at or datetime.min) if matching_rows else None
    if not row:
        connectors = db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
        connector = next(
            (
                item
                for item in connectors
                if _normalize_connector_key(item.name) == target_key
            ),
            None,
        )
        if not connector:
            raise HTTPException(status_code=404, detail="Connector not found")
        catalog_rows = db.query(ConnectorCatalog).all()
        catalog = next(
            (
                item
                for item in catalog_rows
                if _normalize_connector_key(item.connector_id) == target_key
                or _normalize_connector_key(item.name) == target_key
            ),
            None,
        )
        resolved_connector_id = catalog.connector_id if catalog else connector.name
        row = ConnectorRequest(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            connector_id=resolved_connector_id,
            connector_name=catalog.name if catalog else connector.name,
            connector_type=catalog.type if catalog else (connector.category or connector.type or "Unknown"),
            logo_url=(catalog.logo_url if catalog else connector.logo_url) or DEFAULT_LOGO,
            guide_url=(catalog.guide_url if catalog else connector.guide_url) or DEFAULT_GUIDE,
            json_url=(catalog.json_url if catalog else connector.json_url) or DEFAULT_JSON,
            version_name=(catalog.version_name if catalog else connector.version_name) or DEFAULT_VERSION,
            status=ConnectorRequestStatus.GRANTED,
            requested_by_user_id=user.id,
            decision_note="Backfilled for deployment status tracking",
            decided_by_user_id=user.id,
            created_at=datetime.utcnow(),
            decided_at=datetime.utcnow(),
        )
        db.add(row)
        db.flush()
    metadata = _decode_request_metadata(row)
    metadata["deployment_status"] = status
    _encode_request_metadata(row, metadata)
    db.commit()
    return {"ok": True, "connector_id": connector_id, "status": status}


@router.post("/tenant/{tenant_id}/dummy-request", response_model=dict, status_code=201)
def submit_dummy_connector_request(
    tenant_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_tenant_access(db, tenant_id, user)
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


# Backward-compatible aliases used by existing code paths.
@router.get("/catalog", response_model=list[dict])
def get_connector_catalog(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    rows = db.query(ConnectorCatalog).order_by(ConnectorCatalog.name.asc()).all()
    return [
        {
            "id": row.id,
            "connector_id": row.connector_id,
            "name": row.name,
            "type": row.type,
            "usecase": row.usecase,
            "logo_url": row.logo_url or DEFAULT_LOGO,
            "guide_url": row.guide_url or DEFAULT_GUIDE,
            "json_url": row.json_url or DEFAULT_JSON,
            "version_name": row.version_name or DEFAULT_VERSION,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.get("/tenant/{tenant_id}/connectors", response_model=list[dict])
def get_tenant_connectors(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_tenant_access(db, tenant_id, user)
    return get_purchased_connectors(tenant_id, db, user)
