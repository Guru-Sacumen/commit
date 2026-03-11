# modules/support/schemas.py - Support module Pydantic schemas
from pydantic import BaseModel, Field, field_validator, ConfigDict, field_serializer
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from enum import Enum


def serialize_datetime(dt: datetime) -> str:
    """
    Serialize datetime to ISO format with UTC timezone.
    
    Args:
        dt: datetime object (naive or aware)
        
    Returns:
        str: ISO format string with 'Z' suffix for UTC
    """
    if dt is None:
        return None
    # If datetime is naive, assume it's UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace('+00:00', 'Z')


class PriorityEnum(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class StatusEnum(str, Enum):
    TODO = "To Do"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    CLOSED = "Closed"


class VisibilityEnum(str, Enum):
    INTERNAL = "internal"
    USER = "user"


class ModuleEnum(str, Enum):
    INTEGRATION_LIBRARY = "integration_library"
    LAB = "lab"
    AUTOMATED_TESTING = "automated_testing"
    AGENTIC_MONITOR = "agentic_monitor"


class ModuleReference(BaseModel):
    module: ModuleEnum
    resource_type: str
    resource_id: str

    @field_validator('resource_type')
    @classmethod
    def validate_resource_type(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("resource_type cannot be empty")
        return v.strip()

    @field_validator('resource_id')
    @classmethod
    def validate_resource_id(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("resource_id cannot be empty")
        return v.strip()


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1, max_length=10000)
    priority: PriorityEnum = PriorityEnum.MEDIUM
    module_reference: Optional[ModuleReference] = None
    metadata: Optional[Dict[str, Any]] = None
    force_create: bool = False

    @field_validator('title', mode='before')
    @classmethod
    def truncate_title(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            if len(v) > 200:
                return v[:200]
        return v

    @field_validator('description')
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if len(v) == 0:
            raise ValueError("description cannot be empty")
        if len(v) > 10000:
            raise ValueError("description cannot exceed 10000 characters")
        return v


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None, min_length=1, max_length=10000)
    priority: Optional[PriorityEnum] = None

    @field_validator('title', mode='before')
    @classmethod
    def truncate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and isinstance(v, str):
            v = v.strip()
            if len(v) > 200:
                return v[:200]
        return v


class TicketResponse(BaseModel):
    """
    Ticket response schema with all fields needed for display.
    """
    id: str
    ticket_number: str
    tenant_id: str
    title: str
    description: str
    priority: PriorityEnum
    status: StatusEnum
    module_reference: Optional[Dict[str, Any]] = None
    created_by: str
    created_by_user_id: Optional[str] = None
    created_by_name: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    reopened_count: int
    reopened_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('created_at', 'updated_at', 'reopened_at')
    def serialize_dt(self, dt: datetime) -> str:
        return serialize_datetime(dt) if dt else None


class DuplicateTicketInfo(BaseModel):
    id: str
    ticket_number: str
    title: str
    status: StatusEnum
    created_at: datetime
    url: str
    
    @field_serializer('created_at')
    def serialize_dt(self, dt: datetime) -> str:
        return serialize_datetime(dt)


class TicketCreateResponse(BaseModel):
    is_duplicate: bool
    existing_ticket_id: Optional[str] = None
    existing_ticket: Optional[DuplicateTicketInfo] = None
    ticket_id: Optional[str] = None
    ticket: Optional[TicketResponse] = None
    message: str


class TicketListResponse(BaseModel):
    tickets: List[TicketResponse]
    total: int
    page: int
    page_size: int


class TicketPreviewRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1, max_length=10000)
    priority: PriorityEnum = PriorityEnum.MEDIUM
    module_reference: Optional[ModuleReference] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator('title', mode='before')
    @classmethod
    def truncate_title(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            if len(v) > 200:
                return v[:200]
        return v


class PreviewData(BaseModel):
    title: str
    module: Optional[str] = None
    priority: PriorityEnum
    description: str
    metadata: Optional[Dict[str, Any]] = None
    attachments: List[str] = []


class ValidationError(BaseModel):
    field: str
    message: str


class TicketPreviewResponse(BaseModel):
    preview: Optional[PreviewData] = None
    validation_errors: List[ValidationError] = []
    is_valid: bool


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)
    visibility: VisibilityEnum = VisibilityEnum.USER

    @field_validator('body')
    @classmethod
    def validate_body(cls, v: str) -> str:
        v = v.strip()
        if len(v) == 0:
            raise ValueError("comment body cannot be empty")
        return v


class CommentResponse(BaseModel):
    id: str
    ticket_id: str
    author_id: str
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None
    body: str
    visibility: VisibilityEnum
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('created_at', 'updated_at')
    def serialize_dt(self, dt: datetime) -> str:
        return serialize_datetime(dt)


class CommentListResponse(BaseModel):
    ticket_id: str
    comments: List[CommentResponse]
    total_count: int
    page: int
    page_size: int
    has_more: bool


class CommentUpdate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)


