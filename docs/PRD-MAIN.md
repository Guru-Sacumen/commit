================================================================================
PRD-MAIN.txt — ConnectX Enterprise Security Integration Platform
Document Type   : Main Product Requirements Document
Version         : 1.1
Status          : Draft — Pending UI Freeze & CARE/AutoNXT API Confirmation
Owner           : Prasanna
Review          : Suthan (Architect)
Organisation    : Sacumen
Last Updated    : 2026-03-06
================================================================================

IMPORTANT NOTE FOR AI (WINDSURF):
This is the master PRD. Always load this file alongside the module-level PRD
when generating code. This file defines all shared conventions, data models,
auth rules, and architecture decisions that every module must follow.
Never deviate from the rules defined here unless explicitly overridden in a
module-level PRD.

================================================================================
TABLE OF CONTENTS
================================================================================

1.  Product Overview
2.  Company & Project Context
3.  Tech Stack
4.  System Architecture
5.  Folder Structure
6.  Multi-Tenancy Model
7.  Authentication & Authorization
8.  Super Admin Tenant Switching (Impersonation)
9.  User Roles & Permissions (RBAC)
10. Database Conventions
11. Shared Data Models
12. API Conventions
13. Module Overview
14. Integration Dependencies (AutoNXT, CARE)
15. Team Structure
16. Open Questions & Blockers
17. Glossary

================================================================================
1. PRODUCT OVERVIEW
================================================================================

ConnectX is a multi-tenant enterprise console built by Sacumen.
It provides cybersecurity companies (customers) a single unified platform to:

  - View and manage their security connectors (Integration Library)
  - Validate connectors in sandbox environments (Lab Validation)
  - Run automated regression tests on connectors (Automated Testing)
  - Monitor connector health in real time using AI (Agentic Monitor)
  - Manage support tickets and escalations (Support & Incidents)

ConnectX integrates with two existing Sacumen platforms:
  - AutoNXT  : connector testing and regression engine
  - CARE     : AI-powered connector monitoring and health engine

ConnectX is the unified UI + orchestration layer on top of these services.
It does NOT rebuild what AutoNXT or CARE already do — it consumes their APIs
and presents results in the context of each customer (tenant).

Target Users:
  - Sacumen internal team (Super Admin)
  - Customer organisation admins (Org Admin)
  - Customer organisation end users (Org User)

================================================================================
2. COMPANY & PROJECT CONTEXT
================================================================================

Sacumen builds security connectors for cybersecurity companies.
ConnectX is the product that packages these connectors as a managed service
and delivers it to customers on a pay-per-use / subscription model.

WHO IS THE CUSTOMER:
  The customer is a company (e.g. "Acme Bank", "TechCorp") that uses multiple
  security tools like Splunk, CrowdStrike, ServiceNow, Microsoft Sentinel etc.
  Sacumen builds connectors BETWEEN these tools for the customer.
  CrowdStrike, Splunk, ServiceNow etc. are TOOLS — not customers.
  The customer's security team logs into ConnectX to manage their connectors.

Related Sacumen Platforms:
  AutoNXT   : existing platform — tests any connector, generates reports.
              Has its own codebase and database. ConnectX integrates via API.

  CARE      : existing platform — monitors connectors, checks vendor API docs,
              auto-enhances connectors using AI. Sacumen is building an internal
              LLM for CARE so customer data never goes to external LLMs
              (ChatGPT, Claude etc). ConnectX integrates via API.

  Knowledge Base : Sacumen internal knowledge base storing connector details
                   (inputs, outputs, schemas per product).
                   Integration scope with ConnectX is TO BE CONFIRMED (OQ5).

================================================================================
3. TECH STACK
================================================================================

Backend     : Python 3.11+, FastAPI
Database    : PostgreSQL 15 (primary)
              TimescaleDB extension (only if high-frequency telemetry needed
              in Monitor module — defer decision to Phase 2)
ORM         : SQLAlchemy 2.0 + Alembic (migrations)
Validation  : Pydantic v2
Auth        : JWT (python-jose), OAuth2 password flow
Passwords   : bcrypt (passlib)
Frontend    : React 18, React Router v6
Styling     : Tailwind CSS
HTTP Client : Axios (frontend API calls to backend)
API Style   : RESTful JSON APIs
Hosting     : TBD — AWS / GCP / Azure / On-Premise Sacumen Server
              (confirm with manager)
