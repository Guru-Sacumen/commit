# modules/testing/schemas.py - Testing module specific schemas
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class TestSuite(BaseModel):
    id: str
    name: str
    description: str
    category: str
    estimated_duration_minutes: int
    tests_count: int


class TestRunCreate(BaseModel):
    suite_id: str
    config: Dict[str, Any]
    environment: Optional[str] = "test"


class TestResult(BaseModel):
    test_name: str
    status: str
    duration_ms: int
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class TestRunResults(BaseModel):
    total_tests: int
    passed: int
    failed: int
    skipped: int
    success_rate: float
    total_duration_ms: int
    test_results: List[TestResult]


class TestRun(BaseModel):
    id: str
    tenant_id: str
    suite_id: str
    suite_name: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    results: Optional[TestRunResults] = None


class TestRunResponse(BaseModel):
    ok: bool
    run_id: str
    status: str
    message: str
