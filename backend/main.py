# main.py - FastAPI app entry point

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import uuid
from datetime import datetime, timedelta
from fastapi.middleware.cors import CORSMiddleware
import os
import smtplib
import re
from pathlib import Path
from email.message import EmailMessage

# Import all the modules we need
from database import Base, engine, SessionLocal
import models
from auth import (
    get_db,
    get_current_user,
    get_current_admin,
    get_current_tenant_member,
    get_current_superadmin,
    verify_password,
    create_access_token,
    create_user_with_membership,
    create_superadmin,
    hash_password,
)
from models import Tenant, User, Membership, RoleEnum, PasswordReset
from google_authenticator import TOTPService
from schemas import (
    Token,
    UserOut,
    UserUpdate,
    UserPasswordUpdate,
    TenantUpdate,
    CompanyCreate,
    TenantConnectorCreate,
    ConnectorCatalogCreate,
    ConnectorCatalogUpdate,
    ConnectorRequestCreate,
    ConnectorRequestDecision,
    NotificationOut,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    GoogleLogin,
    TOTPSetup,
    TOTPVerify,
    TOTPLoginRequest,
)

# Import module routers
from admin import router, superadmin_router
from modules.integration import router as integration_router
from modules.lab import router as lab_router
from modules.testing import router as testing_router
from modules.monitor import router as monitor_router
from modules.support import router as support_router
from modules.users import router as users_router

# setup database
Base.metadata.create_all(bind=engine)


def _ensure_runtime_schema() -> None:
    """Best-effort additive migrations for existing local databases."""
    try:
        inspector = inspect(engine)
        table_names = set(inspector.get_table_names())
    except Exception:
        return

    connector_request_additions = {
        "request_comment": "VARCHAR",
        "attachment_name": "VARCHAR",
        "attachment_url": "VARCHAR",
        "granted_access_url": "VARCHAR",
        "sla_due_at": "TIMESTAMP",
        "escalation_notified": "BOOLEAN DEFAULT FALSE NOT NULL",
        "escalated_at": "TIMESTAMP",
    }
    # additions for auth fields introduced later
    user_additions = {
        "auth_provider": "VARCHAR NOT NULL DEFAULT 'LOCAL'",
        "google_subject": "VARCHAR",
        "mfa_enabled": "BOOLEAN NOT NULL DEFAULT FALSE",
        "totp_secret": "VARCHAR",
        "totp_verified": "BOOLEAN NOT NULL DEFAULT FALSE",
    }

    try:
        with engine.begin() as conn:
            if "connector_requests" in table_names:
                existing_cols = {
                    column["name"] for column in inspector.get_columns("connector_requests")
                }
                for col_name, col_def in connector_request_additions.items():
                    if col_name in existing_cols:
                        continue
                    conn.execute(
                        text(
                            f"ALTER TABLE connector_requests "
                            f"ADD COLUMN {col_name} {col_def}"
                        )
                    )
            # ensure new user columns exist too
            if "users" in table_names:
                existing_cols = {column["name"] for column in inspector.get_columns("users")}
                for col_name, col_def in user_additions.items():
                    if col_name in existing_cols:
                        continue
                    try:
                        conn.execute(
                            text(
                                f"ALTER TABLE users "
                                f"ADD COLUMN {col_name} {col_def}"
                            )
                        )
                    except Exception as inner_exc:
                        # Retry without DEFAULT if ALTER fails
                        if "DEFAULT" in col_def:
                            minimal = col_def.split("DEFAULT")[0].strip()
                            conn.execute(
                                text(
                                    f"ALTER TABLE users ADD COLUMN {col_name} {minimal}"
                                )
                            )
                        else:
                            raise
                # add unique index on google_subject if not exists (postgres)
                if "google_subject" not in existing_cols:
                    try:
                        conn.execute(
                            text(
                                "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_subject "
                                "ON users (google_subject)"
                            )
                        )
                    except Exception:
                        pass
    except Exception as exc:
        print(f"[schema] runtime schema update skipped: {exc}")


_ensure_runtime_schema()