Secrets     : TBD — AWS Secrets Manager / HashiCorp Vault / On-Premise
              Vault solution for connector credentials
              (confirm before storing any customer API keys)

================================================================================
4. SYSTEM ARCHITECTURE
================================================================================

ConnectX follows a Monolithic architecture for V1.
Single deployable backend (FastAPI), single PostgreSQL database,
single React frontend.

High-level system diagram:

  [Customer Browser]
        |
        | HTTPS
        ↓
  [React Frontend]
  ├── Integration Library
  ├── Lab Validation
  ├── Automated Testing
  ├── Agentic Monitor
  ├── Support & Incidents
  └── User Management
        |
        | REST API calls (Axios + JWT)
        ↓
  [ConnectX FastAPI Backend]
  ├── /api/v1/integration    ← Integration Library module
  ├── /api/v1/lab            ← Lab Validation module
  ├── /api/v1/testing        ← Automated Testing module
  ├── /api/v1/monitor        ← Agentic Monitor module
  ├── /api/v1/support        ← Support & Incidents module
  └── /api/v1/users          ← User Management module
        |
        ├──────────────────────────────────────┐
        ↓                    ↓                 ↓
  [PostgreSQL DB]      [AutoNXT API]      [CARE API]
  (ConnectX data)      (test results)     (monitoring)
  ├── tenants          Used by:           Used by:
  ├── users            └── /testing       └── /monitor
  ├── connectors
  ├── tickets
  └── tenant_product
      _mapping

Auth flow:
  - User logs into ConnectX
  - ConnectX issues a signed JWT token
  - JWT contains: user_id, tenant_id, tenant_name, tenant_slug, role, expiry
  - Every API call from frontend passes JWT in Authorization header
  - Backend extracts tenant_id and role from JWT on every request
  - When calling AutoNXT or CARE, ConnectX passes the same JWT
  - AutoNXT and CARE validate JWT and extract tenant_id

IMPORTANT FOR AI: Every database query MUST filter by tenant_id.
tenant_id is ALWAYS extracted from the JWT token on the server side.
Never trust tenant_id from request body or query params.

TENANT & DATA ISOLATION RULES FOR AI:

  tenant_id  → controls DATA SCOPE
               Every query must filter by tenant_id.
               A user can NEVER see another tenant's data.

  role       → controls ACTIONS
               What the user can DO with the data they can see.
               Super Admin / Org Admin / Org User have different action rights.

  KEY RULE: All users within the same tenant (same company) see the
  same data. Their role only determines what actions they can perform.

  DATA SCOPING RULE:
  tenant_id in JWT = the customer's ORGANISATION level (not individual user).
  All users in the same org share the same tenant_id and see the same
  org-level data. Role controls what they can do with that data.

  Example:
    Acme Bank's Org Admin logs in
      → tenant_id = Acme Bank's UUID
      → sees ALL of Acme Bank's connectors (Splunk, CrowdStrike etc.)
      → can manage, raise requests, provision labs

    Acme Bank's Org User logs in
      → tenant_id = SAME Acme Bank UUID
      → sees SAME connectors as Org Admin
      → read only, cannot manage

    TechCorp's Org Admin logs in
      → tenant_id = TechCorp's UUID
      → sees ONLY TechCorp's connectors
      → can NEVER see Acme Bank's data

    Super Admin (Sacumen) logs in
      → tenant_id = null by default (global view)
      → can switch into any tenant view via org switcher
      → see Section 8 for Super Admin tenant switching

  This rule applies to ALL data sources:
    - ConnectX database  → always filter by tenant_id
    - AutoNXT API data   → mapped and filtered by tenant_id
    - CARE API data      → mapped and filtered by tenant_id
    - Lab environments   → scoped per tenant
    - Tickets            → scoped per tenant

  User-level tracking (within a tenant):
    Org-level data (connectors, labs, monitors) → filter by tenant_id
    User actions (who did what)                 → tracked by user_id
    Example: raised_by = user_id on tickets table
    
Deployment: 
    Docker (single container — monolithic)
    docker-compose for local development
    All modules live in one codebase, one container

================================================================================
5. FOLDER STRUCTURE
================================================================================

