"""JWT Authentication tables and columns

Revision ID: 003_jwt_auth
Revises: 002_support
Create Date: 2026-03-11

This migration adds JWT authentication support:
- tenant_id column to users (direct tenant association)
- mfa_secret column to users (TOTP secret storage)
- totp_verified column to users (TOTP verification status)
- totp_secret column to users (alternative TOTP field)
- refresh_tokens table (JWT token rotation)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_jwt_auth'
down_revision: Union[str, None] = '002_support'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add JWT authentication related tables and columns.
    
    Changes:
        - Add tenant_id column to users table (direct FK to tenants)
        - Add mfa_secret column to users table
        - Add totp_verified column to users table
        - Add totp_secret column to users table
        - Create refresh_tokens table for token rotation
    """
    # =========================================================================
    # ADD COLUMNS TO USERS TABLE
    # =========================================================================
    
    # Add tenant_id to users (direct tenant association for JWT payload)
    op.add_column('users', sa.Column('tenant_id', sa.String(), nullable=True))
    op.create_foreign_key(
        'fk_users_tenant_id',
        'users',
        'tenants',
        ['tenant_id'],
        ['id']
    )
    
    # Add MFA/TOTP columns
    op.add_column('users', sa.Column('mfa_secret', sa.String(), nullable=True))
    op.add_column('users', sa.Column('totp_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('totp_secret', sa.String(), nullable=True))
    
    # =========================================================================
    # REFRESH TOKENS TABLE
    # =========================================================================
    
    op.create_table('refresh_tokens',
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
    # Drop refresh_tokens table and indexes
    op.drop_index('ix_refresh_tokens_expires_at', table_name='refresh_tokens')
    op.drop_index('ix_refresh_tokens_token', table_name='refresh_tokens')
    op.drop_index('ix_refresh_tokens_user_id', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    
    # Remove MFA/TOTP columns from users
    op.drop_column('users', 'totp_secret')
    op.drop_column('users', 'totp_verified')
    op.drop_column('users', 'mfa_secret')
    
    # Remove tenant_id from users
    op.drop_constraint('fk_users_tenant_id', 'users', type_='foreignkey')
    op.drop_column('users', 'tenant_id')
