# modules/users/schemas.py - Users module specific schemas
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime
    role: Optional[str] = None
    tenant_membership: Dict[str, Any]
    preferences: Dict[str, Any]
    statistics: Dict[str, Any]


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class UserActivity(BaseModel):
    id: str
    user_id: str
    tenant_id: str
    action: str
    description: str
    entity_type: str
    entity_id: str
    timestamp: datetime
    metadata: Dict[str, Any]


class UserPreferences(BaseModel):
    ui: Dict[str, Any]
    notifications: Dict[str, Any]
    dashboard: Dict[str, Any]
    api: Dict[str, Any]


class PreferencesUpdate(BaseModel):
    ui: Optional[Dict[str, Any]] = None
    notifications: Optional[Dict[str, Any]] = None
    dashboard: Optional[Dict[str, Any]] = None
    api: Optional[Dict[str, Any]] = None


class NotificationSettings(BaseModel):
    email_notifications: Dict[str, Any]
    push_notifications: Dict[str, Any]
    in_app_notifications: Dict[str, Any]


class NotificationSettingsUpdate(BaseModel):
    email_notifications: Optional[Dict[str, Any]] = None
    push_notifications: Optional[Dict[str, Any]] = None
    in_app_notifications: Optional[Dict[str, Any]] = None


class UserPreferencesResponse(BaseModel):
    ok: bool
    updated_sections: List[str]
    updated_at: datetime


class NotificationSettingsResponse(BaseModel):
    ok: bool
    updated_categories: List[str]
    updated_at: datetime
