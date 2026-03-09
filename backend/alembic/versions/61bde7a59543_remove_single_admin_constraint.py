"""remove_single_admin_constraint

Revision ID: 61bde7a59543
Revises: 001
Create Date: 2026-03-08 00:14:04.155446

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61bde7a59543'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the single admin per tenant constraint
    op.drop_index('uq_tenant_single_admin', table_name='memberships')


def downgrade() -> None:
    # Recreate the single admin per tenant constraint
    op.create_index('uq_tenant_single_admin', 'memberships', ['tenant_id'],
                    unique=True,
                    postgresql_where=sa.text("role = 'ADMIN'"),
                    sqlite_where=sa.text("role = 'ADMIN'"))
