# ConnectX Integration PRD: Integration Library Module

**Parent Document**: ConnectX Master PRD v1.0  
**Module**: Core Platform — Integration Library (Prebuilt & Marketplace)  
**Version**: 1.0  
**Status**: Draft  
**Date**: March 5, 2026

---

## 1. Overview

### 1.1 ConnectX Context
ConnectX is a unified web console that integrates internal products into a single enterprise dashboard. It employs a persistent left sidebar for navigation, a top bar with global search, environment badge, and user profile controls, and a tabbed central content area. This document defines the integration requirements for the Integration Library module — the default landing tab and primary connector management surface.

### 1.2 Module Integration Scope
This PRD covers the integration of:

| ConnectX Module | System | Purpose |
|---|---|---|
| Integration Library | **Integration Library Service** | Prebuilt connector catalog, marketplace browsing, use case selection, connector request lifecycle, and marketplace-to-prebuilt promotion |

### 1.3 Integration Relationship to Parent PRD
- **Dependencies**: Depends on ConnectX core infrastructure (navigation, layout, design system) and User Management module (JWT auth, roles, tenant context) defined in their respective PRDs.
- **Scope**: Integration Library is the first sidebar item, the default landing tab for non-Super-Admin users, and the central surface for connector procurement and management.
- **Alignment**: Follows ConnectX UX specifications (Helvetica typography, 8-point grid, semantic color system, light theme for catalog views), architectural patterns, and security standards.
- **Extensibility**: Connector data feeds downstream into Lab Validation, AutoNXT, and CARE modules.

### 1.4 Deployment Context
The Integration Library system is deployed on VM infrastructure and exposes REST endpoints that ConnectX will call to manage connector catalogs, marketplace listings, and connector requests. ConnectX acts as the presentation and orchestration layer.

### 1.5 Integration Value Proposition
- Single pane of glass for connector procurement, deployment tracking, and marketplace discovery.
- Structured use case selection (Ingestion + Action) for informed connector requests.
- End-to-end request lifecycle with Super Admin approval and marketplace-to-prebuilt promotion.
- Replaces manual connector management workflows.

---

## 2. Objectives

### 2.1 Primary Objectives
- **Connector Lifecycle Hub**: Enable connector discovery, procurement, deployment status tracking, and marketplace browsing through a unified interface.
- **Informed Requests**: Allow users to select specific Ingestion and Action use cases when requesting a connector, with options for custom needs and guidance.
- **Approval Workflow**: Route connector requests through Super Admin review with approve/decline/clarify actions.
- **Marketplace-to-Prebuilt Promotion**: Automatically move approved connectors into the tenant's purchased connector library.

### 2.2 ConnectX Platform Alignment Objectives
- **Consistent UX**: Maintain ConnectX Helvetica typography, 8-point spacing grid, semantic color palette, and component patterns as specified in the UX Specifications.
- **Predictability over Novelty**: Use established SaaS patterns for zero-minute learning curve.
- **Progressive Disclosure**: Present aggregate metrics first (Total Purchased, Total Deployed), with detail on demand via modals and drill-downs.
- **Light Theme Context**: Integration Library uses the light theme (white background, slate text) per UX specification for catalog/management views.

### 2.3 Success Metrics

| Metric | Target |
|---|---|
| API response time (p95) | < 2 seconds |
| Dashboard initial load | < 3 seconds |
| Marketplace search results | < 1 second |
| Connector operations via ConnectX | 90% adoption within 3 months |
| UX compliance | 100% adherence to ConnectX design system |

---

## 3. Architecture

### 3.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│              ConnectX Platform Core                        │
│  (Navigation, Layout, Design System, Global Search)        │
│  + User Management Module (JWT Auth, Roles, Tenant)        │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
               ┌───────────────────┐
               │  Integration      │
               │  Layer — Library   │
               │                   │
               │  • FastAPI routes │
               │  • Pydantic models│
               │  • React module   │
               │  • Pagination     │
               │  • Search/Filter  │
               │  • Request Mgmt  │
               └───────────────────┘
                          │
                          ▼
               ┌───────────────────┐
               │  Library VM       │
               │                   │
               │  • Connector      │
               │    Catalog        │
               │  • Marketplace    │
               │    Inventory      │
               │  • Use Case DB   │
               └───────────────────┘