# we enforce single-admin-per-tenant both at the application level and
# with a database constraint/partial index.  During startup we check for
# any existing violations so that the index creation doesn't silently
# drop data or fail in a confusing way.
if engine.dialect.name == "postgresql":
    try:
        with engine.begin() as conn:
            # Drop the single admin constraint to allow multiple admins
            try:
                conn.execute(text("DROP INDEX IF EXISTS uq_tenant_single_admin"))
                print("[constraint] Dropped uq_tenant_single_admin constraint to allow multiple admins")
            except Exception as e:
                print(f"[constraint] Could not drop uq_tenant_single_admin (may not exist): {e}")
                
            # Note: We're no longer enforcing single admin per tenant
            # Multiple admins are now allowed per tenant
            
    except Exception as exc:
        print(f"[constraint] Warning: Could not modify admin constraints: {exc}")
        # Don't fail startup, just continue


def _slugify_connector_name(name: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
    return normalized or f"connector-{uuid.uuid4().hex[:8]}"


def _load_connector_catalog_from_excel() -> list[dict]:
    workbook_name = "Pre-built Connectors - New Use Cases Added Feb 26 V1.xlsx"
    candidates = [
        Path(__file__).resolve().parents[2] / workbook_name,
        Path(__file__).resolve().parents[1] / workbook_name,
        Path.cwd() / workbook_name,
    ]
    workbook_path = next((path for path in candidates if path.exists()), None)
    if not workbook_path:
        print(f"[catalog] workbook not found: {workbook_name}")
        return []

    try:
        import openpyxl  # type: ignore
    except Exception as exc:
        print(f"[catalog] openpyxl unavailable: {exc}")
        return []

    wb = openpyxl.load_workbook(workbook_path, data_only=True, read_only=True)
    ws = wb["Template"] if "Template" in wb.sheetnames else wb[wb.sheetnames[0]]

    rows: list[dict] = []
    used_ids: set[str] = set()
    current_type = ""
    for category, system_name, *_ in ws.iter_rows(min_row=2, values_only=True):
        if category and str(category).strip():
            current_type = str(category).strip()

        if not system_name or not str(system_name).strip():
            continue

        name = str(system_name).strip()
        if name.lower() == "system name":
            continue

        base_id = _slugify_connector_name(name)
        connector_id = base_id
        suffix = 2
        while connector_id in used_ids:
            connector_id = f"{base_id}-{suffix}"
            suffix += 1
        used_ids.add(connector_id)

        rows.append(
            {
                "connector_id": connector_id,
                "name": name,
                "type": current_type or "Unknown",
            }
        )

    return rows


def _sync_connector_catalog_from_excel() -> None:
    db = SessionLocal()
    try:
        rows = _load_connector_catalog_from_excel()
        if not rows:
            print("[catalog] no rows loaded from excel")
            return

        existing_rows = db.query(models.ConnectorCatalog).all()
        existing_map = {
            row.connector_id: (row.name, row.type)
            for row in existing_rows
        }
        incoming_map = {
            row["connector_id"]: (row["name"], row["type"])
            for row in rows
        }
        if existing_map == incoming_map:
            return

        db.query(models.ConnectorCatalog).delete()
        for row in rows:
            db.add(
                models.ConnectorCatalog(
                    id=str(uuid.uuid4()),
                    connector_id=row["connector_id"],
                    name=row["name"],
                    type=row["type"],
                )
            )
        db.commit()
        action = "seeded" if not existing_rows else "synchronized"
        print(f"[catalog] {action} {len(rows)} connector catalog rows")
    except Exception as exc:
        db.rollback()
        print(f"[catalog] failed seeding connector catalog: {exc}")
    finally:
        db.close()


_sync_connector_catalog_from_excel()

# simple mail helper (must be defined prior to endpoints)
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
FROM_ADDR = os.getenv("FROM_ADDR", "no-reply@connectx.local")

def send_email(to: str, subject: str, body: str):
    if not SMTP_HOST:
        # fallback to console
        print(f"[email disabled] to={to} subject={subject}\n{body}")
        return
    msg = EmailMessage()
    msg["From"] = FROM_ADDR
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        if SMTP_USER and SMTP_PASS:
            server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)


