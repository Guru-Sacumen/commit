import uuid
from datetime import datetime
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from auth import get_current_superadmin, get_db
from connector_catalog_sync import sync_connector_catalog_from_excel
from models import Connector, ConnectorCatalog, ConnectorRequest, ConnectorRequestStatus, User

from .schemas import ConnectorCatalogCreate, ConnectorCatalogUpdate, ConnectorRequestDecision, ConnectorRequestOut
from .service import (
    DEFAULT_GUIDE,
    DEFAULT_JSON,
    DEFAULT_LOGO,
    DEFAULT_VERSION,
    decode_request_metadata,
    encode_request_metadata,
    request_to_out,
    resolve_guide_url,
    resolve_json_url,
)


router = APIRouter(tags=["integration-superadmin"])
ASSETS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "connectors"


def _sanitize_filename(name: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in {"-", "_", "."} else "-" for ch in str(name or "file"))
    return safe.strip("-.") or "file"


def _normalize_connector_key(value: str | None) -> str:
    return str(value or "").strip().lower()


def _safe_get(row, field: str, default=None):
    return getattr(row, field, default)


@router.get("/catalog", response_model=list[dict])
def get_catalog(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_superadmin),
):
    rows = db.query(ConnectorCatalog).order_by(ConnectorCatalog.name.asc()).all()
    return [
        {
            "id": r.id,
            "connector_id": r.connector_id,
            "name": r.name,
            "type": r.type,
            "usecase": r.usecase,
            "logo_url": _safe_get(r, "logo_url") or DEFAULT_LOGO,
            "guide_url": resolve_guide_url(_safe_get(r, "guide_url"), r.connector_id),
            "json_url": resolve_json_url(_safe_get(r, "json_url"), r.connector_id),
            "version_name": _safe_get(r, "version_name") or DEFAULT_VERSION,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@router.post("/catalog", response_model=dict, status_code=201)
def create_catalog_entry(
    payload: ConnectorCatalogCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_superadmin),
):
    existing = db.query(ConnectorCatalog).filter(ConnectorCatalog.connector_id == payload.connector_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Connector ID already exists")
    catalog_kwargs = {
        "id": str(uuid.uuid4()),
        "connector_id": payload.connector_id,
        "name": payload.name,
        "type": payload.type,
        "usecase": payload.usecase,
    }
    if hasattr(ConnectorCatalog, "logo_url"):
        catalog_kwargs["logo_url"] = payload.logo_url or DEFAULT_LOGO
    if hasattr(ConnectorCatalog, "guide_url"):
        catalog_kwargs["guide_url"] = payload.guide_url or f"/integration/connectors/{payload.connector_id}/guide"
    if hasattr(ConnectorCatalog, "json_url"):
        catalog_kwargs["json_url"] = payload.json_url or f"/integration/connectors/{payload.connector_id}/json"
    if hasattr(ConnectorCatalog, "version_name"):
        catalog_kwargs["version_name"] = payload.version_name or DEFAULT_VERSION
    connector = ConnectorCatalog(**catalog_kwargs)
    db.add(connector)
    db.commit()
    db.refresh(connector)
    return {
        "id": connector.id,
        "connector_id": connector.connector_id,
        "name": connector.name,
        "type": connector.type,
        "usecase": connector.usecase,
        "logo_url": _safe_get(connector, "logo_url") or DEFAULT_LOGO,
        "guide_url": resolve_guide_url(_safe_get(connector, "guide_url"), connector.connector_id),
        "json_url": resolve_json_url(_safe_get(connector, "json_url"), connector.connector_id),
        "version_name": _safe_get(connector, "version_name") or DEFAULT_VERSION,
        "created_at": connector.created_at,
    }


@router.get("/catalog/{connector_id}", response_model=dict)
def get_catalog_entry(
    connector_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_superadmin),
):
    row = db.query(ConnectorCatalog).filter(ConnectorCatalog.connector_id == connector_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    return {
        "id": row.id,
        "connector_id": row.connector_id,
        "name": row.name,
        "type": row.type,
        "usecase": row.usecase,
        "logo_url": _safe_get(row, "logo_url") or DEFAULT_LOGO,
        "guide_url": resolve_guide_url(_safe_get(row, "guide_url"), row.connector_id),
        "json_url": resolve_json_url(_safe_get(row, "json_url"), row.connector_id),
        "version_name": _safe_get(row, "version_name") or DEFAULT_VERSION,
        "created_at": row.created_at,
    }


@router.put("/catalog/{connector_id}", response_model=dict)
def update_catalog_entry(
    connector_id: str,
    payload: ConnectorCatalogUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_superadmin),
):
    row = db.query(ConnectorCatalog).filter(ConnectorCatalog.connector_id == connector_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    if payload.name is not None:
        row.name = payload.name
    if payload.type is not None:
        row.type = payload.type
    if payload.usecase is not None:
        row.usecase = payload.usecase
    if payload.logo_url is not None:
        if hasattr(ConnectorCatalog, "logo_url"):
            row.logo_url = payload.logo_url
    if payload.guide_url is not None:
        if hasattr(ConnectorCatalog, "guide_url"):
            row.guide_url = payload.guide_url
    if payload.json_url is not None:
        if hasattr(ConnectorCatalog, "json_url"):
            row.json_url = payload.json_url
    if payload.version_name is not None:
        if hasattr(ConnectorCatalog, "version_name"):
            row.version_name = payload.version_name

    # Propagate updated display fields to existing tenant snapshots so
    # users immediately see superadmin catalog edits in My Connectors/Requests.
    target_key = _normalize_connector_key(connector_id)
    related_requests = [
        req
        for req in db.query(ConnectorRequest).all()
        if _normalize_connector_key(req.connector_id) == target_key
    ]
    related_connectors = [
        conn
        for conn in db.query(Connector).all()
        if _normalize_connector_key(conn.name) == target_key
    ]
    if payload.type is not None:
        for req in related_requests:
            req.connector_type = payload.type
        for conn in related_connectors:
            conn.category = payload.type
    if payload.logo_url is not None:
        for req in related_requests:
            if hasattr(ConnectorRequest, "logo_url"):
                req.logo_url = payload.logo_url
        for conn in related_connectors:
            if hasattr(Connector, "logo_url"):
                conn.logo_url = payload.logo_url
    if payload.guide_url is not None:
        for req in related_requests:
            if hasattr(ConnectorRequest, "guide_url"):
                req.guide_url = payload.guide_url
        for conn in related_connectors:
            if hasattr(Connector, "guide_url"):
                conn.guide_url = payload.guide_url
    if payload.json_url is not None:
        for req in related_requests:
            if hasattr(ConnectorRequest, "json_url"):
                req.json_url = payload.json_url
        for conn in related_connectors:
            if hasattr(Connector, "json_url"):
                conn.json_url = payload.json_url
    if payload.version_name is not None:
        for req in related_requests:
            if hasattr(ConnectorRequest, "version_name"):
                req.version_name = payload.version_name
        for conn in related_connectors:
            if hasattr(Connector, "version_name"):
                conn.version_name = payload.version_name

    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "connector_id": row.connector_id,
        "name": row.name,
        "type": row.type,
        "usecase": row.usecase,
        "logo_url": _safe_get(row, "logo_url") or DEFAULT_LOGO,
        "guide_url": resolve_guide_url(_safe_get(row, "guide_url"), row.connector_id),
        "json_url": resolve_json_url(_safe_get(row, "json_url"), row.connector_id),
        "version_name": _safe_get(row, "version_name") or DEFAULT_VERSION,
        "created_at": row.created_at,
    }


@router.patch("/catalog/{connector_id}", response_model=dict)
def patch_catalog_entry(
    connector_id: str,
    payload: ConnectorCatalogUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_superadmin),
):
    return update_catalog_entry(connector_id, payload, db, _user)


