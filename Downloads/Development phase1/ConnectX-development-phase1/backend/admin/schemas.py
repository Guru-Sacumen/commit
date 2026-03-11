# admin/schemas.py - Admin module specific schemas
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class TenantOverview(BaseModel):
    id: str
    name: str
    created_at: datetime
    user_count: int
    connector_count: int
    status: str


class TenantDetails(BaseModel):
    id: str
    name: str
    created_at: datetime
    statistics: Dict[str, Any]
    recent_activity: List[Dict[str, Any]]
    health_status: str


class TenantUser(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    created_at: datetime
    joined_at: datetime
    last_login: datetime
    status: str
    auth_provider: str
    mfa_enabled: bool


class UserCreate(BaseModel):
    email: str
    full_name: str
    role: str = "MEMBER"
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None


class TenantConnector(BaseModel):
    id: str
    name: str
    category: str
    type: str
    status: str
    created_at: datetime
    last_used: datetime
    usage_count: int


class ActivityLog(BaseModel):
    id: str
    tenant_id: str
    type: str
    description: str
    user_id: Optional[str] = None
    timestamp: datetime
    metadata: Dict[str, Any]


class TenantStatistics(BaseModel):
    timeframe: str
    start_date: datetime
    end_date: datetime
    api_metrics: Dict[str, Any]
    user_metrics: Dict[str, Any]
    connector_metrics: Dict[str, Any]


class AdminDashboard(BaseModel):
    overview: Dict[str, Any]
    recent_activity: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]
    metrics: Dict[str, Any]


class SystemOverview(BaseModel):
    system_stats: Dict[str, Any]
    health_status: Dict[str, Any]
    recent_system_events: List[Dict[str, Any]]


class SystemMetrics(BaseModel):
    timeframe: str
    api_metrics: Dict[str, Any]
    system_metrics: Dict[str, Any]
    database_metrics: Dict[str, Any]


class ServiceHealth(BaseModel):
    name: str
    status: str
    response_time_ms: Optional[int] = None
    pending_jobs: Optional[int] = None
    available_space_gb: Optional[float] = None
    last_check: datetime


class SystemHealth(BaseModel):
    overall_status: str
    services: List[ServiceHealth]
    alerts: List[Dict[str, Any]]


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    tenant_id: str
    created_at: datetime
    status: str
    created_by: str


class UserUpdateResponse(BaseModel):
    ok: bool
    user_id: str
    updated_fields: List[str]
    updated_at: datetime
    updated_by: str


class UserDeleteResponse(BaseModel):
    ok: bool
    user_id: str
    deleted_at: datetime
    deleted_by: str
