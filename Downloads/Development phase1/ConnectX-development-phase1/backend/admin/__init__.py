# admin/__init__.py - Admin module init
from .router import router
from .superadmin_router import router as superadmin_router

__all__ = ["router", "superadmin_router"]