connectx/
├── docs/
│   ├── PRD-MAIN.txt
│   ├── PRD-0-user-management.txt
│   ├── PRD-1-integration-lab.txt
│   ├── PRD-2-testing-monitor.txt
│   └── PRD-3-support-ticketing.txt
│
├── backend/
│   ├── main.py                         ← FastAPI app entry point
│   ├── database.py                     ← PostgreSQL connection, session
│   ├── config.py                       ← env vars, settings
│   ├── requirements.txt                ← Python dependencies
│   ├── seed_users.py                   ← initial super admin seed data
│   ├── .env                            ← environment variables (not committed)
│   ├── .env.example                    ← env template (committed)
│   │
│   ├── auth/
│   │   ├── jwt_handler.py              ← JWT create, decode, validate
│   │   ├── dependencies.py             ← FastAPI auth dependencies
│   │   └── rbac.py                     ← role permission checks
│   │
│   ├── models/                         ← SQLAlchemy DB models (shared)
│   │   ├── base.py
│   │   ├── tenant.py
│   │   ├── user.py
│   │   ├── connector.py
│   │   └── ticket.py
│   │
│   ├── schemas/                        ← Shared Pydantic schemas
│   │   ├── user.py
│   │   ├── tenant.py
│   │   └── connector.py
│   │
│   ├── modules/
│   │   ├── integration/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── lab/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── testing/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── monitor/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   ├── support/
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   └── schemas.py
│   │   └── users/
│   │       ├── router.py
│   │       ├── service.py
│   │       └── schemas.py
│   │
│   └── alembic/
│       ├── env.py
│       ├── script.py.mako
│       └── versions/
│
├── frontend/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── App.jsx                     ← root app, router setup
│       ├── main.jsx                    ← React entry point
│       │
│       ├── auth/
│       │   ├── AuthContext.jsx         ← JWT storage, user context
│       │   └── ProtectedRoute.jsx      ← role-based route guard
│       │
│       ├── components/                 ← SHARED components (used across modules)
│       │   ├── Sidebar.jsx
│       │   ├── TopBar.jsx              ← includes org switcher for Super Admin
│       │   ├── StatusBadge.jsx
│       │   ├── TicketCard.jsx
│       │   ├── Pagination.jsx
│       │   └── ImpersonationBanner.jsx ← "Viewing as Acme Bank — Switch Back"
│       │
│       ├── modules/
│       │   ├── integration/
│       │   │   ├── pages/
│       │   │   ├── components/         ← integration-only components
│       │   │   └── services/           ← integration API calls
│       │   ├── lab/
│       │   │   ├── pages/
│       │   │   ├── components/
│       │   │   └── services/
│       │   ├── testing/
│       │   │   ├── pages/
│       │   │   ├── components/
│       │   │   └── services/
│       │   ├── monitor/
│       │   │   ├── pages/
│       │   │   ├── components/
│       │   │   └── services/
│       │   ├── support/
│       │   │   ├── pages/
│       │   │   ├── components/
│       │   │   └── services/
│       │   └── users/
│       │       ├── pages/
│       │       ├── components/
│       │       └── services/
│       │
│       ├── services/
│       │   └── api.js                  ← shared Axios client only
│       │
│       └── routes.jsx                  ← ALL frontend routes defined here
│
├── README.md
└── docker-compose.yml                  ← local dev setup (optional)

================================================================================
6. MULTI-TENANCY MODEL
================================================================================

ConnectX uses a shared database, tenant-isolated multi-tenancy model.
All tenants share one PostgreSQL database.
Every table that holds customer data MUST have a tenant_id column.
All queries MUST include WHERE tenant_id = <tenant_id from JWT>.

Tenant hierarchy:
  Sacumen (Super Admin)
    └── Customer Org A e.g. "Acme Bank"     (Org Admin + Org Users)
    └── Customer Org B e.g. "TechCorp"      (Org Admin + Org Users)
    └── Customer Org C e.g. "FinanceHouse"  (Org Admin + Org Users)

Tenant onboarding flow:
  1. Sacumen Super Admin creates a new tenant (org) in the system
  2. Super Admin creates the Org Admin account for that tenant
  3. System sends invite email to Org Admin with set-password link
  4. Org Admin sets password, logs in, manages their org

User provisioning:
  - NO self-registration. Invite-only model.
  - Org Admin invites users by entering their email
  - System sends invite email with set-password link
  - User sets password, logs in with assigned role

