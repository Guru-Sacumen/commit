"""Initial database schema

Revision ID: 001_initial
Revises: None
Create Date: 2026-03-11

This migration creates all base tables for ConnectX:
- tenants: Multi-tenant organization management
- users: User accounts with basic authentication
- memberships: User-tenant relationships with roles
- connectors: Tenant-specific connector instances
- connector_catalog: Available connectors marketplace
- connector_categories: Connector categorization
- connector_requests: Connector access requests
- notifications: User notifications
- password_resets: Password reset tokens

Note: JWT auth tables are in 003_jwt_auth.py
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all base tables for ConnectX platform."""
    
    # =========================================================================
    # CORE TABLES
    # =========================================================================
    
    # Create tenants table
    op.create_table('tenants',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('domain', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('domain')
    )
    
    # Create users table (basic fields - JWT/MFA fields added in 003_jwt_auth)
    op.create_table('users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('superadmin', sa.Boolean(), nullable=True, default=False),
        sa.Column('auth_provider', sa.String(), nullable=False, server_default='LOCAL'),
        sa.Column('google_subject', sa.String(), nullable=True),
        sa.Column('mfa_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('google_subject')
    )
    
    # Create memberships table (user-tenant relationship)
    op.create_table('memberships',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('role', sa.Enum('SUPERADMIN', 'ADMIN', 'MEMBER', 'VIEWER', name='roleenum'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'user_id', name='uq_tenant_user')
    )
    
    # =========================================================================
    # CONNECTOR TABLES
    # =========================================================================
    
    # Create connector_categories table
    op.create_table('connector_categories',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create connector_catalog table (marketplace)
    op.create_table('connector_catalog',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('connector_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('usecase', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('connector_id')
    )
    
    # Create connectors table (tenant instances)
    op.create_table('connectors',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('logo_url', sa.String(), nullable=True),
        sa.Column('external_url', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create connector_requests table
    op.create_table('connector_requests',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('connector_id', sa.String(), nullable=False),
        sa.Column('connector_name', sa.String(), nullable=False),
        sa.Column('connector_type', sa.String(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'GRANTED', 'DECLINED', name='connectorrequeststatus'), nullable=False),
        sa.Column('requested_by_user_id', sa.String(), nullable=True),
        sa.Column('decided_by_user_id', sa.String(), nullable=True),
        sa.Column('decision_note', sa.String(), nullable=True),
        sa.Column('request_comment', sa.String(), nullable=True),
        sa.Column('attachment_name', sa.String(), nullable=True),
        sa.Column('attachment_url', sa.String(), nullable=True),
        sa.Column('granted_access_url', sa.String(), nullable=True),
        sa.Column('sla_due_at', sa.DateTime(), nullable=True),
        sa.Column('escalation_notified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('decided_at', sa.DateTime(), nullable=True),
        sa.Column('escalated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['decided_by_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['requested_by_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # =========================================================================
    # NOTIFICATION & AUTH TABLES
    # =========================================================================
    
    # Create notifications table
    op.create_table('notifications',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('recipient_user_id', sa.String(), nullable=False),
        sa.Column('actor_user_id', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=True),
        sa.Column('entity_id', sa.String(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['recipient_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create password_resets table
    op.create_table('password_resets',
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('token')
    )


def downgrade() -> None:
    """Drop all base tables."""
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('password_resets')
    op.drop_table('notifications')
    op.drop_table('connector_requests')
    op.drop_table('connectors')
    op.drop_table('connector_catalog')
    op.drop_table('connector_categories')
    op.drop_table('memberships')
    op.drop_table('users')
    op.drop_table('tenants')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS roleenum')
    op.execute('DROP TYPE IF EXISTS connectorrequeststatus')