@router.delete("/catalog/{connector_id}", response_model=dict)
def delete_catalog_entry(
    connector_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_superadmin),
):
    row = db.query(ConnectorCatalog).filter(ConnectorCatalog.connector_id == connector_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Connector not found")
    name = row.name
    db.delete(row)
    db.commit()
    return {"message": f"Connector '{name}' deleted successfully"}


@router.post("/catalog/assets", response_model=dict)
def upload_catalog_asset(
    kind: str = Query(default="logo"),
    asset: UploadFile = File(...),
    _user: User = Depends(get_current_superadmin),
):
    asset_type = str(kind or "logo").strip().lower()
    allowed = {"logo", "guide", "json"}
    if asset_type not in allowed:
        raise HTTPException(status_code=400, detail="kind must be one of: logo, guide, json")

    original_name = _sanitize_filename(asset.filename or f"{asset_type}.bin")
    ext = Path(original_name).suffix.lower()
    if asset_type == "logo" and ext not in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}:
        raise HTTPException(status_code=400, detail="logo must be png/jpg/jpeg/gif/webp/svg")
    if asset_type == "guide" and ext not in {".md", ".txt"}:
        raise HTTPException(status_code=400, detail="guide must be .md or .txt")
    if asset_type == "json" and ext != ".json":
        raise HTTPException(status_code=400, detail="json must be .json")

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = f"{asset_type}-{uuid.uuid4().hex[:10]}{ext}"
    target = ASSETS_DIR / stored_name
    data = asset.file.read()
    target.write_bytes(data)
    return {
        "ok": True,
        "kind": asset_type,
        "filename": stored_name,
        "url": f"/integration/superadmin/catalog/assets/{stored_name}",
    }