```

### 3.2 Backend (Python FastAPI)

- **FastAPI Framework**: Async API routes for connector catalog, marketplace, use case retrieval, and request management.
- **Pydantic Models**: Request/response validation for all connector and request data.
- **SQLAlchemy**: ORM for ConnectX PostgreSQL interactions (connector cache, request records).
- **JWT Middleware**: Leverages User Management JWT for tenant context and role-based access on every route.
- **SMTP Integration**: Email notifications for request lifecycle events (submission, approval, decline, clarification, deployment).
- **Async HTTP Client (httpx)**: Communication with external Library VM endpoints.

### 3.3 Frontend (React)

- **Integration Library Tab**: Default landing tab with executive widgets, purchased connector grid, marketplace toggle with search/filter, paginated card grid.
- **Connector Request Modal**: Use case selection interface with Ingestion/Action checkboxes, custom request fields, and "Not Sure" option.
- **Connector Request Tickets**: Status tracking for submitted requests (user/admin view).
- **Super Admin Request Queue**: Review interface with approve/decline/clarify actions.
- **ConnectX Component Library**: Cards, widgets, toggle switches, pills, pagination, modals — following UX Specifications.
- **React Router**: Navigation and drill-down capabilities.

### 3.4 Integration Patterns

- **Gateway Pattern**: All external VM calls routed through ConnectX FastAPI backend; VM is never exposed to browser.
- **Adapter Pattern**: FastAPI transforms external responses to ConnectX-standard format (Pydantic models).
- **Middleware Pattern**: JWT auth from User Management module applied to all routes.

---

## 4. Functional Requirements

### 4.1 Purchased Connectors (Prebuilt)

- **FR-IL-001**: Display purchased connectors in a responsive card grid (4 columns at 1080p, 3 at laptop, fluid scaling per UX spec `auto-fill, minmax(280px, 1fr)`).
- **FR-IL-002**: Each connector card displays: vendor logo, connector name, category, and deployment status pill.
- **FR-IL-003**: Deployment status shown as colored pills: "Deployed" (green/success) and "In Progress" (amber/warning).
- **FR-IL-004**: Executive summary widgets displayed above the grid: Total Connectors Purchased (blue accent), Total Connectors Deployed (green accent), Total Connectors in Progress (amber accent).
- **FR-IL-005**: Connector categories supported include: SIEM, EDR, Ticketing, SOAR, CSPM, IAM, SSE, Observability, Vuln Mgmt, Identity, Email Sec, Comms, Network.

### 4.2 Marketplace

- **FR-IL-006**: Toggle switch to alternate between "View Purchased" and "Marketplace" views.
- **FR-IL-007**: Marketplace displays a search input with placeholder "Search marketplace..." and real-time filtering.
- **FR-IL-008**: Category dropdown filter (All Categories, SIEM, EDR, Vuln Mgmt — additional categories: *Information Not Provided*).
- **FR-IL-009**: Marketplace connector cards display: vendor logo, connector name, category, and a "Request Connector" action button.
- **FR-IL-010**: Paginated marketplace grid with page number navigation.
- **FR-IL-011**: Marketplace toolbar (search + category filter) is visible only when the Marketplace toggle is active.

### 4.3 Connector Request — Use Case Selection

When a user clicks "Request Connector" on a marketplace card, the system opens a use case selection workflow. Each connector has its own unique, pre-reviewed set of use cases organized into two categories:

- **Ingestion** — data collection capabilities (e.g., pulling logs, importing alerts, collecting telemetry). The number and type of ingestion use cases vary per connector based on its category and capabilities.
- **Action** — automated response and operation capabilities (e.g., triggering remediation, executing playbooks, initiating containment). The number and type of action use cases vary per connector.

Use cases are connector-specific and managed by the Integration Library VM. ConnectX retrieves them dynamically via the `/connectors/{id}/usecases` API endpoint when the request modal is opened.

#### Use Case Data Structure

Each use case entry contains:

| Field | Description |
|---|---|
| id | Unique use case identifier (scoped to the connector) |
| type | `ingestion` or `action` |
| description | Human-readable description of the capability |

The number of use cases per connector is not fixed — a SIEM connector may have 7 ingestion and 7 action use cases, while an IAM connector may have 3 ingestion and 2 action use cases. The modal dynamically renders whatever the API returns.

#### Functional Requirements

- **FR-IL-012**: On clicking "Request Connector", the system fetches the use cases for that specific connector from the Library VM and opens a modal displaying the connector's name, category, and all its reviewed use cases grouped under **Ingestion** and **Action** headings.
- **FR-IL-013**: Each use case has a checkbox allowing the user to select or deselect it.
- **FR-IL-014**: By default, no use cases are pre-selected — the user must explicitly choose which capabilities they need.
- **FR-IL-015**: Below the Ingestion list, a "Request New Ingestion" input field allows the user to describe a custom ingestion use case not in the reviewed list.
- **FR-IL-016**: Below the Action list, a "Request New Action" input field allows the user to describe a custom action use case not in the reviewed list.
- **FR-IL-017**: A "Not Sure / Need Guidance" checkbox option is available for users who are uncertain about which use cases to select. When checked, the request is flagged for review with a guidance consultation.
- **FR-IL-018**: The request submission includes: connector ID, selected ingestion use case IDs, selected action use case IDs, any custom ingestion/action text, the "not sure" flag, requesting user ID, and tenant ID.
- **FR-IL-019**: On successful submission, a confirmation toast is shown to the user, and an email notification is sent to the tenant admin(s) and the requesting user.

### 4.4 Connector Request — Approval Lifecycle

This section defines the end-to-end lifecycle of a connector request from submission through Super Admin review to provisioning and notification.

#### Request Routing

- **FR-IL-020**: On submission, the connector request is routed to the **Super Admin** for review. The Super Admin receives an email notification and sees the request in their admin dashboard under the **Connector Requests** queue.
- **FR-IL-021**: The Company Admin who submitted (or whose user submitted) the request also sees it tracked as a **ticket** in their Connector Requests section with status updates.

#### Super Admin Review

- **FR-IL-022**: Super Admin can view all pending connector requests across all tenants, including: connector name, category, requesting tenant, requesting user, selected Ingestion/Action use cases, any custom use case text, and the "Not Sure" flag.
- **FR-IL-023**: Super Admin can take one of the following actions on each request:
  - **Approve** — grants the connector to the requesting tenant.
  - **Decline** — rejects the request with a mandatory reason/note.
  - **Request Clarification** — sends the request back to the requester for more detail.
- **FR-IL-024**: Super Admin can add internal notes to any request (visible only to Super Admins).

#### Approval → Marketplace to Prebuilt Promotion

- **FR-IL-025**: When a Super Admin **approves** a connector request, the connector is automatically moved from the Marketplace catalog to the tenant's **Prebuilt (Purchased)** list with an initial status of "In Progress".
- **FR-IL-026**: The approved connector appears in the tenant's Integration Library "View Purchased" grid with the "In Progress" status pill. The executive widget counts (Total Purchased, Total In Progress) update accordingly.
- **FR-IL-027**: Once the connector is fully deployed/configured, its status changes from "In Progress" to "Deployed".

#### Ticket Tracking for Requester

- **FR-IL-028**: The requesting user and/or Company Admin can track the request status in their **Connector Requests** section. The ticket displays:
  - Connector name and category
  - Submitted date
  - Selected use cases (Ingestion + Action)
  - Current status: `Pending Review` → `Approved` / `Declined` / `Clarification Needed`
  - Super Admin notes (decline reason or clarification question)
  - Resolution date (when approved or declined)
- **FR-IL-029**: Users can respond to a "Clarification Needed" status by updating the ticket with additional information, which re-routes it to the Super Admin queue.

#### Notifications

- **FR-IL-030**: On request submission → email to Super Admin(s) + confirmation to requester and tenant admin(s).
- **FR-IL-031**: On approval → email to the requesting user and tenant admin(s) confirming the connector has been granted and is now in their Prebuilt list.
- **FR-IL-032**: On decline → email to the requesting user and tenant admin(s) with the decline reason.
- **FR-IL-033**: On clarification request → email to the requesting user and tenant admin(s) with the Super Admin's question.
- **FR-IL-034**: On connector status change from "In Progress" to "Deployed" → email to the requesting user and tenant admin(s) confirming the connector is live.

### 4.5 Global Search Integration

- **FR-IL-035**: Top bar global search ("Search connectors, endpoints...") queries both purchased and marketplace connectors.
- **FR-IL-036**: Search results follow ConnectX standardized result format.

---

## 5. Data Flow

### 5.1 Purchased Connectors Flow

```
User navigates to Integration Library tab (default)
  → React component mounts
    → GET /connectx/api/library/connectors/purchased (ConnectX FastAPI)
      → Proxy to Library VM
      → Transform response (Pydantic models)
      → Cache in ConnectX
    → Render executive widgets (aggregate counts)
    → Render connector card grid
