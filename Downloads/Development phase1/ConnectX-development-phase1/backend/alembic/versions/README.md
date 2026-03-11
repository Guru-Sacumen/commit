# Consolidated Alembic Migrations

## Overview

This folder contains **consolidated migrations** that replace the fragmented migration files in the `versions/` folder.

## Why Consolidated?

The original `versions/` folder had **10 migration files** with:
- Branching complexity (two parallel branches)
- Missing tables (tickets table was never created)
- Merge migrations adding complexity
- Hard to debug and maintain

The consolidated approach uses **only 3 migrations**:
1. `001_initial_schema.py` - All base tables (users, tenants, connectors)
2. `002_support_module.py` - All support module tables (tickets, comments, etc.)
3. `003_jwt_auth.py` - JWT authentication (refresh tokens, MFA columns)

## Migration Comparison

### Old Structure (Problematic)
```
001 → 61bde7a59543 → [BRANCH]
                    ├── 001b → 002 → 003 → 004
                    └── add_usecase → conn_categories → add_jwt_auth
                                            ↓
                              a376e2c0012a (merge)
```

### New Structure (Clean)
```
001_initial → 002_support → 003_jwt_auth
```

## How to Use

### For New Team Members (Fresh Database)

```bash
# 1. Backup old versions folder
mv alembic/versions alembic/versions_old

# 2. Use consolidated versions
mv alembic/versions_consolidated alembic/versions

# 3. Run migrations
alembic upgrade head

# 4. Seed data
PYTHONPATH=. python seed_users.py
```

### For Existing Databases

If you already have data in your database:

```bash
# Option 1: Drop and recreate (if data is not important)
sudo -u postgres dropdb connectx
sudo -u postgres createdb connectx
alembic upgrade head
PYTHONPATH=. python seed_users.py

# Option 2: Manual migration (if data is important)
# Contact the team lead for assistance
```

## Tables Created

### Migration 001_initial_schema.py
- `tenants` - Multi-tenant organizations
- `users` - User accounts with basic auth
- `memberships` - User-tenant relationships
- `connector_categories` - Connector categorization
- `connector_catalog` - Available connectors
- `connectors` - Tenant connector instances
- `connector_requests` - Access requests
- `notifications` - User notifications
- `password_resets` - Password reset tokens

### Migration 002_support_module.py
- `tickets` - Support tickets
- `ticket_sequences` - Ticket number generation
- `ticket_comments` - Ticket comments
- `ticket_attachments` - File attachments
- `escalation_logs` - Escalation history
- `audit_events` - Audit trail
- `email_notifications` - Email tracking

### Migration 003_jwt_auth.py
- `refresh_tokens` - JWT token rotation
- `users.tenant_id` - Direct tenant association
- `users.mfa_secret` - MFA secret storage
- `users.totp_verified` - TOTP verification status
- `users.totp_secret` - TOTP secret storage
