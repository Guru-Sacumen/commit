#!/usr/bin/env python3
"""
Backfill all connectors (catalog, tenant connectors, requests) with dummy
version, logo, category, guide_url, and json_url.

These fields are NOT in the Excel. Run this script after catalog sync.

Usage:
  cd backend && python3 scripts/backfill_connector_display_data.py
"""

import sys
from pathlib import Path

_backend = Path(__file__).resolve().parents[1]
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from database import SessionLocal
from models import ConnectorCatalog, Connector, ConnectorRequest


DEFAULT_VERSION = "v1.0.0"
DEFAULT_LOGO = "https://via.placeholder.com/28"
DEFAULT_TYPE = "Unknown"


def _guide_url_for(connector_id: str) -> str:
    return f"/integration/connectors/{connector_id}/guide"


def _json_url_for(connector_id: str) -> str:
    return f"/integration/connectors/{connector_id}/json"


def backfill_catalog(db) -> int:
    """Update all connector_catalog rows with dummy display data."""
    rows = db.query(ConnectorCatalog).all()
    count = 0
    for row in rows:
        changed = False
        if row.version_name is None or not str(row.version_name).strip():
            row.version_name = DEFAULT_VERSION
            changed = True
        if row.logo_url is None or not str(row.logo_url).strip():
            row.logo_url = DEFAULT_LOGO
            changed = True
        if row.type is None or not str(row.type).strip():
            row.type = DEFAULT_TYPE
            changed = True
        guide = _guide_url_for(row.connector_id)
        if row.guide_url != guide:
            row.guide_url = guide
            changed = True
        json_url = _json_url_for(row.connector_id)
        if row.json_url != json_url:
            row.json_url = json_url
            changed = True
        if changed:
            count += 1
    return count


def backfill_connectors(db) -> int:
    """Update all tenant connectors with dummy display data."""
    rows = db.query(Connector).all()
    count = 0
    for row in rows:
        changed = False
        if row.version_name is None or not str(row.version_name).strip():
            row.version_name = DEFAULT_VERSION
            changed = True
        if row.logo_url is None or not str(row.logo_url).strip():
            row.logo_url = DEFAULT_LOGO
            changed = True
        if row.category is None or not str(row.category).strip():
            row.category = row.type or DEFAULT_TYPE
            changed = True
        guide = _guide_url_for(row.name)
        if row.guide_url != guide:
            row.guide_url = guide
            changed = True
        json_url = _json_url_for(row.name)
        if row.json_url != json_url:
            row.json_url = json_url
            changed = True
        if changed:
            count += 1
    return count


def backfill_requests(db) -> int:
    """Update all connector_requests with dummy display data."""
    rows = db.query(ConnectorRequest).all()
    count = 0
    for row in rows:
        cid = row.connector_id or row.connector_name
        if not cid:
            continue
        changed = False
        if row.version_name is None or not str(row.version_name).strip():
            row.version_name = DEFAULT_VERSION
            changed = True
        if row.logo_url is None or not str(row.logo_url).strip():
            row.logo_url = DEFAULT_LOGO
            changed = True
        if row.connector_type is None or not str(row.connector_type).strip():
            row.connector_type = DEFAULT_TYPE
            changed = True
        guide = _guide_url_for(cid)
        if row.guide_url != guide:
            row.guide_url = guide
            changed = True
        json_url = _json_url_for(cid)
        if row.json_url != json_url:
            row.json_url = json_url
            changed = True
        if changed:
            count += 1
    return count


def main() -> int:
    db = SessionLocal()
    try:
        n_catalog = backfill_catalog(db)
        n_connectors = backfill_connectors(db)
        n_requests = backfill_requests(db)
        db.commit()
        print(f"[ok] connector_catalog: {n_catalog} updated")
        print(f"[ok] connectors: {n_connectors} updated")
        print(f"[ok] connector_requests: {n_requests} updated")
        return 0
    except Exception as e:
        db.rollback()
        print(f"[error] {e}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
