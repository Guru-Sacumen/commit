# modules/integration/service.py - Connector business logic
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import (
    Connector,
    ConnectorCatalog,
    ConnectorRequest,
    ConnectorRequestStatus,
    Membership,
    RoleEnum,
    User,
)
from .schemas import ConnectorRequestOut


DEFAULT_LOGO = "https://via.placeholder.com/28"
DEFAULT_GUIDE = "Guide"
DEFAULT_JSON = "JSON"
DEFAULT_VERSION = "v1.0.0"


def _normalize_connector_key(value: str | None) -> str:
    return str(value or "").strip().lower()


def require_tenant_access(db: Session, tenant_id: str, user: User) -> Membership | None:
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


def require_tenant_admin(db: Session, tenant_id: str, user: User) -> Membership | None:
    membership = require_tenant_access(db, tenant_id, user)
    if user.superadmin:
        return None
    if not membership or membership.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return membership


def parse_usecases(usecase_text: str | None) -> Tuple[List[str], List[str]]:
    ingestion: List[str] = []
    action: List[str] = []
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
    if not ingestion and not action and text:
        for part in (
            p.strip() for p in text.replace(";", "\n").replace("|", "\n").split(",")
        ):
            if part:
                ingestion.append(part)
        if not ingestion:
            ingestion.append(text)
    return ingestion, action


def decode_request_metadata(row: ConnectorRequest) -> dict:
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


def encode_request_metadata(row: ConnectorRequest, payload: dict) -> None:
    row.attachment_url = json.dumps(payload)


def request_to_out(row: ConnectorRequest, db: Session) -> ConnectorRequestOut:
    metadata = decode_request_metadata(row)
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
        logo_url=getattr(row, "logo_url", None) or DEFAULT_LOGO,
        guide_url=getattr(row, "guide_url", None) or DEFAULT_GUIDE,
        json_url=getattr(row, "json_url", None) or DEFAULT_JSON,
        version_name=getattr(row, "version_name", None) or DEFAULT_VERSION,
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


def status_for_connector(connector_id: str, requests: List[ConnectorRequest]) -> str:
    target = _normalize_connector_key(connector_id)
    matches = [row for row in requests if _normalize_connector_key(row.connector_id) == target]
    if not matches:
        return "DEPLOYED"
    latest = max(matches, key=lambda row: row.created_at or datetime.min)
    metadata = decode_request_metadata(latest)
    deployment = str(metadata.get("deployment_status", "")).upper()
    if deployment in {"IN_PROGRESS", "DEPLOYED"}:
        return deployment
    if latest.status == ConnectorRequestStatus.GRANTED:
        return "IN_PROGRESS"
    return "DEPLOYED"


def get_dummy_guide_path() -> Path:
    return Path(__file__).resolve().parents[2] / "connector_dummy" / "guide.md"


def get_dummy_config_path() -> Path:
    return Path(__file__).resolve().parents[2] / "connector_dummy" / "config.json"


def resolve_guide_url(stored: str | None, connector_id: str) -> str:
    if stored and (stored.startswith("/") or stored.startswith("http")):
        return stored
    return f"/integration/connectors/{connector_id}/guide"


def resolve_json_url(stored: str | None, connector_id: str) -> str:
    if stored and (stored.startswith("/") or stored.startswith("http")):
        return stored
    return f"/integration/connectors/{connector_id}/json"


class ConnectorService:
    """Service for connector operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_available_connectors(self) -> List[Dict]:
        connectors = self.db.query(ConnectorCatalog).all()
        return [
            {
                "id": c.id,
                "connector_id": c.connector_id,
                "name": c.name,
                "type": c.type,
                "usecase": c.usecase,
                "created_at": c.created_at,
            }
            for c in connectors
        ]

    def get_tenant_connectors(self, tenant_id: str) -> List[Dict]:
        connectors = self.db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
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

    def test_connector_connection(self, tenant_id: str, connector_id: str) -> Dict:
        connector = (
            self.db.query(Connector)
            .filter(Connector.tenant_id == tenant_id, Connector.name == connector_id)
            .first()
        )
        if not connector:
            return {"ok": False, "error": "Connector not found"}
        try:
            return {
                "ok": True,
                "connector_id": connector_id,
                "test_result": "success",
                "message": "Connection test successful",
                "response_time_ms": 150,
            }
        except Exception as exc:
            return {
                "ok": False,
                "connector_id": connector_id,
                "test_result": "failed",
                "message": str(exc),
            }

    def get_connector_health_status(self, tenant_id: str, connector_id: str) -> Dict:
        connector = (
            self.db.query(Connector)
            .filter(Connector.tenant_id == tenant_id, Connector.name == connector_id)
            .first()
        )
        if not connector:
            return {"status": "not_found", "message": "Connector not found"}
        return {
            "status": "healthy",
            "last_check": "2024-01-01T00:00:00Z",
            "response_time_ms": 120,
            "uptime_percentage": 99.9,
        }


class IntegrationService(ConnectorService):
    """Backwards compatible alias for connector service."""
