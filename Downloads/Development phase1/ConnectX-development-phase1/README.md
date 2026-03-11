# ConnectX

Enterprise Security Integration Platform built by **Sacumen**.

ConnectX is a multi-tenant enterprise console that gives cybersecurity companies
a single unified platform to manage, test, monitor, and support their
security connectors.

---

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Backend      | Python 3.11+, FastAPI             |
| Database     | PostgreSQL 15                     |
| ORM          | SQLAlchemy 2.0 + Alembic          |
| Validation   | Pydantic v2                       |
| Frontend     | React 18, React Router v6         |
| Styling      | Tailwind CSS                      |
| HTTP Client  | Axios                             |
| Auth         | JWT (python-jose), OAuth2         |
| Passwords    | bcrypt (passlib)                  |

---

## Getting Started (Local Setup)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15
- Git

### 1. Clone the repo
```bash
git clone https://github.com/suthan-sacumen/ConnectX.git
cd ConnectX
```

### 2. Backend setup
```bash
cd backend

# Step 1: Create and activate virtual environment
python3 -m venv venv
# Linux / Mac
source venv/bin/activate
# Windows
venv\Scripts\activate

# Step 2: Install dependencies
pip install -r requirements.txt

# Step 3: Configure environment
cp .env.example .env            # fill in your local PostgreSQL credentials
# Edit .env file with your database settings:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/connectx
# JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Step 4: Set up database with Alembic migrations
# Check current migration status
alembic current

# Run all migrations to latest version
alembic upgrade head

# (Optional) Create new migration for model changes
# alembic revision --autogenerate -m "description of changes"

# (Optional) Rollback to previous migration
# alembic downgrade -1

# Step 5: Seed initial data (optional)
PYTHONPATH=. python seed_users.py

# Step 6: Start the server
uvicorn main:app --reload       # starts on http://localhost:8000
```

> **JWT Authentication**: The backend now includes production-ready JWT authentication with:
> - httpOnly cookie-based tokens (15 min access, 7 day refresh)
> - Multi-tenant support with tenant_id in JWT payload
> - MFA (TOTP) support for enhanced security
> - Super admin impersonation capabilities
> - Token rotation and revocation for security
> 
> **API Endpoints**:
> - `/api/v1/auth/login` - Login with email/password
> - `/api/v1/auth/refresh` - Refresh access token
> - `/api/v1/auth/logout` - Logout and revoke tokens
> - `/api/v1/users/me` - Get current user info
> - `/api/v1/tenants/onboard` - Create new tenant with admin
> - `/api/v1/auth/mfa/setup` - Setup MFA (TOTP)
> - `/api/v1/admin/impersonate` - Super admin impersonation
> 
> API docs available at **http://localhost:8000/docs** (Swagger UI) once backend is running.

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev                     # starts on http://localhost:5173
```

---

## Database Management (Alembic)

The project uses **Alembic** for database migrations. The migrations are consolidated into 3 main files:

- `001_initial_schema.py` - Base tables (users, tenants, connectors)
- `002_support_module.py` - Support module (tickets, comments, attachments)
- `003_jwt_auth.py` - JWT authentication (refresh tokens, MFA)

### Common Alembic Commands

```bash
# Check current migration status
alembic current

# Run all pending migrations
alembic upgrade head

# Upgrade to specific migration
alembic upgrade 002_support_module

# Create new migration (after model changes)
alembic revision --autogenerate -m "description of changes"

# Rollback to previous migration
alembic downgrade -1

# Rollback to specific migration
alembic downgrade 001_initial_schema

# View migration history
alembic history

# Get SQL for migration (without executing)
alembic upgrade head --sql
```

### Database Reset (Fresh Setup)

```bash
# Drop and recreate database (destructive)
dropdb connectx
createdb connectx

# Run all migrations
alembic upgrade head

# Seed initial data
PYTHONPATH=. python seed_users.py
```

---

## Project Structure

```
connectx/
├── docs/                       ← all PRD files
│   ├── PRD-MAIN.txt            ← start here — read this first
│   ├── PRD-0-user-management.txt
│   ├── PRD-1-integration-lab.txt
│   ├── PRD-2-testing-monitor.txt
│   └── PRD-3-support-ticketing.txt
├── backend/                    ← FastAPI application
├── frontend/                   ← React application
└── README.md
```

> Before writing any code, read **PRD-MAIN.txt** first.
> Then read your module-level PRD alongside it.

---

## Branch Naming Rules

| Type         | Format                        | Example                     |
|--------------|-------------------------------|-----------------------------|
| PRD work     | `docs/<module-name>`          | `docs/integration-lab`      |
| Feature work | `feature/<module-name>`       | `feature/integration-lab`   |
| Bug fix      | `fix/<short-description>`     | `fix/login-token-expiry`    |

---

## PR Review Process

1. Create your branch off `main`
2. Add your PRD file inside `/docs` folder
3. Commit and push
4. Raise a Pull Request on GitHub
5. Tag reviewer for review
6. Address review comments, push again
7. Suthan/Prasanna merges to `main` once approved

---

*ConnectX — Sacumen — 2026*