@router.get("/catalog/assets/{filename}")
def get_catalog_asset(
    filename: str,
):
    safe = _sanitize_filename(filename)
    path = ASSETS_DIR / safe
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Asset not found")
    return FileResponse(path)


@router.post("/catalog/import-excel", response_model=dict)
def import_catalog_excel(
    workbook: UploadFile = File(...),
    _user: User = Depends(get_current_superadmin),
):
    filename = str(workbook.filename or "").strip().lower()
    if not filename.endswith((".xlsx", ".xlsm", ".xltx", ".xltm")):
        raise HTTPException(status_code=400, detail="Upload a valid Excel file (.xlsx/.xlsm/.xltx/.xltm)")

    temp_path: Path | None = None
    try:
        suffix = Path(filename).suffix or ".xlsx"
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(workbook.file.read())
            temp_path = Path(tmp.name)

        synced_rows = sync_connector_catalog_from_excel(workbook_path=temp_path)
        return {"ok": True, "synced_rows": synced_rows}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to import Excel: {exc}") from exc
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink(missing_ok=True)


@router.get("/requests", response_model=list[ConnectorRequestOut])
def list_superadmin_requests(
    tenant_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_superadmin),
):
    query = db.query(ConnectorRequest)
    if tenant_id:
        query = query.filter(ConnectorRequest.tenant_id == tenant_id)
    if status:
        if status == "CLARIFICATION_REQUIRED":
            query = query.filter(ConnectorRequest.status == ConnectorRequestStatus.PENDING)
        elif status in ConnectorRequestStatus.__members__:
            query = query.filter(ConnectorRequest.status == ConnectorRequestStatus[status])
    rows = query.order_by(ConnectorRequest.created_at.desc()).all()
    items = [request_to_out(row, db) for row in rows]
    if status == "CLARIFICATION_REQUIRED":
        items = [i for i in items if i.clarification_question]
    return items


@router.patch("/requests/{request_id}", response_model=ConnectorRequestOut)
def decide_request(
    request_id: str,
    payload: ConnectorRequestDecision,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_superadmin),
):
    row = db.query(ConnectorRequest).filter(ConnectorRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    action = payload.action.lower().strip()
    metadata = decode_request_metadata(row)
    if "internal_notes" not in metadata:
        metadata["internal_notes"] = []
    if action == "approve":
        row.status = ConnectorRequestStatus.GRANTED
        row.decision_note = payload.reason or "Approved"
        metadata["deployment_status"] = "IN_PROGRESS"
        existing = db.query(Connector).filter(Connector.tenant_id == row.tenant_id, Connector.name == row.connector_id).first()
        if not existing:
            connector_kwargs = {
                "id": str(uuid.uuid4()),
                "tenant_id": row.tenant_id,
                "name": row.connector_id,
                "category": row.connector_type or "Unknown",
                "type": "prebuilt",
                "external_url": "",
                "created_at": datetime.utcnow(),
            }
            if hasattr(Connector, "logo_url"):
                connector_kwargs["logo_url"] = getattr(row, "logo_url", None) or DEFAULT_LOGO
            if hasattr(Connector, "guide_url"):
                connector_kwargs["guide_url"] = getattr(row, "guide_url", None) or DEFAULT_GUIDE
            if hasattr(Connector, "json_url"):
                connector_kwargs["json_url"] = getattr(row, "json_url", None) or DEFAULT_JSON
            if hasattr(Connector, "version_name"):
                connector_kwargs["version_name"] = getattr(row, "version_name", None) or DEFAULT_VERSION
            connector = Connector(**connector_kwargs)
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
        metadata["internal_notes"].append(f"{datetime.utcnow().isoformat()} - {user.email}: {payload.internal_note}")
    row.decided_by_user_id = user.id
    row.decided_at = datetime.utcnow()
    encode_request_metadata(row, metadata)
    db.commit()
    db.refresh(row)
    return request_to_out(row, db)


@router.post("/requests/{request_id}/notes", response_model=ConnectorRequestOut)
def add_superadmin_note(
    request_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_superadmin),
):
    note = str(payload.get("note") or "").strip()
    if not note:
        raise HTTPException(status_code=400, detail="note is required")
    row = db.query(ConnectorRequest).filter(ConnectorRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    metadata = decode_request_metadata(row)
    notes = metadata.get("internal_notes", [])
    notes.append(f"{datetime.utcnow().isoformat()} - {user.email}: {note}")
    metadata["internal_notes"] = notes
    encode_request_metadata(row, metadata)
    db.commit()
    db.refresh(row)
    return request_to_out(row, db)
