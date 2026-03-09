# modules/integration/schemas.py - Integration module specific schemas
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class ConnectorTestRequest(BaseModel):
    connector_id: str
    test_type: Optional[str] = "connection"


class ConnectorTestResponse(BaseModel):
    ok: bool
    connector_id: str
    test_result: str
    message: str
    response_time_ms: Optional[int] = None
    details: Optional[Dict[str, Any]] = None


class ConnectorHealthResponse(BaseModel):
    status: str
    last_check: Optional[str] = None
    response_time_ms: Optional[int] = None
    uptime_percentage: Optional[float] = None
    error_message: Optional[str] = None


class IntegrationConfig(BaseModel):
    connector_id: str
    config: Dict[str, Any]
    enabled: bool = True


class IntegrationLog(BaseModel):
    id: str
    connector_id: str
    level: str
    message: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None
