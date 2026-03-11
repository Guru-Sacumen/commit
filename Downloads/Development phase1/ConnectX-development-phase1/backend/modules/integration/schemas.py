# modules/integration/schemas.py - Consolidated connector schemas
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ConnectorCatalogCreate(BaseModel):
    connector_id: str
    name: str
    type: str
    usecase: Optional[str] = None
    logo_url: Optional[str] = None
    guide_url: Optional[str] = None
    json_url: Optional[str] = None
    version_name: Optional[str] = None


class ConnectorCatalogUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    usecase: Optional[str] = None
    logo_url: Optional[str] = None
    guide_url: Optional[str] = None
    json_url: Optional[str] = None
    version_name: Optional[str] = None


class TenantConnectorCreate(BaseModel):
    connector_id: str
    name: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = None
    logo_url: Optional[str] = None
    external_url: Optional[str] = None


class ConnectorUsecaseOut(BaseModel):
    connector_id: str
    connector_name: str
    connector_type: str
    ingestion: list[str] = Field(default_factory=list)
    action: list[str] = Field(default_factory=list)


class ConnectorCardOut(BaseModel):
    connector_id: str
    name: str
    type: str
    logo_url: Optional[str] = None
    guide_url: Optional[str] = None
    json_url: Optional[str] = None
    version_name: Optional[str] = None
    status: Optional[str] = None
    usecase: Optional[str] = None
    created_at: Optional[datetime] = None


class ConnectorStatsOut(BaseModel):
    total_purchased: int
    deployed: int
    in_progress: int
    marketplace_total: int


class ConnectorRequestCreate(BaseModel):
    connector_id: str
    selected_ingestion: list[str] = Field(default_factory=list)
    selected_action: list[str] = Field(default_factory=list)
    custom_ingestion_text: Optional[str] = None
    custom_action_text: Optional[str] = None
    needs_guidance: bool = False


class ConnectorRequestRespond(BaseModel):
    clarification_response: str


class ConnectorRequestDecision(BaseModel):
    action: str  # approve | decline | clarify
    reason: Optional[str] = None
    question: Optional[str] = None
    internal_note: Optional[str] = None


class ConnectorRequestOut(BaseModel):
    id: str
    tenant_id: str
    connector_id: str
    connector_name: str
    connector_type: str
    logo_url: Optional[str] = None
    guide_url: Optional[str] = None
    json_url: Optional[str] = None
    version_name: Optional[str] = None
    status: str
    requested_by_user_id: Optional[str] = None
    requested_by_email: Optional[str] = None
    requested_by_name: Optional[str] = None
    selected_ingestion: list[str] = Field(default_factory=list)
    selected_action: list[str] = Field(default_factory=list)
    custom_ingestion_text: Optional[str] = None
    custom_action_text: Optional[str] = None
    needs_guidance: bool = False
    clarification_question: Optional[str] = None
    clarification_response: Optional[str] = None
    internal_notes: list[str] = Field(default_factory=list)
    decision_note: Optional[str] = None
    created_at: Optional[datetime] = None
    decided_at: Optional[datetime] = None
