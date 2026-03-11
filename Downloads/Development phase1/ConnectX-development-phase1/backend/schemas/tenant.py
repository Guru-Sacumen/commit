# schemas/tenant.py - Tenant related Pydantic schemas
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from models import RoleEnum


class TenantUpdate(BaseModel):
    name: str


class CompanyCreate(BaseModel):
    name: str
    admin_email: EmailStr
    admin_full_name: str
    admin_password: str
    connectors: list[str] = []  # list of connector ids to mark as purchased


class CompanyAdminCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class TenantConnectorCreate(BaseModel):
    connector_id: str
    name: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = None
    logo_url: Optional[str] = None
    external_url: Optional[str] = None
