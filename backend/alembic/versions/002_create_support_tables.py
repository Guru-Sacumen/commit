"""Create support tables

Revision ID: 002
Revises: conn_categories
Create Date: 2024-03-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = 'conn_categories'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums
    op.execute("CREATE TYPE priority_enum AS ENUM ('Low', 'Medium', 'High', 'Critical')")
    op.execute("CREATE TYPE status_enum AS ENUM ('To Do', 'In Progress', 'Resolved', 'Closed')")
    op.execute("CREATE TYPE visibility_enum AS ENUM ('internal', 'user')")
    op.execute("CREATE TYPE email_status_enum AS ENUM ('pending', 'sent', 'failed')")

    # Create tickets table
    op.create_table(
        'tickets',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('priority', sa.Enum('Low', 'Medium', 'High', 'Critical', name='priority_enum'), nullable=False, server_default='Medium'),
        sa.Column('status', sa.Enum('To Do', 'In Progress', 'Resolved', 'Closed', name='status_enum'), nullable=False, server_default='To Do'),
        sa.Column('module_reference', sa.JSON(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('assigned_to', sa.String(), nullable=True),
        sa.Column('reopened_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reopened_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes on tickets table
    op.create_index('ix_tickets_status', 'tickets', ['status'])
    op.create_index('ix_tickets_priority', 'tickets', ['priority'])
    op.create_index('ix_tickets_assigned_to', 'tickets', ['assigned_to'])
    op.create_index('ix_tickets_created_by', 'tickets', ['created_by'])
    op.create_index('ix_tickets_created_at', 'tickets', ['created_at'])
    op.create_index('ix_tickets_reopened_count', 'tickets', ['reopened_count'])
    op.create_index('ix_tickets_tenant_id', 'tickets', ['tenant_id'])

    # Create unique partial index for deduplication (concurrent ticket creation protection)
    op.execute("""
        CREATE UNIQUE INDEX uq_open_ticket_per_resource 
        ON tickets (
            (module_reference->>'module'), 
            (module_reference->>'resource_type'), 
            (module_reference->>'resource_id')
        ) 
        WHERE status != 'Closed' AND module_reference IS NOT NULL
    """)

    # Create ticket_comments table
    op.create_table(
        'ticket_comments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticket_id', sa.String(), nullable=False),
        sa.Column('author_id', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('visibility', sa.Enum('internal', 'user', name='visibility_enum'), nullable=False, server_default='user'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ticket_comments_ticket_id', 'ticket_comments', ['ticket_id'])

    # Create ticket_attachments table
    op.create_table(
        'ticket_attachments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticket_id', sa.String(), nullable=False),
        sa.Column('comment_id', sa.String(), nullable=True),
        sa.Column('uploaded_by', sa.String(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=False),
        sa.Column('storage_path', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['comment_id'], ['ticket_comments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ticket_attachments_ticket_id', 'ticket_attachments', ['ticket_id'])

    # Create escalation_logs table
    op.create_table(
        'escalation_logs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticket_id', sa.String(), nullable=False),
        sa.Column('from_priority', sa.String(), nullable=True),
        sa.Column('to_priority', sa.String(), nullable=False),
        sa.Column('from_assignee', sa.String(), nullable=True),
        sa.Column('to_assignee', sa.String(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('escalated_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['escalated_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['from_assignee'], ['users.id'], ),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_assignee'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_escalation_logs_ticket_id', 'escalation_logs', ['ticket_id'])

    # Create audit_events table
    op.create_table(
        'audit_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('entity_id', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False),
        sa.Column('event_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_events_entity_type', 'audit_events', ['entity_type'])
    op.create_index('ix_audit_events_entity_id', 'audit_events', ['entity_id'])
    op.create_index('ix_audit_events_action', 'audit_events', ['action'])
    op.create_index('ix_audit_events_created_at', 'audit_events', ['created_at'])
    op.create_index('ix_audit_events_tenant_id', 'audit_events', ['tenant_id'])

    # Create email_notifications table
    op.create_table(
        'email_notifications',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticket_id', sa.String(), nullable=True),
        sa.Column('recipient', sa.String(), nullable=False),
        sa.Column('subject', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'sent', 'failed', name='email_status_enum'), nullable=False, server_default='pending'),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_email_notifications_ticket_id', 'email_notifications', ['ticket_id'])
    op.create_index('ix_email_notifications_status', 'email_notifications', ['status'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index('ix_email_notifications_status', table_name='email_notifications')
    op.drop_index('ix_email_notifications_ticket_id', table_name='email_notifications')
    op.drop_table('email_notifications')

    op.drop_index('ix_audit_events_tenant_id', table_name='audit_events')
    op.drop_index('ix_audit_events_created_at', table_name='audit_events')
    op.drop_index('ix_audit_events_action', table_name='audit_events')
    op.drop_index('ix_audit_events_entity_id', table_name='audit_events')
    op.drop_index('ix_audit_events_entity_type', table_name='audit_events')
    op.drop_table('audit_events')

    op.drop_index('ix_escalation_logs_ticket_id', table_name='escalation_logs')
    op.drop_table('escalation_logs')

    op.drop_index('ix_ticket_attachments_ticket_id', table_name='ticket_attachments')
    op.drop_table('ticket_attachments')

    op.drop_index('ix_ticket_comments_ticket_id', table_name='ticket_comments')
    op.drop_table('ticket_comments')

    op.execute('DROP INDEX IF EXISTS uq_open_ticket_per_resource')
    op.drop_index('ix_tickets_tenant_id', table_name='tickets')
    op.drop_index('ix_tickets_reopened_count', table_name='tickets')
    op.drop_index('ix_tickets_created_at', table_name='tickets')
    op.drop_index('ix_tickets_created_by', table_name='tickets')
    op.drop_index('ix_tickets_assigned_to', table_name='tickets')
    op.drop_index('ix_tickets_priority', table_name='tickets')
    op.drop_index('ix_tickets_status', table_name='tickets')
    op.drop_table('tickets')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS email_status_enum')
    op.execute('DROP TYPE IF EXISTS visibility_enum')
    op.execute('DROP TYPE IF EXISTS status_enum')
    op.execute('DROP TYPE IF EXISTS priority_enum')