```

### 5.2 Marketplace Flow

```
User toggles to Marketplace view
  → Marketplace toolbar appears (search + category filter)
    → GET /connectx/api/library/marketplace?page=1&category=All&search= (ConnectX FastAPI)
      → Proxy to Library VM
      → Transform + paginate response
    → Render marketplace card grid with pagination
```

### 5.3 Connector Request with Use Case Selection Flow

```
User clicks "Request Connector" on a marketplace card
  → GET /connectx/api/library/connectors/{id}/usecases (ConnectX FastAPI)
    → Proxy to Library VM
    → Return structured list of Ingestion and Action use cases
  → Modal opens showing:
    ┌─────────────────────────────────────────────────┐
    │  Connector: {connector_name} ({category})       │
    │                                                 │
    │  ▸ INGESTION USE CASES                          │
    │    ☐ {Ingestion use case 1 for this connector}  │
    │    ☐ {Ingestion use case 2 for this connector}  │
    │    ☐ {... dynamically rendered per connector}   │
    │    [+ Request New Ingestion: _____________ ]    │
    │                                                 │
    │  ▸ ACTION USE CASES                             │
    │    ☐ {Action use case 1 for this connector}     │
    │    ☐ {Action use case 2 for this connector}     │
    │    ☐ {... dynamically rendered per connector}   │
    │    [+ Request New Action: _____________ ]       │
    │                                                 │
    │  ☐ Not Sure / Need Guidance                     │
    │                                                 │
    │  [Cancel]                    [Submit Request]   │
    └─────────────────────────────────────────────────┘

  → User selects use cases / enters custom requests / checks "Not Sure"
  → User clicks "Submit Request"
    → POST /connectx/api/library/marketplace/request (ConnectX FastAPI)
      Payload:
        connector_id, tenant_id, user_id,
        selected_ingestion_ids: [...],
        selected_action_ids: [...],
        custom_ingestion_text: "...",
        custom_action_text: "...",
        needs_guidance: true/false
      → Forward to Library VM
      → Store request in ConnectX DB (status = "Pending Review")
      → Send email to Super Admin(s) (async)
      → Send confirmation email to requesting user + tenant admin(s) (async)
    → Confirmation toast shown to user
    → Request appears as ticket in user's Connector Requests section
