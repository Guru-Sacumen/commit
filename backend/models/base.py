# models/base.py - Shared SQLAlchemy database models base
from database import Base
from enum import Enum as PyEnum


class RoleEnum(str, PyEnum):
    SUPERADMIN = "SUPERADMIN"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


class ConnectorRequestStatus(str, PyEnum):
    PENDING = "PENDING"
    GRANTED = "GRANTED"
    DECLINED = "DECLINED"