================================================================================
7. AUTHENTICATION & AUTHORIZATION
================================================================================

Auth method: JWT (JSON Web Tokens), OAuth2 password flow

JWT payload structure:
  {
    "user_id"         : "uuid",
    "tenant_id"       : "uuid",        ← null for Super Admin default session
    "tenant_name"     : "Acme Bank",   ← display name — UI only, never filter
    "tenant_slug"     : "acme-bank",   ← url-safe — use for logs, URLs, params
    "role"            : "super_admin | org_admin | org_user",
    "email"           : "string",
    "is_impersonating": false,         ← true when Super Admin switches tenant
    "exp"             : timestamp
  }

  tenant_name  → display only. Show on screen. NEVER use for DB filtering.
  tenant_slug  → url-safe readable identifier. Use for logs, URLs, API params.
  tenant_id    → UUID. ALWAYS use this for ALL database filtering.

CRITICAL RULES FOR AI:
  - tenant_id is ALWAYS read from JWT. Never from request body.
  - Super Admin default session: tenant_id = null, sees all tenants.
  - Super Admin impersonating: tenant_id = selected org UUID, read only.
  - Org Admin and Org User: tenant_id set, can ONLY access their org's data.
  - Every protected API endpoint must use the auth dependency to extract
    the current user and their tenant_id.
  - Unauthorized role attempting protected action → return 403 Forbidden.
  - Never expose hashed_password or invite_token in any API response.

Token handling:
  - Access token expiry  : 8 hours
  - Refresh token expiry : 7 days
  - Tokens stored in     : httpOnly cookies (not localStorage)

Cross-service auth (AutoNXT, CARE):
  V1 Workaround: ConnectX maintains tenant_to_product_mapping table
  internally. ConnectX calls AutoNXT/CARE APIs using service-level
  credentials and maps responses to tenants on ConnectX side.
  AutoNXT/CARE can use tenant_id or tenant_slug for filtering.

  V2 (Post-RSA): CARE and AutoNXT will add JWT support.
  ConnectX will pass JWT directly. They extract tenant_id natively.

================================================================================
8. SUPER ADMIN TENANT SWITCHING (IMPERSONATION)
================================================================================

Super Admin can switch into any tenant's view from the top-right org switcher.
This is called "Tenant Switching" or "Impersonation."

HOW IT WORKS:

  Step 1: Super Admin logs in normally
    JWT: { tenant_id: null, role: super_admin, is_impersonating: false }
    View: Global dashboard — sees all tenants' summary data

  Step 2: Super Admin clicks org switcher (top right corner of TopBar)
    Dropdown shows list of all active customer orgs
    Super Admin selects e.g. "Acme Bank"

  Step 3: System issues a scoped JWT
    POST /api/v1/auth/switch-tenant { tenant_id: "acme-bank-uuid" }
    New JWT: { tenant_id: acme-bank-uuid, role: super_admin,
               is_impersonating: true, tenant_name: "Acme Bank" }
    View: Now sees exactly Acme Bank's data

  Step 4: UI shows impersonation banner (ImpersonationBanner.jsx)
    "Viewing as: Acme Bank — Click to Switch Back"
    Banner always visible so Super Admin knows they are in scoped mode

  Step 5: Super Admin clicks "Switch Back"
    POST /api/v1/auth/switch-back
    JWT resets to: { tenant_id: null, is_impersonating: false }
    Returns to global dashboard

IMPERSONATION ACCESS LEVEL (V1 default):
  While impersonating — Super Admin has READ ONLY access.
  They can VIEW all data for that tenant.
  They CANNOT create, edit, or delete anything.
  Reason: Safety. Prevents accidental data changes in customer environments.
  NOTE: Confirm with manager if full write access is needed. (See OQ9)

IMPORTANT FOR AI:
  - Org switcher dropdown → visible ONLY to super_admin role
  - ImpersonationBanner  → shown ONLY when is_impersonating = true
  - When is_impersonating = true → disable all create/edit/delete buttons
  - Org Admin and Org User NEVER see the org switcher

API ENDPOINTS:
  POST /api/v1/auth/switch-tenant
    Auth: super_admin only
    Body: { tenant_id: "uuid" }
    Response: { access_token: "<new scoped JWT>" }

  POST /api/v1/auth/switch-back
    Auth: super_admin only (when is_impersonating = true)
    Response: { access_token: "<original global JWT>" }

