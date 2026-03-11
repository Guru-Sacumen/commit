# modules/monitor/schemas.py - Monitor module specific schemas
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class MetricData(BaseModel):
    total: int
    success_rate: float
    avg_response_time_ms: int
    p95_response_time_ms: int


class ConnectorMetrics(BaseModel):
    total: int
    healthy: int
    degraded: int
    failed: int


class DataMetrics(BaseModel):
    total_gb: float
    daily_average_gb: float


class ErrorMetrics(BaseModel):
    total: int
    rate_per_hour: float
    top_errors: List[Dict[str, Any]]


class TenantMetrics(BaseModel):
    timeframe: str
    start_time: datetime
    end_time: datetime
    api_calls: MetricData
    connectors: ConnectorMetrics
    data_transferred: DataMetrics
    errors: ErrorMetrics


class Alert(BaseModel):
    id: str
    tenant_id: str
    title: str
    description: str
    severity: str
    status: str
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    source: str
    metrics: Dict[str, Any]


class ConnectorStatus(BaseModel):
    connector_id: str
    tenant_id: str
    status: str
    last_check: datetime
    uptime_percentage: float
    response_time_ms: Dict[str, int]
    success_rate: Dict[str, float]
    metrics: Dict[str, Any]
    health_checks: List[Dict[str, Any]]


class DashboardOverview(BaseModel):
    status: str
    active_alerts: int
    healthy_connectors: int
    total_connectors: int


class DashboardData(BaseModel):
    overview: DashboardOverview
    metrics: TenantMetrics
    recent_alerts: List[Alert]
    trends: Dict[str, List[Dict[str, Any]]]


class AlertAcknowledgeResponse(BaseModel):
    ok: bool
    alert_id: str
    status: str
    acknowledged_at: datetime
    acknowledged_by: str