```

### 5.4 Super Admin Approval & Marketplace-to-Prebuilt Flow

```
Super Admin opens Connector Requests queue (Admin Dashboard)
  → GET /superadmin/connector-requests (ConnectX FastAPI)
    → Return all requests across tenants with status, use cases, notes
  → Super Admin reviews request details

  OPTION A: Approve
    → PATCH /superadmin/connector-requests/{id} { action: "approve" }
      → Update request status → "Approved"
      → Promote connector: move from Marketplace to tenant's Prebuilt list
        → POST /connectx/api/library/connectors/purchased (internal)
          → Create purchased connector record for tenant (status = "In Progress")
          → Update executive widget counts (+1 Purchased, +1 In Progress)
      → Send approval email to requesting user + tenant admin(s)
      → Update ticket status in requester's view
    → Connector now visible in tenant's "View Purchased" grid

  OPTION B: Decline
    → PATCH /superadmin/connector-requests/{id} { action: "decline", reason: "..." }
      → Update request status → "Declined"
      → Send decline email with reason to requesting user + tenant admin(s)
      → Update ticket status in requester's view

  OPTION C: Request Clarification
    → PATCH /superadmin/connector-requests/{id} { action: "clarify", question: "..." }
      → Update request status → "Clarification Needed"
      → Send email with question to requesting user + tenant admin(s)
      → User responds via ticket → status returns to "Pending Review"
      → Super Admin re-notified

Later — Connector fully deployed:
  → Status changes from "In Progress" to "Deployed"
    → Send deployment confirmation email to requesting user + tenant admin(s)
    → Executive widget: +1 Deployed, -1 In Progress
