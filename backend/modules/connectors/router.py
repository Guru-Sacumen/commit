from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user, get_db
from models import ConnectorCatalog, User


router = APIRouter(prefix="/connectors", tags=["connectors"])

DEFAULT_LOGO = "https://via.placeholder.com/28"
DEFAULT_GUIDE = "Guide"
DEFAULT_JSON = "JSON"
DEFAULT_VERSION = "v1.0.0"


def _resolve_guide_url(stored: str | None, connector_id: str) -> str:
    if stored and (stored.startswith("/") or stored.startswith("http")):
        return stored
    return f"/integration/connectors/{connector_id}/guide"


def _resolve_json_url(stored: str | None, connector_id: str) -> str:
    if stored and (stored.startswith("/") or stored.startswith("http")):
        return stored
    return f"/integration/connectors/{connector_id}/json"


@router.get("/catalog", response_model=list[dict])
@router.get("", response_model=list[dict])
def list_connectors(
    search: str | None = Query(default=None),
    connector_type: str | None = Query(default=None, alias="type"),
    limit: int = Query(default=2000, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(ConnectorCatalog)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            ConnectorCatalog.name.ilike(term)
            | ConnectorCatalog.connector_id.ilike(term)
            | ConnectorCatalog.usecase.ilike(term)
        )

    if connector_type:
        query = query.filter(ConnectorCatalog.type == connector_type)

    rows = (
        query.order_by(ConnectorCatalog.type.asc(), ConnectorCatalog.name.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": row.id,
            "connector_id": row.connector_id,
            "name": row.name,
            "type": row.type,
            "usecase": row.usecase,
            "logo_url": row.logo_url or DEFAULT_LOGO,
            "guide_url": _resolve_guide_url(row.guide_url, row.connector_id),
            "json_url": _resolve_json_url(row.json_url, row.connector_id),
            "version_name": row.version_name or DEFAULT_VERSION,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.get("/types", response_model=list[dict])
def list_connector_types(
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            ConnectorCatalog.type.label("type"),
            func.count(ConnectorCatalog.id).label("count"),
        )
        .group_by(ConnectorCatalog.type)
        .order_by(ConnectorCatalog.type.asc())
        .all()
    )
    return [{"type": row.type, "count": row.count} for row in rows]


@router.get("/catalog/{connector_id}", response_model=dict)
def get_connector_by_catalog_id(
    connector_id: str,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(ConnectorCatalog)
        .filter(ConnectorCatalog.connector_id == connector_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")

    return {
        "id": row.id,
        "connector_id": row.connector_id,
        "name": row.name,
        "type": row.type,
        "usecase": row.usecase,
        "logo_url": row.logo_url or DEFAULT_LOGO,
        "guide_url": _resolve_guide_url(row.guide_url, row.connector_id),
        "json_url": _resolve_json_url(row.json_url, row.connector_id),
        "version_name": row.version_name or DEFAULT_VERSION,
        "created_at": row.created_at,
    }