CONNECTOR_REQUEST_SLA_HOURS = int(os.getenv("CONNECTOR_REQUEST_SLA_HOURS", "24"))
CONNECTOR_REQUEST_AT_RISK_HOURS = int(os.getenv("CONNECTOR_REQUEST_AT_RISK_HOURS", "4"))


def _create_notification(
    db: Session,
    tenant_id: str,
    recipient_user_id: str,
    title: str,
    message: str,
    actor_user_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
) -> None:
    db.add(
        models.Notification(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            recipient_user_id=recipient_user_id,
            actor_user_id=actor_user_id,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            is_read=False,
        )
    )


def _notification_to_dict(row: models.Notification) -> dict:
    return {
        "id": row.id,
        "tenant_id": row.tenant_id,
        "recipient_user_id": row.recipient_user_id,
        "actor_user_id": row.actor_user_id,
        "title": row.title,
        "message": row.message,
        "entity_type": row.entity_type,
        "entity_id": row.entity_id,
        "is_read": row.is_read,
        "created_at": row.created_at,
    }


def _request_sla_state(row: models.ConnectorRequest) -> tuple[str, int | None]:
    if row.status != models.ConnectorRequestStatus.PENDING:
        return ("RESOLVED", None)
    if not row.sla_due_at:
        return ("NO_SLA", None)
    remaining = int((row.sla_due_at - datetime.utcnow()).total_seconds())
    if remaining <= 0:
        return ("BREACHED", remaining)
    if remaining <= CONNECTOR_REQUEST_AT_RISK_HOURS * 3600:
        return ("AT_RISK", remaining)
    return ("ON_TRACK", remaining)


def _maybe_escalate_pending_request(db: Session, row: models.ConnectorRequest) -> bool:
    sla_state, _ = _request_sla_state(row)
    if sla_state != "BREACHED" or row.escalation_notified:
        return False

    recipient_ids: set[str] = set()
    admin_memberships = (
        db.query(Membership)
        .filter(
            Membership.tenant_id == row.tenant_id,
            Membership.role == RoleEnum.ADMIN,
        )
        .all()
    )
    recipient_ids.update(membership.user_id for membership in admin_memberships)

    superadmins = db.query(User).filter(User.superadmin == True).all()
    recipient_ids.update(user.id for user in superadmins)

    for recipient_id in recipient_ids:
        _create_notification(
            db=db,
            tenant_id=row.tenant_id,
            recipient_user_id=recipient_id,
            actor_user_id=None,
            title="Connector request SLA breached",
            message=(
                f"{row.connector_name} request is overdue and needs action "
                f"(request id: {row.id})."
            ),
            entity_type="connector_request",
            entity_id=row.id,
        )

    row.escalation_notified = True
    row.escalated_at = datetime.utcnow()
    return True


def _connector_request_to_dict(
    row: models.ConnectorRequest,
    requested_by_map: dict[str, User],
    decided_by_map: dict[str, User],
) -> dict:
    sla_state, sla_remaining_seconds = _request_sla_state(row)
    requester = requested_by_map.get(row.requested_by_user_id or "")
    decider = decided_by_map.get(row.decided_by_user_id or "")
    return {
        "id": row.id,
        "tenant_id": row.tenant_id,
        "connector_id": row.connector_id,
        "connector_name": row.connector_name,
        "connector_type": row.connector_type,
        "status": row.status.value if hasattr(row.status, "value") else row.status,
        "created_at": row.created_at,
        "requested_by_user_id": row.requested_by_user_id,
        "requested_by_email": requester.email if requester else None,
        "requested_by_name": requester.full_name if requester else None,
        "request_comment": row.request_comment,
        "attachment_name": row.attachment_name,
        "attachment_url": row.attachment_url,
        "sla_due_at": row.sla_due_at,
        "sla_state": sla_state,
        "sla_remaining_seconds": sla_remaining_seconds,
        "escalated_at": row.escalated_at,
        "decided_at": row.decided_at,
        "decided_by_user_id": row.decided_by_user_id,
        "decided_by_email": decider.email if decider else None,
        "decided_by_name": decider.full_name if decider else None,
        "decision_note": row.decision_note,
        "granted_access_url": row.granted_access_url,
    }