```

### 5.5 Data Storage

- **ConnectX PostgreSQL**: Connector catalog cache, connector requests with selected use cases, request status timeline.
- **Audit Trail**: All connector requests and status changes logged server-side.
- **Email Queue**: Notifications dispatched asynchronously via configured SMTP.

---

## 6. API Interaction Model

### 6.1 Gateway Architecture

- All external VM calls routed through ConnectX FastAPI gateway.
- JWT middleware (from User Management module) authenticates and extracts tenant/role context on every request.
- Pydantic models validate and transform data between ConnectX format and VM format.
- Email dispatch is fire-and-forget (failures logged, never block API response).
- OpenAPI documentation auto-generated for all endpoints.

### 6.2 Connector Catalog Endpoints

| ConnectX Route | VM Route | Method | Description |
|---|---|---|---|
| `/connectx/api/library/connectors/purchased` | *Information Not Provided* | GET | List tenant's purchased connectors |
| `/connectx/api/library/connectors/{id}` | *Information Not Provided* | GET | Get single connector detail |
| `/connectx/api/library/connectors/{id}/usecases` | *Information Not Provided* | GET | Get Ingestion and Action use cases for a connector |
| `/connectx/api/library/marketplace` | *Information Not Provided* | GET | Search/browse marketplace |
| `/connectx/api/library/marketplace/request` | *Information Not Provided* | POST | Submit connector request with selected use cases |
| `/connectx/api/library/connectors/stats` | *Information Not Provided* | GET | Aggregate counts (purchased, deployed, in-progress) |

### 6.3 Super Admin — Connector Request Management Endpoints

| ConnectX Route | Method | Description |
|---|---|---|
| `/superadmin/connector-requests` | GET | List all connector requests across tenants (filterable by status, tenant, category) |
| `/superadmin/connector-requests/{id}` | GET | Get full request detail (use cases, custom text, notes, history) |
| `/superadmin/connector-requests/{id}` | PATCH | Update request: approve, decline (with reason), or request clarification |
| `/superadmin/connector-requests/{id}/notes` | POST | Add internal Super Admin note to request |

### 6.4 Tenant — Connector Request Ticket Endpoints

| ConnectX Route | Method | Description |
|---|---|---|
| `/tenant/{tenant_id}/connector-requests` | GET | List connector requests for the tenant (visible to Admin and requesting user) |
| `/tenant/{tenant_id}/connector-requests/{id}` | GET | Get ticket detail with status timeline and notes |
| `/tenant/{tenant_id}/connector-requests/{id}/respond` | POST | User responds to "Clarification Needed" status |

> **Note**: Actual Library VM base URL, auth method, endpoint paths, and response schemas are *Information Not Provided*.

### 6.5 Service Discovery Configuration

```yaml
external_services:
  integration_library:
    base_url: "Information Not Provided"
    auth_type: "Information Not Provided"
    timeout: 30000
    retry_policy: "exponential_backoff"
```

### 6.6 Data Models

#### 6.6.1 Connector Card (ConnectX Format)
```json
{
  "id": "splunk-enterprise",
  "name": "Splunk Enterprise",
  "category": "SIEM",
  "domain": "splunk.com",
  "status": "Deployed | In Progress",
  "tenant_id": "uuid",
  "connectxMetadata": {
    "purchasedAt": "2026-01-15T00:00:00Z",
    "deployedAt": "2026-02-01T00:00:00Z"
  }
}
```

#### 6.6.2 Marketplace Item (ConnectX Format)
```json
{
  "id": "ibm-qradar",
  "name": "IBM QRadar",
  "category": "SIEM",
  "domain": "ibm.com",
  "description": "Information Not Provided",
  "requestable": true
}
```

#### 6.6.3 Connector Use Cases (ConnectX Format)

Each connector has its own unique set of use cases. The structure is the same across all connectors, but the content (number of items, descriptions) varies per connector.

```json
{
  "connector_id": "string",
  "connector_name": "string",
  "category": "string",
  "ingestion_usecases": [
    { "id": "uc-ing-001", "description": "Connector-specific ingestion capability" },
    { "id": "uc-ing-002", "description": "..." }
  ],
  "action_usecases": [
    { "id": "uc-act-001", "description": "Connector-specific action capability" },
    { "id": "uc-act-002", "description": "..." }
  ]
}
```

> The number of ingestion and action use cases is not fixed — it depends on the connector's category and capabilities as maintained by the Library VM.

#### 6.6.4 Connector Request (ConnectX Format)
```json
{
  "id": "req-uuid",
  "connector_id": "string",
  "connector_name": "string",
  "category": "string",
  "tenant_id": "uuid",
  "tenant_name": "string",
  "requested_by": "user-uuid",
  "requested_by_name": "string",
  "requested_by_role": "ADMIN | MEMBER",
  "selected_ingestion_ids": ["uc-ing-xxx", "..."],
  "selected_action_ids": ["uc-act-xxx", "..."],
  "custom_ingestion_text": "string | empty",
  "custom_action_text": "string | empty",
  "needs_guidance": false,
  "status": "Pending Review | Approved | Declined | Clarification Needed",
  "reviewed_by": "superadmin-uuid | null",
  "decline_reason": "string | empty",
  "clarification_question": "string | empty",
  "clarification_response": "string | empty",
  "internal_notes": [],
  "promoted_connector_id": "null | purchased-connector-uuid",
  "created_at": "ISO-8601 timestamp",
  "updated_at": "ISO-8601 timestamp",
  "resolved_at": "ISO-8601 timestamp | null"
}
```

#### 6.6.5 Request Status Timeline Entry
```json
{
  "timestamp": "2026-03-05T15:00:00Z",
  "status": "Approved",
  "actor": "superadmin-uuid",
  "actor_name": "Platform Admin",
  "actor_role": "SUPERADMIN",
  "message": "Approved — connector added to your Prebuilt library."
}
```

---

## 7. Dashboard Integration

### 7.1 Sidebar Navigation
Integration Library is the first item in the sidebar under "Enterprise Console":

```yaml
main_navigation:
  - id: "integration-library"
    label: "Integration Library"
    icon: "grid"  # 4-square grid icon
    order: 1
    theme: "light"