class AttachmentUpload(BaseModel):
    filename: str
    file_size: int
    mime_type: str

    @field_validator('file_size')
    @classmethod
    def validate_file_size(cls, v: int) -> int:
        max_size = 10 * 1024 * 1024  # 10MB
        if v > max_size:
            raise ValueError(f"file size cannot exceed {max_size} bytes (10MB)")
        if v <= 0:
            raise ValueError("file size must be positive")
        return v

    @field_validator('mime_type')
    @classmethod
    def validate_mime_type(cls, v: str) -> str:
        allowed_types = [
            'application/pdf',
            'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
            'text/plain', 'text/csv',
            'application/json', 'application/xml',
            'application/zip', 'application/x-tar',
            'text/x-log'
        ]
        if v not in allowed_types:
            raise ValueError(f"mime type {v} not allowed")
        return v


class AttachmentResponse(BaseModel):
    id: str
    ticket_id: str
    uploaded_by_id: str
    uploaded_by_name: Optional[str] = None
    filename: str
    file_size: int
    mime_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('created_at')
    def serialize_dt(self, dt: datetime) -> str:
        return serialize_datetime(dt)


class AttachmentListResponse(BaseModel):
    ticket_id: str
    attachments: List[AttachmentResponse]
    total_count: int


class AttachmentUploadResponse(BaseModel):
    ok: bool
    attachment: AttachmentResponse
    message: str


class SignedUrlResponse(BaseModel):
    url: str
    expires_at: datetime
    filename: str


class EscalationCreate(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)
    to_priority: PriorityEnum
    to_assignee: Optional[str] = None

    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v: str) -> str:
        v = v.strip()
        if len(v) == 0:
            raise ValueError("escalation reason cannot be empty")
        return v


class EscalationResponse(BaseModel):
    id: str
    ticket_id: str
    from_priority: Optional[str] = None
    to_priority: str
    from_assignee: Optional[str] = None
    to_assignee: Optional[str] = None
    reason: str
    escalated_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EscalationHistoryResponse(BaseModel):
    escalations: List[EscalationResponse]
    total: int


class BoardTicket(BaseModel):
    id: str
    ticket_number: str
    title: str
    priority: PriorityEnum
    assigned_to: Optional[str] = None
    created_at: datetime
    module_reference: Optional[Dict[str, Any]] = None


class BoardColumn(BaseModel):
    status: StatusEnum
    tickets: List[BoardTicket]
    count: int


class BoardResponse(BaseModel):
    columns: List[BoardColumn]
    total_tickets: int


class ActivityEvent(BaseModel):
    event_type: str
    actor_name: str
    timestamp: datetime
    description: str
    
    @field_serializer('timestamp')
    def serialize_timestamp(self, dt: datetime) -> str:
        return serialize_datetime(dt)


class ActivityTimelineResponse(BaseModel):
    events: List[ActivityEvent]
    total: int


class StatusUpdateRequest(BaseModel):
    new_status: StatusEnum


class StatusUpdateResponse(BaseModel):
    ok: bool
    ticket_id: str
    old_status: str
    new_status: str
    updated_at: datetime
    message: str
    
    @field_serializer('updated_at')
    def serialize_updated_at(self, dt: datetime) -> str:
        return serialize_datetime(dt)
