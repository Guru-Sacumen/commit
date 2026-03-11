# auth/rbac.py - Role-based access control checks
from models import User, Membership, RoleEnum


def check_permission(user: User, permission: str) -> bool:
    """Check if user has a specific permission"""
    # Superadmins have all permissions
    if user.superadmin:
        return True
    
    # Define permission mappings
    role_permissions = {
        RoleEnum.ADMIN: [
            "manage_users",
            "manage_connectors",
            "view_analytics",
            "approve_requests",
            "manage_company",
        ],
        RoleEnum.MEMBER: [
            "view_connectors",
            "request_connectors",
            "view_own_profile",
        ],
        RoleEnum.VIEWER: [
            "view_connectors",
            "view_own_profile",
        ],
    }
    
    # Get user's primary role (first membership)
    # In a real implementation, you might want to handle multiple memberships
    user_role = RoleEnum.MEMBER  # default
    
    # This is a simplified check - in practice you'd query the user's actual role
    # from their membership in the relevant tenant context
    
    return permission in role_permissions.get(user_role, [])


def can_manage_tenant_users(user: User, tenant_id: str) -> bool:
    """Check if user can manage users in a tenant"""
    if user.superadmin:
        return True
    
    # Check if user is admin of the tenant
    # This would require a database query in practice
    return False


def can_approve_connector_requests(user: User) -> bool:
    """Check if user can approve connector requests"""
    return user.superadmin


def can_access_tenant(user: User, tenant_id: str) -> bool:
    """Check if user can access a specific tenant"""
    if user.superadmin:
        return True
    
    # Check if user has membership in the tenant
    # This would require a database query in practice
    return False


def get_user_permissions(user: User) -> list:
    """Get all permissions for a user"""
    if user.superadmin:
        return ["*"]  # All permissions
    
    # Get permissions based on user's role
    # This would require database queries in practice
    return []
