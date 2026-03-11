# modules/integration/router.py - Main integration router with connector sub-routers
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user, get_db
from models import ConnectorCatalog, User

from .router_user import router as user_router
from .router_admin import router as admin_router
from .router_superadmin import router as superadmin_router
from .schemas import ConnectorUsecaseOut
from .service import get_dummy_config_path, get_dummy_guide_path, parse_usecases

router = APIRouter(prefix="/integration", tags=["integration"])

router.include_router(user_router, prefix="/tenant/{tenant_id}", tags=["integration-user"])
router.include_router(admin_router, prefix="/admin/{tenant_id}", tags=["integration-admin"])
router.include_router(superadmin_router, prefix="/superadmin", tags=["integration-superadmin"])


@router.get("/connectors/categories", response_model=list[dict])
def get_connector_categories(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
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


@router.get("/connectors/{connector_id}/usecases", response_model=ConnectorUsecaseOut)
def get_connector_usecases(
    connector_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    row = db.query(ConnectorCatalog).filter(ConnectorCatalog.connector_id == connector_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    ingestion, action = parse_usecases(row.usecase)
    return ConnectorUsecaseOut(
        connector_id=row.connector_id,
        connector_name=row.name,
        connector_type=row.type,
        ingestion=ingestion,
        action=action,
    )


@router.get("/connectors/{connector_id}/guide")
def get_connector_guide(
    connector_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    row = db.query(ConnectorCatalog).filter(ConnectorCatalog.connector_id == connector_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    path = get_dummy_guide_path()
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
    row = db.query(ConnectorCatalog).filter(ConnectorCatalog.connector_id == connector_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    path = get_dummy_config_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="JSON config not available")
    content = path.read_text(encoding="utf-8").replace("{{connector_name}}", row.name)
    return json.loads(content)


@router.get("/health", response_model=dict)
def integration_health():
    return {"ok": True, "module": "integration"}
