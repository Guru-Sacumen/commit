"""add_connector_display_fields

Revision ID: c2a9f9e3b1d4
Revises: 31af220d5af8
Create Date: 2026-03-10 20:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c2a9f9e3b1d4"
down_revision: Union[str, None] = "31af220d5af8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_LOGO = "https://via.placeholder.com/28"
DEFAULT_GUIDE = "Guide"
DEFAULT_JSON = "JSON"
DEFAULT_VERSION = "v1.0.0"


def upgrade() -> None:
    op.add_column("connectors", sa.Column("guide_url", sa.String(), nullable=True))
    op.add_column("connectors", sa.Column("json_url", sa.String(), nullable=True))
    op.add_column("connectors", sa.Column("version_name", sa.String(), nullable=True))

    op.add_column("connector_catalog", sa.Column("logo_url", sa.String(), nullable=True))
    op.add_column("connector_catalog", sa.Column("guide_url", sa.String(), nullable=True))
    op.add_column("connector_catalog", sa.Column("json_url", sa.String(), nullable=True))
    op.add_column("connector_catalog", sa.Column("version_name", sa.String(), nullable=True))

    op.add_column("connector_requests", sa.Column("logo_url", sa.String(), nullable=True))
    op.add_column("connector_requests", sa.Column("guide_url", sa.String(), nullable=True))
    op.add_column("connector_requests", sa.Column("json_url", sa.String(), nullable=True))
    op.add_column("connector_requests", sa.Column("version_name", sa.String(), nullable=True))

    op.execute(
        f"""
        UPDATE connectors
        SET
          logo_url = COALESCE(NULLIF(logo_url, ''), '{DEFAULT_LOGO}'),
          guide_url = COALESCE(NULLIF(guide_url, ''), '{DEFAULT_GUIDE}'),
          json_url = COALESCE(NULLIF(json_url, ''), '{DEFAULT_JSON}'),
          version_name = COALESCE(NULLIF(version_name, ''), '{DEFAULT_VERSION}')
        """
    )
    op.execute(
        f"""
        UPDATE connector_catalog
        SET
          logo_url = COALESCE(NULLIF(logo_url, ''), '{DEFAULT_LOGO}'),
          guide_url = COALESCE(NULLIF(guide_url, ''), '{DEFAULT_GUIDE}'),
          json_url = COALESCE(NULLIF(json_url, ''), '{DEFAULT_JSON}'),
          version_name = COALESCE(NULLIF(version_name, ''), '{DEFAULT_VERSION}')
        """
    )
    op.execute(
        f"""
        UPDATE connector_requests
        SET
          logo_url = COALESCE(NULLIF(logo_url, ''), '{DEFAULT_LOGO}'),
          guide_url = COALESCE(NULLIF(guide_url, ''), '{DEFAULT_GUIDE}'),
          json_url = COALESCE(NULLIF(json_url, ''), '{DEFAULT_JSON}'),
          version_name = COALESCE(NULLIF(version_name, ''), '{DEFAULT_VERSION}')
        """
    )


def downgrade() -> None:
    op.drop_column("connector_requests", "version_name")
    op.drop_column("connector_requests", "json_url")
    op.drop_column("connector_requests", "guide_url")
    op.drop_column("connector_requests", "logo_url")

    op.drop_column("connector_catalog", "version_name")
    op.drop_column("connector_catalog", "json_url")
    op.drop_column("connector_catalog", "guide_url")
    op.drop_column("connector_catalog", "logo_url")

    op.drop_column("connectors", "version_name")
    op.drop_column("connectors", "json_url")
    op.drop_column("connectors", "guide_url")
