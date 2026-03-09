# schemas/connector.py - Connector related Pydantic schemas
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ConnectorCatalogCreate(BaseModel):
    connector_id: str
    name: str
    type: str
    usecase: Optional[str] = None


class ConnectorCatalogUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    usecase: Optional[str] = None


class ConnectorRequestCreate(BaseModel):
    connector_id: str
    comment: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_url: Optional[str] = None


class ConnectorRequestDecision(BaseModel):
    action: str  # "grant" or "decline"
    note: Optional[str] = None
    # when granting a request the approver can supply a URL that the
    # requesting company will use to access the connector.  This is stored
    # in the `granted_access_url` column on the request record and returned
    # in the output so the UI can show a non‑redirectable link.
    granted_access_url: Optional[str] = None


class NotificationOut(BaseModel):
    id: str
    tenant_id: str
    recipient_user_id: str
    actor_user_id: Optional[str] = None
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