================================================================================
9. USER ROLES & PERMISSIONS (RBAC)
================================================================================

Three roles exist in the system:

SUPER_ADMIN (Sacumen internal team only)
  - Default session: tenant_id = null (global view)
  - Can switch into any tenant view (read only while impersonating)
  - Can create, edit, deactivate tenants (customer orgs)
  - Can create Org Admin accounts for any tenant
  - Can manage the global connector catalog
  - Can assign connectors to tenants
  - Can view all tenants' data across all modules
  - Can view all support tickets across all tenants
  - Cannot be created by any other role

ORG_ADMIN (Customer organisation admin)
  - Scoped to their tenant_id only
  - Can invite and manage Org Users within their org
  - Can assign roles to users (Org User only — cannot create Org Admin)
  - Can view all modules within their org
  - Can raise connector requests
  - Can raise and manage support tickets
  - Can provision lab sandboxes
  - Can run automated tests

ORG_USER (Customer organisation end user)
  - Scoped to their tenant_id only
  - Read-only access to Integration Library
  - Read-only access to Automated Testing reports
  - Read-only access to Agentic Monitor
  - Can view support tickets (cannot create)
  - Cannot manage users
  - Cannot provision labs

Permission matrix:
  Action                          Super Admin   Org Admin   Org User
  ─────────────────────────────── ──────────── ─────────── ─────────
  Create tenant                   YES           NO          NO
  Switch tenant (impersonate)     YES           NO          NO
  Manage connector catalog        YES           NO          NO
  Assign connectors to tenant     YES           NO          NO
  View own org connectors         YES           YES         YES
  Request new connector           YES           YES         NO
  Provision lab sandbox           YES           YES         NO
  Run automated tests             YES           YES         NO
  View test reports               YES           YES         YES
  View monitor dashboard          YES           YES         YES
  Create support ticket           YES           YES         NO
  View support tickets            YES           YES         YES (own org)
  Manage users in org             YES           YES         NO
  Invite users                    YES           YES         NO

================================================================================
10. DATABASE CONVENTIONS
================================================================================

IMPORTANT FOR AI: Follow these conventions in every table and query.

Naming:
  - Table names    : snake_case, plural   (e.g. tenant_connectors)
  - Column names   : snake_case           (e.g. created_at)
  - Primary keys   : always UUID, named "id"
  - Foreign keys   : referenced_table singular + _id (e.g. tenant_id)

Required columns on every table that holds tenant data:
  - tenant_id    UUID NOT NULL  (foreign key → tenants.id)
  - created_at   TIMESTAMP NOT NULL DEFAULT now()
  - updated_at   TIMESTAMP NOT NULL DEFAULT now()

Required columns on every table (including non-tenant tables):
  - id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - created_at   TIMESTAMP NOT NULL DEFAULT now()
  - updated_at   TIMESTAMP NOT NULL DEFAULT now()

Soft deletes:
  - Never hard delete records
  - Add is_active BOOLEAN DEFAULT true on user and tenant tables
  - Add deleted_at TIMESTAMP DEFAULT null on critical tables

Migrations:
  - Use Alembic for all schema changes
  - Every migration must be reversible (has both upgrade and downgrade)
  - Never edit an existing migration — always create a new one

================================================================================
11. SHARED DATA MODELS
================================================================================

These models are shared across modules. Defined once in backend/models/.
Module-level PRDs reference these — they do not redefine them.

--- tenants ---
  id              UUID PK
  name            VARCHAR(150) NOT NULL            ← display name e.g. "Acme Bank"
  slug            VARCHAR(100) UNIQUE NOT NULL     ← url-safe e.g. "acme-bank"
  is_active       BOOLEAN DEFAULT true
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

--- users ---
  id              UUID PK
  tenant_id       UUID FK → tenants.id             ← nullable for Super Admin
  email           VARCHAR(255) UNIQUE NOT NULL
  hashed_password VARCHAR(255) NOT NULL            ← bcrypt hashed, never plain
  full_name       VARCHAR(150)
  role            VARCHAR(20) NOT NULL             ← super_admin/org_admin/org_user
  is_active       BOOLEAN DEFAULT true
  invited_by      UUID FK → users.id nullable
  invite_token    VARCHAR(255) nullable            ← cleared after first login
  last_login      TIMESTAMP
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