```

### 7.2 Integration Library Layout (Light Theme)

```
┌─────────────────────────────────────────────────────────────┐
│  Section Header                                             │
│  H1: "Integration Library"                                  │
│  Subtitle: "Manage your purchased ConnectX integrations,    │
│  deployment status, and expand your ecosystem."              │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┐
│ Total        │ Total        │ Total        │
│ Connectors   │ Connectors   │ Connectors   │
│ Purchased    │ Deployed     │ in Progress  │
│ [24]         │ [18]         │ [6]          │
│ (blue line)  │ (green line) │ (amber line) │
└──────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────┐
│  [View Purchased (24)] [Marketplace (1,058+)]│  ← Toggle Switch
│                                             │
│  (If Marketplace active):                   │
│  [🔍 Search marketplace...] [All Categories]│  ← Marketplace Toolbar
└─────────────────────────────────────────────┘

┌─────────┬─────────┬─────────┬─────────┐
│ Card    │ Card    │ Card    │ Card    │  ← Responsive Grid
│ [Logo]  │ [Logo]  │ [Logo]  │ [Logo]  │    auto-fill, minmax(280px, 1fr)
│ [Pill]  │ [Pill]  │ [Pill]  │ [Pill]  │
│ Name    │ Name    │ Name    │ Name    │
│ Category│ Category│ Category│ Category│
└─────────┴─────────┴─────────┴─────────┘

┌─────────────────────────────────────────────┐
│      [1] [2] [3] ... [88]                   │  ← Pagination (Marketplace)
└─────────────────────────────────────────────┘
```

### 7.3 Connector Card Design (Per UX Specifications)
- Background: `var(--bg-card)` / `#ffffff`. Border: `1px solid var(--border-light)` / `#e2e8f0`.
- Border radius: `16px` (`--radius-lg`). Padding: `24px`.
- Hover: `translateY(-4px)`, shadow increase, border color → `var(--brand-blue)`.
- Vendor logo: `48x48px`, `12px` border radius, white background with subtle shadow.
- Status pill: `11px`, `800` weight, `20px` border radius, uppercase.
  - Deployed: green background `rgba(16, 185, 129, 0.1)`, green text.
  - In Progress: amber background `rgba(245, 158, 11, 0.1)`, amber text.
- Card title: `16px`, `700` weight. Category text: `13px`, `600` weight, muted color.

### 7.4 Executive Widget Design (Per UX Specifications)
- Responsive grid: `repeat(auto-fit, minmax(200px, 1fr))`.
- Card: white background, `16px` radius, subtle shadow, colored bottom border (`4px`).
- Label: `13px`, `700` weight, uppercase, muted color. Value: `32px`, `800` weight.

### 7.5 Toggle Switch Design (Per UX Specifications)
- Container: `var(--border-light)` background, `12px` border radius, `6px` padding.
- Active button: white background, main text color, medium shadow. Inactive: muted text, no background.

### 7.6 Connector Request Modal (Use Case Selection)
When "Request Connector" is clicked, a modal overlay opens:

