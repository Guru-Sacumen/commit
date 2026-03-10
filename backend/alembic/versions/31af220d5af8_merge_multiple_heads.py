"""Merge multiple heads

Revision ID: 31af220d5af8
Revises: add_tenant_slug_and_fields, create_connector_categories_table
Create Date: 2026-03-09 19:29:09.756368

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '31af220d5af8'
down_revision: Union[str, None] = ('add_tenant_slug_and_fields', 'create_connector_categories_table')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
