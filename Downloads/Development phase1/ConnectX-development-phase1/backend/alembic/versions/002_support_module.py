"""Support module tables

Revision ID: 002_support
Revises: 001_initial
Create Date: 2026-03-11

This migration creates all support module tables:
- tickets: Support ticket management
- ticket_sequences: Sequential ticket number generation per tenant
- ticket_comments: Ticket comments with visibility control
- ticket_attachments: File attachments for tickets
- escalation_logs: Escalation history tracking
- audit_events: Audit trail for ticket actions
- email_notifications: Email notification tracking
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_support'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all support module tables."""
    
    # =========================================================================
    # TICKETS TABLE
    # =========================================================================
    
    op.create_table('tickets',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticket_number', sa.String(20), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('priority', sa.String(20), nullable=False, server_default='Medium'),
        sa.Column('status', sa.String(20), nullable=False, server_default='To Do'),
        sa.Column('module_reference', sa.JSON(), nullable=True),
        sa.Column('created_by_user_id', sa.String(), nullable=False),
        sa.Column('assigned_to_user_id', sa.String(), nullable=True),
        sa.Column('reopened_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reopened_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['assigned_to_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes on tickets
    # ticket_number is unique per tenant, not globally
    op.create_index('ix_tickets_tenant_ticket_number', 'tickets', ['tenant_id', 'ticket_number'], unique=True)
    op.create_index('ix_tickets_tenant_id', 'tickets', ['tenant_id'])
    op.create_index('ix_tickets_status', 'tickets', ['status'])
    op.create_index('ix_tickets_priority', 'tickets', ['priority'])
    op.create_index('ix_tickets_assigned_to', 'tickets', ['assigned_to_user_id'])
    op.create_index('ix_tickets_created_by', 'tickets', ['created_by_user_id'])
    op.create_index('ix_tickets_created_at', 'tickets', ['created_at'])
    
    # =========================================================================
    # TICKET SEQUENCES TABLE
    # =========================================================================
    
    op.create_table('ticket_sequences',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('last_number', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id')
    )
    
    # =========================================================================
    # TICKET COMMENTS TABLE
    # =========================================================================
    
    op.create_table('ticket_comments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticket_id', sa.String(), nullable=False),
        sa.Column('author_id', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('visibility', sa.String(), nullable=False, server_default='user'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_ticket_comments_ticket_id', 'ticket_comments', ['ticket_id'])
    op.create_index('ix_ticket_comments_author_id', 'ticket_comments', ['author_id'])
    op.create_index('ix_ticket_comments_created_at', 'ticket_comments', ['created_at'])
    
    # =========================================================================
    # TICKET ATTACHMENTS TABLE
    # =========================================================================
    
    op.create_table('ticket_attachments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticket_id', sa.String(), nullable=False),
        sa.Column('uploaded_by_id', sa.String(), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('stored_filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_ticket_attachments_ticket_id', 'ticket_attachments', ['ticket_id'])
    op.create_index('ix_ticket_attachments_uploaded_by_id', 'ticket_attachments', ['uploaded_by_id'])
    
    # =========================================================================
    # ESCALATION LOGS TABLE
    # =========================================================================
    
    op.create_table('escalation_logs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticket_id', sa.String(), nullable=False),
        sa.Column('escalated_by_id', sa.String(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('old_priority', sa.String(), nullable=True),
        sa.Column('new_priority', sa.String(), nullable=True),
        sa.Column('old_assignee_id', sa.String(), nullable=True),
        sa.Column('new_assignee_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['escalated_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['old_assignee_id'], ['users.id']),
        sa.ForeignKeyConstraint(['new_assignee_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_escalation_logs_ticket_id', 'escalation_logs', ['ticket_id'])
    op.create_index('ix_escalation_logs_created_at', 'escalation_logs', ['created_at'])
    
    # =========================================================================
    # AUDIT EVENTS TABLE
    # =========================================================================
    
    op.create_table('audit_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('entity_id', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False),
        sa.Column('event_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_audit_events_entity', 'audit_events', ['entity_type', 'entity_id'])
    op.create_index('ix_audit_events_created_at', 'audit_events', ['created_at'])
    op.create_index('ix_audit_events_tenant_id', 'audit_events', ['tenant_id'])
    
    # =========================================================================
    # EMAIL NOTIFICATIONS TABLE
    # =========================================================================
    
    op.create_table('email_notifications',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ticket_id', sa.String(), nullable=True),
        sa.Column('recipient', sa.String(), nullable=False),
        sa.Column('subject', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'sent', 'failed', name='email_status_enum'), nullable=False, server_default='pending'),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_email_notifications_ticket_id', 'email_notifications', ['ticket_id'])
    op.create_index('ix_email_notifications_status', 'email_notifications', ['status'])


def downgrade() -> None:
    """Drop all support module tables."""
    
    # Drop indexes and tables in reverse order
    op.drop_index('ix_email_notifications_ticket_id', table_name='email_notifications')
    op.drop_index('ix_email_notifications_status', table_name='email_notifications')
    op.drop_table('email_notifications')
    
    op.drop_index('ix_audit_events_tenant_id', table_name='audit_events')
    op.drop_index('ix_audit_events_created_at', table_name='audit_events')
    op.drop_index('ix_audit_events_entity', table_name='audit_events')
    op.drop_table('audit_events')
    
    op.drop_index('ix_escalation_logs_created_at', table_name='escalation_logs')
    op.drop_index('ix_escalation_logs_ticket_id', table_name='escalation_logs')
    op.drop_table('escalation_logs')
    
    op.drop_index('ix_ticket_attachments_uploaded_by_id', table_name='ticket_attachments')
    op.drop_index('ix_ticket_attachments_ticket_id', table_name='ticket_attachments')
    op.drop_table('ticket_attachments')
    
    op.drop_index('ix_ticket_comments_created_at', table_name='ticket_comments')
    op.drop_index('ix_ticket_comments_author_id', table_name='ticket_comments')
    op.drop_index('ix_ticket_comments_ticket_id', table_name='ticket_comments')
    op.drop_table('ticket_comments')
    
    op.drop_table('ticket_sequences')
    
    op.drop_index('ix_tickets_created_at', table_name='tickets')
    op.drop_index('ix_tickets_created_by', table_name='tickets')
    op.drop_index('ix_tickets_assigned_to', table_name='tickets')
    op.drop_index('ix_tickets_priority', table_name='tickets')
    op.drop_index('ix_tickets_status', table_name='tickets')
    op.drop_index('ix_tickets_tenant_id', table_name='tickets')
    op.drop_index('ix_tickets_tenant_ticket_number', table_name='tickets')
    op.drop_table('tickets')