```
┌─────────────────────────────────────────────────────────────┐
│  [X Close]                                                  │
│                                                             │
│  [Logo]  {Connector Name}                                   │
│          {Category}                                         │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  INGESTION USE CASES                                        │
│  (dynamically rendered — varies per connector)              │
│  ☐ {Ingestion use case 1}                                   │
│  ☐ {Ingestion use case 2}                                   │
│  ☐ {Ingestion use case N}                                   │
│                                                             │
│  + Request New Ingestion:                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Describe your custom ingestion need...              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ACTION USE CASES                                           │
│  (dynamically rendered — varies per connector)              │
│  ☐ {Action use case 1}                                      │
│  ☐ {Action use case 2}                                      │
│  ☐ {Action use case N}                                      │
│                                                             │
│  + Request New Action:                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Describe your custom action need...                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  ☐ Not Sure / Need Guidance                                 │
│    (Your request will be reviewed by the team and they      │
│     will reach out to help identify the right use cases)    │
│                                                             │
│  [Cancel]                              [Submit Request]     │
└─────────────────────────────────────────────────────────────┘
```

**Modal Design:** Overlay `rgba(0,0,0,0.85)` with `backdrop-filter: blur(5px)`. Modal `var(--bg-card)` background, `16px` radius, `40px` padding, max-width `650px`, max-height `90vh` with scroll. Close button top-right `40×40px`. Animation `cubic-bezier(0.16, 1, 0.3, 1)` entry.

### 7.7 Super Admin — Connector Request Queue

```
┌─────────────────────────────────────────────────────────────────┐
│  Connector Requests                                    [Filter] │
│  Review and manage connector requests from all tenants          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Pending Review (3) ──────────────────────────────────────┐  │
│  │                                                           │  │
│  │  [Logo] {Connector Name}  ·  {Category}                   │  │
│  │  Requested by: {User Name} ({Tenant Name})  ·  {time ago} │  │
│  │  Ingestion: N selected  ·  Action: N selected             │  │
│  │  [View Details]   [Approve]  [Decline]  [Ask Clarification]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Recently Resolved ───────────────────────────────────────┐  │
│  │  [Logo] Qualys  ·  Vuln Mgmt  ·  Approved  ·  3d ago     │  │
│  │  [Logo] Snyk  ·  CSPM  ·  Declined  ·  5d ago             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

- Filter by status, tenant, category. Approve triggers marketplace-to-prebuilt promotion. Decline requires reason. Internal notes visible only to Super Admins.

### 7.8 Company Admin / User — Connector Request Tickets

```
┌─────────────────────────────────────────────────────────────────┐
│  My Connector Requests                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Logo] {Connector A}  ·  {Category}                            │
│  Status: ● Pending Review                                       │
│  Submitted: {date}                                               │
│  Ingestion: {selected use case summaries}                        │
│  Action: {selected use case summaries}                           │
│                                                                 │
│  [Logo] {Connector B}  ·  {Category}                            │
│  Status: ✓ Approved — moved to your Prebuilt library             │
│  Submitted: {date}  ·  Resolved: {date}                          │
│                                                                 │
│  [Logo] {Connector C}  ·  {Category}                            │
│  Status: ✗ Declined                                              │
│  Reason: "{decline reason from Super Admin}"                     │
│                                                                 │
│  [Logo] {Connector D}  ·  {Category}                            │
│  Status: ⚠ Clarification Needed                                 │
│  Question: "{clarification question from Super Admin}"           │
│  [Respond]                                                       │
└─────────────────────────────────────────────────────────────────┘
```

- Status badges: blue (Pending), green (Approved), red (Declined), amber (Clarification). Approved tickets link to Prebuilt grid. "Respond" button on clarification tickets.

### 7.9 Responsive Behavior (Per UX Specifications)

| Breakpoint | Columns | Behavior |
|---|---|---|
| > 1200px | 4+ | Full grid, all widgets visible |
| 1000–1200px | 3 | Fluid scaling, no squishing |
| < 600px | 1–2 | Cards stack, pagination adapts |

### 7.10 Theme
- Integration Library: **Light theme** (background `#f8fafc`, cards `#ffffff`, text `#0f172a`).
- Per UX Specification: light theme is used for catalog/management contexts.

---

## 8. Security

### 8.1 Authentication & Authorization
- Leverages User Management module JWT for all access control.
- Tenant ID from JWT determines which purchased connectors are visible.
- Role determines access level (see RBAC below).

