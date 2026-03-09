# modules/lab/schemas.py - Lab module specific schemas
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class ValidationCreate(BaseModel):
    connector_id: str
    config: Dict[str, Any]
    test_type: Optional[str] = "full"


class ValidationResponse(BaseModel):
    id: str
    tenant_id: str
    connector_id: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    created_by: str
    test_results: Optional[Dict[str, Any]] = None
    config: Dict[str, Any]


class ValidationResult(BaseModel):
    test_name: str
    status: str
    message: Optional[str] = None
    duration_ms: Optional[int] = None
    details: Optional[Dict[str, Any]] = None


class ValidationSummary(BaseModel):
    total_tests: int
    passed: int
    failed: int
    skipped: int
    success_rate: float
    total_duration_ms: int


class ConnectorValidationRequest(BaseModel):
    connector_id: str
    validation_config: Dict[str, Any]
    test_suite: Optional[str] = "standard"


class ConnectorValidationResponse(BaseModel):
    ok: bool
    validation_id: str
    connector_id: str
    status: str
    test_results: Dict[str, Any]
    completed_at: datetime
    summary: ValidationSummary
