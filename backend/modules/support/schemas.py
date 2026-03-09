# modules/support/schemas.py - Support module specific schemas
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class TicketCreate(BaseModel):
    title: str
    description: str
    priority: str = "medium"
    category: str = "general"


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None


class CommentCreate(BaseModel):
    content: str
    is_internal: bool = False


class Ticket(BaseModel):
    id: str
    tenant_id: str
    title: str
    description: str
    status: str
    priority: str
    category: str
    created_by: str
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    comments_count: int


class Comment(BaseModel):
    id: str
    ticket_id: str
    author: str
    content: str
    is_internal: bool
    created_at: datetime


class TicketDetail(BaseModel):
    id: str
    tenant_id: str
    title: str
    description: str
    status: str
    priority: str
    category: str
    created_by: str
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    comments: List[Comment]


class KnowledgeBaseArticle(BaseModel):
    id: str
    title: str
    category: str
    summary: str
    content: str
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    views: int


class TicketResponse(BaseModel):
    ok: bool
    ticket_id: str
    updated_fields: List[str]
    updated_at: datetime


class CommentResponse(BaseModel):
    id: str
    ticket_id: str
    author: str
    content: str
    is_internal: bool
    created_at: datetime