### 8.2 Role-Based Access Control (RBAC)

| Role | Integration Library Access |
|---|---|
| Super Admin | Full — all tenants, approve/decline connector requests |
| Company Admin | Full — own tenant connectors, submit requests, view tickets |
| Member | View own tenant connectors, submit requests, view own tickets |

### 8.3 Tenant Isolation
- Purchased connector data filtered by tenant context from JWT.
- Marketplace is shared (read-only catalog); connector requests are tenant-scoped.
- Approved connectors are promoted only into the requesting tenant's Prebuilt list.

### 8.4 Data Protection
- TLS for all communication between ConnectX and Library VM.
- All connector request actions produce server-side audit logs.

### 8.5 Network Security
- Library VM endpoints accessible only from ConnectX backend (not from browser).
- Firewall/network configuration: *Information Not Provided* — depends on VM deployment.

---

## 9. Non-Functional Requirements

### 9.1 Performance (Per UX Specifications)

| Metric | Target |
|---|---|
| API response time (p95) | < 2 seconds |
| Dashboard initial load (FCP) | < 1.5 seconds |
| Time to Interactive (TTI) | < 3.5 seconds |
| Total page weight | < 500KB (excluding images) |
| Marketplace search results | < 1 second |
| Animation completion | < 400ms |
| Animation frame rate | 60 fps (hardware-accelerated) |
| Lighthouse performance score | > 90 |

### 9.2 Availability & Reliability
- Integration layer: 99.9% uptime target.
- Graceful degradation when Library VM is unavailable (cached data, error state UI).
- Email failures must not block connector request operations.
- Retry with exponential backoff for transient external failures.

### 9.3 Scalability
- Stateless FastAPI integration layer (horizontally scalable).
- Paginated endpoints to handle large connector catalogs (1,058+ marketplace items).

### 9.4 Usability (Per UX Specifications)
- Zero-minute learning curve via established SaaS patterns.
- Minimum clickable area: `40×40px` for all interactive elements.
- Pagination buttons: `36×36px` with `2px` padding.
- Triple-redundancy for status indicators: color + text label + icon (color-blind accessible).
- Card hover feedback: `translateY(-4px)`, shadow increase, border color change.

### 9.5 Accessibility
- WCAG 2.1 AA compliance.
- Full keyboard navigation support with visible focus indicators.
- Color contrast meets or exceeds requirements.
- Status never conveyed by color alone (always paired with text and icon).

---

## 10. Dependencies

### 10.1 ConnectX Platform (Parent PRD)
- ConnectX core layout: sidebar, top bar, tabbed content pane.
- ConnectX design system: CSS custom properties, typography (Helvetica/JetBrains Mono), 8-point grid, component patterns.
- ConnectX React application shell with React Router.
- ConnectX PostgreSQL database.
- ConnectX SMTP configuration for email dispatch.

### 10.2 User Management Module (Sibling PRD)
- JWT authentication and role/tenant context.
- RBAC enforcement (Super Admin, Company Admin, Member).
- User profile data for displaying requester info.

### 10.3 External Systems

**Integration Library VM:**
- REST API exposed on VM.
- Authentication method: *Information Not Provided*.
- Required capabilities: purchased connector listing, marketplace catalog browsing, use case retrieval, connector request submission, aggregate statistics.
- Exact API version, base URL, and response schemas: *Information Not Provided*.

### 10.4 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend Runtime | Python + FastAPI | 3.9+ / 0.104+ |
| ORM | SQLAlchemy | *Information Not Provided* |
| Database | PostgreSQL | 13+ |
| Validation | Pydantic | V2 |
| HTTP Client | httpx | *Information Not Provided* |
| Frontend Runtime | React (Vite) | 18+ |
| Routing | React Router | *Information Not Provided* |
| Typography | Helvetica Neue, JetBrains Mono | — |

### 10.5 Downstream Consumers

| Module | Dependency on Integration Library |
|---|---|
| Lab Validation | Connector catalog for sandbox provisioning |
| Automated Testing (AutoNXT) | Connector list for test selection |
| Agentic Monitor (CARE) | Connector list for monitoring |

---

*Document Version: 1.0*  
*Created: March 5, 2026*  
*Based on: ConnectX UX Specifications.docx, ConnectX_March 03 Final v2.html (layout), ConnectX_AutoNXT_CARE_Integration_PRD.md (structure reference)*
