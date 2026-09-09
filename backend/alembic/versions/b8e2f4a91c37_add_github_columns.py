"""Add github_org and github_activity columns

Revision ID: b8e2f4a91c37
Revises: a3f7c9d21e04
Create Date: 2026-09-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8e2f4a91c37'
down_revision: Union[str, Sequence[str], None] = 'a3f7c9d21e04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tracked_competitors', sa.Column('github_org', sa.String(), nullable=True))
    op.add_column('briefings', sa.Column('github_activity', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('briefings', 'github_activity')
    op.drop_column('tracked_competitors', 'github_org')