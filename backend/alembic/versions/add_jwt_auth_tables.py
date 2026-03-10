"""Add JWT auth tables and columns

Revision ID: add_jwt_auth_001
Revises: create_connector_categories_table
Create Date: 2026-03-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_jwt_auth_001'
down_revision: Union[str, None] = 'create_connector_categories_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def column_exists(table_name, column_name):
    """Check if a column exists in a table."""
    from alembic import op
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def table_exists(table_name):
    """Check if a table exists."""
    from alembic import op
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    """
    Add JWT authentication related tables and columns.
    
    Changes:
        - Add domain column to tenants table
        - Add tenant_id and mfa_secret columns to users table
        - Create refresh_tokens table for token rotation
    """
    # Add domain column to tenants (if not exists)
    if not column_exists('tenants', 'domain'):
        op.add_column('tenants', sa.Column('domain', sa.String(), nullable=True))
        op.create_unique_constraint('uq_tenants_domain', 'tenants', ['domain'])
    
    # Add tenant_id to users (if not exists)
    if not column_exists('users', 'tenant_id'):
        op.add_column('users', sa.Column('tenant_id', sa.String(), nullable=True))
        op.create_foreign_key(
            'fk_users_tenant_id', 
            'users', 
            'tenants', 
            ['tenant_id'], 
            ['id']
        )
    
    # Add mfa_secret column to users (if not exists)
    if not column_exists('users', 'mfa_secret'):
        op.add_column('users', sa.Column('mfa_secret', sa.String(), nullable=True))
    
    # Create refresh_tokens table (if not exists)
    if not table_exists('refresh_tokens'):
        op.create_table(
            'refresh_tokens',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('token', sa.String(), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
            sa.Column('revoked', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('replaced_by', sa.String(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        
        # Create indexes for refresh_tokens
        op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
        op.create_index('ix_refresh_tokens_token', 'refresh_tokens', ['token'], unique=True)
        op.create_index('ix_refresh_tokens_expires_at', 'refresh_tokens', ['expires_at'])


def downgrade() -> None:
    """
    Revert JWT authentication changes.
    """
    # Drop refresh_tokens table
    op.drop_index('ix_refresh_tokens_expires_at', table_name='refresh_tokens')
    op.drop_index('ix_refresh_tokens_token', table_name='refresh_tokens')
    op.drop_index('ix_refresh_tokens_user_id', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    
    # Remove mfa_secret from users
    op.drop_column('users', 'mfa_secret')
    
    # Remove tenant_id from users
    op.drop_constraint('fk_users_tenant_id', 'users', type_='foreignkey')
    op.drop_column('users', 'tenant_id')
    
    # Remove domain from tenants
    op.drop_constraint('uq_tenants_domain', 'tenants', type_='unique')
    op.drop_column('tenants', 'domain')