--- connectors (global catalog — managed by Super Admin) ---
  id              UUID PK
  name            VARCHAR(150) NOT NULL
  category        VARCHAR(50)                      ← SIEM/XDR/IAM/CSPM/EDR/etc
  logo_url        VARCHAR(255)
  description     TEXT
  vendor_name     VARCHAR(100)
  is_active       BOOLEAN DEFAULT true
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

--- tenant_connectors (which tenant has which connector) ---
  id              UUID PK
  tenant_id       UUID FK → tenants.id
  connector_id    UUID FK → connectors.id
  status          VARCHAR(30)                      ← deployed/in-progress/requested
  deployed_at     TIMESTAMP nullable
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

--- tickets (owned by Support module, referenced by all modules) ---
  id              UUID PK
  tenant_id       UUID FK → tenants.id
  type            VARCHAR(50)                      ← connector_request/
                                                     regression_failure/
                                                     connector_issue/
                                                     sla_breach/lab_issue
  title           VARCHAR(255) NOT NULL
  description     TEXT
  priority        VARCHAR(10)                      ← p1/p2/p3/p4
  status          VARCHAR(20)                      ← open/in-progress/resolved/closed
  raised_by       UUID FK → users.id
  assigned_to     UUID FK → users.id nullable
  source_module   VARCHAR(50)                      ← which module created ticket
  source_ref_id   UUID nullable                    ← id of the related object
  sla_deadline    TIMESTAMP
  resolved_at     TIMESTAMP nullable
  mttr_minutes    INTEGER nullable                 ← calculated on resolve
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

--- tenant_product_mapping (V1 workaround for AutoNXT/CARE integration) ---
  id                  UUID PK
  tenant_id           UUID FK → tenants.id
  connector_id        UUID FK → connectors.id
  autonxt_product_id  VARCHAR(100)                 ← product_id used in AutoNXT
  care_product_id     VARCHAR(100)                 ← product_id used in CARE
  created_at          TIMESTAMP
  updated_at          TIMESTAMP

================================================================================
12. API CONVENTIONS
================================================================================

Base URL       : /api/v1
Auth header    : Authorization: Bearer <jwt_token>
Content-Type   : application/json
Error format   :
  {
    "error"   : "ERROR_CODE",
    "message" : "Human readable message",
    "detail"  : {}   (optional extra info)
  }

Standard HTTP status codes:
  200  OK             → successful GET, PUT
  201  Created        → successful POST
  204  No Content     → successful DELETE
  400  Bad Request    → validation error
  401  Unauthorized   → missing or invalid JWT
  403  Forbidden      → valid JWT but insufficient role
  404  Not Found      → resource does not exist for this tenant
  422  Unprocessable  → Pydantic validation error (FastAPI default)
  500  Server Error   → unexpected backend error

Pagination (for all list endpoints):
  Query params: ?page=1&limit=20
  Response wrapper:
  {
    "data"       : [...],
    "total"      : 100,
    "page"       : 1,
    "limit"      : 20,
    "total_pages": 5
  }

IMPORTANT FOR AI:
  - All list endpoints MUST be paginated
  - All list endpoints MUST filter by tenant_id from JWT
  - Never return data from other tenants
  - Always validate input with Pydantic schemas
  - Never expose hashed_password or invite_token in any response

================================================================================
13. MODULE OVERVIEW
================================================================================

Six modules. Each has its own PRD file in /docs.
Build in this order — Module 0 first, others depend on it.

MODULE 0 — User Management              PRD: PRD-0-user-management.txt
  Team: Naveen Kumar (Frontend), Guru
  Purpose: Tenant onboarding, user invite flow, RBAC, login, JWT issuance,
           Super Admin org switcher and tenant switching.
  Key note: FOUNDATION — build and finalise this first.
            All other modules depend on auth and tenant model defined here.

MODULE 1 — Integration Library          PRD: PRD-1-integration-lab.txt
  Team: Hepsibah, Guru
  Purpose: Customer views purchased connectors, browses marketplace,
           raises new connector requests.
  Key integration: Super Admin manages connector catalog.
                   Connector requests create tickets in Support module.

