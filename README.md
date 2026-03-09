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
python -m venv venv
# Linux / Mac
source venv/bin/activate
# Windows
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in your local DB credentials
alembic upgrade head            # run migrations
uvicorn main:app --reload       # starts on http://localhost:8000
```

> API docs available at **http://localhost:8000/docs** (Swagger UI) once backend is running.

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev                     # starts on http://localhost:5173
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