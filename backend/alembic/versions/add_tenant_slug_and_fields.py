"""Add slug, is_active, and updated_at to tenants table

Revision ID: add_tenant_slug_and_fields
Revises: 61bde7a59543
Create Date: 2026-03-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'add_tenant_slug_and_fields'
down_revision = '61bde7a59543'
branch_labels = None
depends_on = None


def upgrade():
    # Add slug column (nullable first, then make non-nullable after populating)
    op.add_column('tenants', sa.Column('slug', sa.String(length=100), nullable=True))
    op.add_column('tenants', sa.Column('is_active', sa.Boolean(), nullable=True))
    op.add_column('tenants', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Create unique index on slug
    op.create_index('ix_tenants_slug', 'tenants', ['slug'], unique=True)
    
    # Populate slug for existing tenants (generate from name)
    op.execute(text("""
        UPDATE tenants 
        SET slug = LOWER(REGEXP_REPLACE(
            REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'),
            '-+', '-', 'g'
        )),
        is_active = TRUE,
        updated_at = NOW()
        WHERE slug IS NULL
    """))
    
    # Handle duplicate slugs by appending id suffix
    op.execute(text("""
        UPDATE tenants 
        SET slug = slug || '-' || SUBSTRING(id, 1, 8)
        WHERE slug IN (
            SELECT slug FROM tenants 
            GROUP BY slug HAVING COUNT(*) > 1
        )
    """))
    
    # Now make columns non-nullable
    op.alter_column('tenants', 'slug', nullable=False)
    op.alter_column('tenants', 'is_active', nullable=False, server_default='true')
    op.alter_column('tenants', 'updated_at', nullable=False, server_default=sa.text('NOW()'))


def downgrade():
    # Drop columns
    op.drop_index('ix_tenants_slug', table_name='tenants')
    op.drop_column('tenants', 'slug')
    op.drop_column('tenants', 'is_active')
    op.drop_column('tenants', 'updated_at')