MODULE 2 — Lab Validation               PRD: PRD-1-integration-lab.txt
  Team: Hepsibah, Guru
  Purpose: Customer provisions virtual or live sandboxes to test connectors
           before deploying to production.
  Two sandbox types:
    VIRTUAL SANDBOX : simulated environment, synthetic data, ConnectX hosted
    LIVE SANDBOX    : real vendor environment instance (scope TBC — see OQ3)
  Key integration: AutoNXT existing Lab (API integration — scope TBC — see OQ2)
  System library  : 524 available systems to spin up sandbox against

MODULE 3 — Automated Testing            PRD: PRD-2-testing-monitor.txt
  Team: Aishwarya
  Purpose: Continuous regression testing of connectors against partner APIs.
           Detects schema drift. Gates CI/CD releases.
  Key integration: AutoNXT API (see OQ1 for current blocker)

MODULE 4 — Agentic Monitor              PRD: PRD-2-testing-monitor.txt
  Team: Aishwarya
  Purpose: Real-time connector health telemetry. AI-driven degradation
           detection and remediation suggestions.
  Key integration: CARE API (see OQ1 for current blocker)

MODULE 5 — Support & Incidents          PRD: PRD-3-support-ticketing.txt
  Team: Vamsi, Rakshitha
  Purpose: Single source of truth for all tickets. Tracks SLA compliance,
           L2/L3 escalations, MTTR.
  Key note: Tickets can be CREATED from any module. All ticket MANAGEMENT
            (status updates, assignment, SLA tracking) happens only here.
            This module OWNS the tickets table.

================================================================================
14. INTEGRATION DEPENDENCIES
================================================================================

AutoNXT Integration:
  Status         : V1 workaround in place (JWT not yet supported by AutoNXT)
  V1 approach    : ConnectX calls AutoNXT existing APIs using service credentials.
                   tenant_to_product mapping maintained in ConnectX DB.
                   ConnectX filters and scopes results per tenant internally.
                   AutoNXT can filter using tenant_id or tenant_slug.
  V2 approach    : After RSA — AutoNXT adds JWT support.
                   ConnectX passes JWT, AutoNXT extracts tenant_id natively.
  Action needed  : AutoNXT team to share existing API docs (endpoints, params,
                   response format) before Team B can write PRD-2.

CARE Integration:
  Status         : V1 workaround in place (JWT not yet supported by CARE)
  V1 approach    : Same as AutoNXT workaround above.
  V2 approach    : After RSA — CARE adds JWT + tenant_id support to all tables.
                   CARE team estimates 10 days post-RSA.
  Action needed  : CARE team to share existing API docs before Team B can
                   finalise PRD-2 Monitor section.

Knowledge Base Integration:
  Status         : SCOPE NOT CONFIRMED (see OQ5)

================================================================================
15. TEAM STRUCTURE
================================================================================

Module                        Team Members              Consult
──────────────────────────── ───────────────────────── ──────────────────────
User Management (PRD-0)       Naveen Kumar, Guru        Prasanna, Suthan
Integration + Lab (PRD-1)     Hepsibah, Guru            Srijan, Prasanna, Suthan
Testing + Monitor (PRD-2)     Aishwarya                 Amulya, Sharon (AutoNXT)
                                                        Abhilash, Susheela (CARE)
                                                        Prasanna, Suthan
Support + Ticketing (PRD-3)   Vamsi, Rakshitha          Prasanna, Suthan

Blockers/Technical  → First contact: Prasanna → then Suthan
Manager escalation  → Abhishek

Note on Naveen (Frontend React):
  Naveen is assigned to User Management + Integration + Lab modules because
  these are the most customer-facing UI-heavy modules. He needs to define
  pages, routes, role-based rendering, and components in the PRD.
  Monitor and Support are data/reporting heavy with simpler UI — Naveen can
  support those after the first two modules are stable.

Note on Guru:
  Guru is across two modules. Work on User Management PRD first (foundation),
  then Integration + Lab PRD. One branch at a time to avoid Git conflicts.

================================================================================
16. OPEN QUESTIONS & BLOCKERS
================================================================================

OQ1 — CRITICAL BLOCKER: AutoNXT and CARE API documentation
  AutoNXT and CARE do not currently have JWT support.
  V1 workaround agreed (see Section 14).
  BUT: Team B cannot finalise PRD-2 until both teams share their existing
  API documentation (endpoints, params, response format).
  Action: Prasanna to request API docs from AutoNXT (Amulya/Sharon)
          and CARE (Abhilash/Susheela) this week.