app = FastAPI(title="ConnectX API (FastAPI)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user: User | None = db.query(User).filter(User.email == form_data.username).first()
    if not user or user.auth_provider != "LOCAL" or not verify_password(form_data.password, user.password_hash):
        # if user is registered with Google/other provider, they cannot use the
        # password login flow.  This keeps the existing form untouched and
        # ensures clients direct those users to the OAuth-specific endpoint.
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    # For simplicity, pick the first membership as current tenant/role
    membership: Membership | None = (
        db.query(Membership).filter(Membership.user_id == user.id).first()
    )
    tenant_id = membership.tenant_id if membership else None
    role = membership.role if membership else RoleEnum.MEMBER
    if user.superadmin:
        role = RoleEnum.SUPERADMIN

    access_token = create_access_token(
        data={"sub": user.id, "tenant_id": tenant_id, "role": role}
    )
    print(f"User {user.email} logged in, tenant_id={tenant_id}, role={role}")
    return Token(access_token=access_token)



@app.post("/auth/google", response_model=Token)
def google_login(payload: GoogleLogin, db: Session = Depends(get_db)):
    """Simplified stub for OAuth login.  The frontend should obtain the
    provider's subject (unique ID) and user info and send it here.  We
    either find an existing user by `google_subject` or create one with
    auth_provider=GOOGLE.  No password is stored.
    """
    user = db.query(User).filter(User.google_subject == payload.google_subject).first()
    if not user:
        # create a new account; we don't assign any tenant or membership yet
        user = User(
            id=str(uuid.uuid4()),
            email=payload.email,
            full_name=payload.full_name or payload.email,
            password_hash="",  # unused
            auth_provider="GOOGLE",
            google_subject=payload.google_subject,
            mfa_enabled=True,  # Auto-enable MFA for new users
            totp_verified=False,
            totp_secret=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    # else update email/name in case they changed on provider side
    else:
        changed = False
        if payload.email and payload.email != user.email:
            user.email = payload.email
            changed = True
        if payload.full_name and payload.full_name != user.full_name:
            user.full_name = payload.full_name
            changed = True
        if changed:
            db.commit()
    # issue token; their role may be MEMBER by default
    membership: Membership | None = (
        db.query(Membership).filter(Membership.user_id == user.id).first()
    )
    tenant_id = membership.tenant_id if membership else None
    role = membership.role if membership else RoleEnum.MEMBER
    if user.superadmin:
        role = RoleEnum.SUPERADMIN
    access_token = create_access_token(
        data={"sub": user.id, "tenant_id": tenant_id, "role": role}
    )
    return Token(access_token=access_token)


@app.post("/auth/logout", response_model=dict)
def logout():
    """Dummy logout endpoint for clients.
    Since the API uses stateless JWTs there is nothing to invalidate server-side
    by default.  Clients should simply delete their stored token when they hit
    this route; the endpoint returns `{'ok': True}` for convenience.
    """
    return {"ok": True}


@app.post("/auth/mfa/enable", response_model=dict)
def enable_mfa(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enable MFA for user (allows them to setup TOTP)"""
    if user.mfa_enabled:
        return {"ok": True, "message": "MFA is already enabled"}
    
    user.mfa_enabled = True
    db.commit()
    
    return {"ok": True, "message": "MFA enabled successfully. You can now setup Google Authenticator."}


@app.post("/auth/mfa/disable", response_model=dict)
def disable_mfa(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable MFA for user (also disables TOTP)"""
    if not user.mfa_enabled:
        return {"ok": True, "message": "MFA is already disabled"}
    
    # Also disable TOTP if it's enabled
    if user.totp_secret or user.totp_verified:
        from google_authenticator import TOTPService
        TOTPService.disable_totp(db, user)
    
    user.mfa_enabled = False
    db.commit()
    
    return {"ok": True, "message": "MFA disabled successfully"}


# ---------- TOTP (Google Authenticator) endpoints ----------

@app.post("/auth/totp/setup", response_model=TOTPSetup)
def setup_totp(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Setup TOTP for user - generates QR code and secret"""
    try:
        # Auto-enable MFA if it's not enabled
        if not user.mfa_enabled:
            user.mfa_enabled = True
            db.commit()
        
        secret, qr_code = TOTPService.setup_totp_for_user(db, user)
        return TOTPSetup(qr_code=qr_code, secret=secret)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to setup TOTP: {str(e)}")


@app.post("/auth/totp/verify", response_model=dict)
def verify_totp(
    payload: TOTPVerify,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify TOTP token and enable TOTP for user"""
    try:
        if TOTPService.verify_and_enable_totp(db, user, payload.token):
            return {"ok": True, "message": "TOTP verification successful"}
        else:
            raise HTTPException(status_code=400, detail="Invalid TOTP token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify TOTP: {str(e)}")


@app.post("/auth/totp/disable", response_model=dict)
def disable_totp(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable TOTP for user"""
    try:
        TOTPService.disable_totp(db, user)
        return {"ok": True, "message": "TOTP disabled successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to disable TOTP: {str(e)}")


@app.post("/auth/login-with-totp", response_model=Token)
def login_with_totop(
    payload: TOTPLoginRequest,
    db: Session = Depends(get_db),
):
    """Login with password and optional TOTP token"""
    user: User | None = db.query(User).filter(User.email == payload.email).first()
    if not user or user.auth_provider != "LOCAL" or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    # Check if TOTP is required and verified
    if TOTPService.is_totp_required(user):
        if not payload.totp_token:
            raise HTTPException(
                status_code=401, 
                detail="TOTP token required",
                headers={"WWW-Authenticate": "Bearer totp-required"},
            )
        if not TOTPService.verify_user_totp(db, user, payload.totp_token):
            raise HTTPException(status_code=400, detail="Invalid TOTP token")

    # For simplicity, pick the first membership as current tenant/role
    membership: Membership | None = (
        db.query(Membership).filter(Membership.user_id == user.id).first()
    )
    tenant_id = membership.tenant_id if membership else None
    role = membership.role if membership else RoleEnum.MEMBER
    if user.superadmin:
        role = RoleEnum.SUPERADMIN

    access_token = create_access_token(
        data={"sub": user.id, "tenant_id": tenant_id, "role": role}
    )
    print(f"User {user.email} logged in, tenant_id={tenant_id}, role={role}")
    return Token(access_token=access_token)


# ---------- Password reset helpers ----------

@app.post("/auth/forgot-password", response_model=dict)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # create a token if user exists and print link for demo
    user = db.query(User).filter(User.email == req.email).first()
    response = {"ok": True}
    if user:
        token = str(uuid.uuid4())
        pr = PasswordReset(token=token, user_id=user.id)
        db.add(pr)
        db.commit()
        link = f"http://localhost:5173/reset-password?token={token}"
        # try to email; fallback to console
        if SMTP_HOST:
            send_email(user.email, "ConnectX password reset", f"Click to reset your password: {link}")
        else:
            print(f"Password reset link: {link}")
            response["link"] = link
    # Always return ok to avoid leaking existence
    return response


@app.post("/auth/reset-password", response_model=dict)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    pr = db.query(PasswordReset).filter(PasswordReset.token == payload.token).first()
    if not pr:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = db.query(User).filter(User.id == pr.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    # update password hash
    user.password_hash = hash_password(payload.new_password)
    # remove the reset token so it can't be reused
    db.delete(pr)
    db.commit()
    return {"ok": True}

# Include all module routers
app.include_router(router)
app.include_router(superadmin_router)
app.include_router(integration_router)
app.include_router(lab_router)
app.include_router(testing_router)
app.include_router(monitor_router)
app.include_router(support_router)
app.include_router(users_router)


# Additional endpoints for connector catalog
@app.get("/connectors/catalog", response_model=list[dict])
def get_connector_catalog(db: Session = Depends(get_db)):
    """Get all available connectors from catalog"""
    from models import ConnectorCatalog
    connectors = db.query(ConnectorCatalog).all()
    return [
        {
            "id": connector.id,
            "connector_id": connector.connector_id,
            "name": connector.name,
            "type": connector.type,
            "created_at": connector.created_at
        }
        for connector in connectors
    ]


@app.post("/connectors/catalog", response_model=dict, status_code=201)
def create_connector_catalog(
    payload: ConnectorCatalogCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Create a new connector in the catalog"""
    from models import ConnectorCatalog
    import uuid
    
    # Check if connector_id already exists
    existing = (
        db.query(ConnectorCatalog)
        .filter(ConnectorCatalog.connector_id == payload.connector_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Connector ID already exists")

    # Create new connector catalog entry
    connector = ConnectorCatalog(
        id=str(uuid.uuid4()),
        connector_id=payload.connector_id,
        name=payload.name,
        type=payload.type,
        usecase=payload.usecase
    )
    
    db.add(connector)
    db.commit()
    db.refresh(connector)
    
    return {
        "id": connector.id,
        "connector_id": connector.connector_id,
        "name": connector.name,
        "type": connector.type,
        "usecase": connector.usecase,
        "created_at": connector.created_at
    }


@app.delete("/connectors/catalog/{connector_id}", response_model=dict)
def delete_connector_catalog(
    connector_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Delete a connector from the catalog"""
    from models import ConnectorCatalog
    
    # Find the connector
    connector = db.query(ConnectorCatalog).filter(ConnectorCatalog.connector_id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    # Delete the connector
    db.delete(connector)
    db.commit()
    
    return {"message": f"Connector '{connector.name}' deleted successfully"}


@app.put("/connectors/catalog/{connector_id}", response_model=dict)
def update_connector_catalog(
    connector_id: str,
    payload: ConnectorCatalogUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Update a connector in the catalog"""
    from models import ConnectorCatalog
    
    # Find the connector
    connector = db.query(ConnectorCatalog).filter(ConnectorCatalog.connector_id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    # Update fields
    if payload.name is not None:
        connector.name = payload.name
    if payload.type is not None:
        connector.type = payload.type
    if payload.usecase is not None:
        connector.usecase = payload.usecase
    
    db.commit()
    db.refresh(connector)
    
    return {
        "id": connector.id,
        "connector_id": connector.connector_id,
        "name": connector.name,
        "type": connector.type,
        "usecase": connector.usecase,
        "created_at": connector.created_at
    }


@app.patch("/connectors/catalog/{connector_id}", response_model=dict)
def patch_connector_catalog(
    connector_id: str,
    payload: ConnectorCatalogUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Partially update a connector in the catalog"""
    # This is the same as PUT since we already handle partial updates
    return update_connector_catalog(connector_id, payload, db, _user)


@app.post("/admin/{tenant_id}/connectors", response_model=dict, status_code=201)
def add_tenant_connector(
    tenant_id: str,
    payload: TenantConnectorCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Add a connector to a tenant"""
    from models import Connector, Tenant
    
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Check if connector already exists for this tenant
    existing = db.query(Connector).filter(
        Connector.tenant_id == tenant_id,
        Connector.name == payload.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Connector already exists for this tenant")
    
    # Create new tenant connector
    connector = Connector(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        name=payload.name,
        category=payload.category,
        type=payload.type,
        logo_url=payload.logo_url,
        external_url=payload.external_url
    )
    
    db.add(connector)
    db.commit()
    db.refresh(connector)
    
    return {
        "id": connector.id,
        "tenant_id": connector.tenant_id,
        "name": connector.name,
        "category": connector.category,
        "type": connector.type,
        "logo_url": connector.logo_url,
        "external_url": connector.external_url,
        "created_at": connector.created_at
    }


@app.get("/admin/{tenant_id}/connectors", response_model=list[dict])
def get_tenant_connectors(
    tenant_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get all connectors for a specific tenant"""
    from models import Connector, Tenant
    
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get all connectors for this tenant
    connectors = db.query(Connector).filter(Connector.tenant_id == tenant_id).all()
    
    return [
        {
            "id": connector.id,
            "tenant_id": connector.tenant_id,
            "name": connector.name,
            "category": connector.category,
            "type": connector.type,
            "logo_url": connector.logo_url,
            "external_url": connector.external_url,
            "created_at": connector.created_at
        }
        for connector in connectors
    ]


@app.get("/connectors/categories", response_model=list[dict])
def get_connector_categories(db: Session = Depends(get_db)):
    """Get all available connector categories"""
    from models import ConnectorCategory
    categories = db.query(ConnectorCategory).all()
    return [
        {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "created_at": category.created_at
        }
        for category in categories
    ]