OQ2 — Lab + AutoNXT integration scope
  Is the Lab Validation module integrating with the existing AutoNXT Lab?
  Or is ConnectX building the Lab independently?
  If AutoNXT Lab is used: what API does it expose for ConnectX to call?
  Action: Confirm with Suthan.

OQ3 — Live Sandbox model
  Who owns and maintains Live Sandbox environments (real Splunk, QRadar etc)?
  Options: (a) Sacumen maintains licensed test instances,
           (b) customer provides their own test credentials,
           (c) vendor partnerships.
  What is the cost model for Live vs Virtual Sandbox?
  Action: Confirm with manager/Suthan. Park Live Sandbox as Phase 2 if unclear.

OQ4 — UI Freeze
  PRDs are based on UI designs reviewed on 2026-03-04/05.
  If UI is changing, PRDs must be updated before development starts.
  Action: Schedule 30-minute UI review with manager this week. Freeze UI.

OQ5 — Knowledge Base integration scope
  Is ConnectX integrating with Sacumen's Knowledge Base in V1?
  If yes: when a customer raises a connector request, does it auto-link to
  Knowledge Base data and SacuNXT?
  Action: Confirm with Suthan.

OQ6 — Hosting & Infrastructure
  Which cloud provider? AWS / GCP / Azure / On-Premise?
  Action: Confirm with manager.

OQ7 — Connector credentials security
  How are customer API keys/credentials stored?
  A secrets manager is required before any credential storage is built.
  Action: Confirm with Suthan.

OQ8 — Support module — internal or external ticketing
  Custom-built internal ticket system (recommended for V1) or wrapper
  around Jira / ServiceNow?
  Action: Confirm with manager.

OQ9 — Super Admin impersonation access level
  While Super Admin is viewing a tenant (impersonating), should they have
  READ ONLY access or FULL write access?
  Current PRD default: READ ONLY (recommended for V1 safety).
  Action: Confirm with manager.

================================================================================
17. GLOSSARY
================================================================================

Term              Definition
──────────────── ─────────────────────────────────────────────────────────────
Tenant            A customer organisation using ConnectX (e.g. "Acme Bank").
Connector         An integration built by Sacumen connecting two security
                  tools (e.g. CrowdStrike → Splunk). The tools are NOT tenants.
Super Admin       Sacumen internal team. Global platform access.
Org Admin         Customer's admin user. Scoped to their organisation.
Org User          Customer's end user. Read-mostly access within their org.
JWT               JSON Web Token. Auth token used across ConnectX, AutoNXT, CARE.
tenant_id         UUID identifying which customer org a record belongs to.
                  ALWAYS used for DB filtering.
tenant_name       Display name of the tenant e.g. "Acme Bank". UI only.
                  NEVER used for filtering.
tenant_slug       URL-safe tenant identifier e.g. "acme-bank".
                  Used in logs, URLs, and API params.
Impersonation     Super Admin switching into a tenant's view to see their data.
                  is_impersonating = true in JWT. Read only in V1.
Org Switcher      Dropdown in TopBar (Super Admin only) to switch tenant view.
MTTR              Mean Time to Resolution. Average time to close a ticket.
SLA               Service Level Agreement. Time promise for ticket resolution.
SLA Breach        A ticket whose SLA deadline has passed without resolution.
Virtual Sandbox   Simulated ConnectX/AutoNXT-hosted test environment.
Live Sandbox      Real vendor environment instance for connector testing.
Schema Drift      Vendor changes their API, breaking the connector.
AutoNXT           Sacumen's existing connector testing platform.
CARE              Sacumen's existing AI-powered connector monitoring platform.
RSA               RSA Conference. CARE/AutoNXT JWT changes planned post-RSA.
PRD               Product Requirements Document.
RBAC              Role-Based Access Control.
CI/CD Gate        Automated check that blocks deployment if tests fail.
Invite-only       No self-registration. Accounts created by invite only.
bcrypt            Password hashing algorithm. All passwords hashed before storage.

================================================================================
END OF PRD-MAIN.txt
Version 1.1 — ConnectX — Sacumen — 2026-03-06
================================================================================
