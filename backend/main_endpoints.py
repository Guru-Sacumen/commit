# main_endpoints.py - Additional endpoints for main.py

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from database import SessionLocal
from models import User, Membership, RoleEnum, PasswordReset, Tenant
from auth import (
    get_db,
    get_current_user,
    get_current_admin,
    get_current_tenant_member,
    get_current_superadmin,
    hash_password,
    create_user_with_membership,
)
from schemas import (
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
)

def register_additional_endpoints(app):
    """Register additional endpoints with the FastAPI app"""
    
    @app.get("/admin/{tenant_id}/users", response_model=list[UserOut])
    def list_tenant_users(
        tenant_id: str,
        db: Session = Depends(get_db),
        _admin: User = Depends(get_current_admin),
    ):
    memberships = (
        db.query(Membership)
        .filter(Membership.tenant_id == tenant_id)
        .join(User)
        .all()
    )
    out: list[UserOut] = []
    for m in memberships:
        out.append(
            UserOut(
                id=m.user.id,
                email=m.user.email,
                full_name=m.user.full_name,
                created_at=m.user.created_at,
                role=m.role,
                superadmin=m.user.superadmin,
                auth_provider=m.user.auth_provider,
                google_subject=m.user.google_subject,
                mfa_enabled=m.user.mfa_enabled,
                totp_verified=m.user.totp_verified,
            )
        )
    return out

@app.get("/admin/{tenant_id}/company", response_model=dict)
def get_company_details(
    tenant_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Get company details for the current admin's tenant"""
    print(f"Fetching company details for tenant_id: {tenant_id}")
    print(f"Admin user: {_admin.email} (id: {_admin.id})")
    
    # Debug: List all tenants
    all_tenants = db.query(Tenant).all()
    print(f"All tenants in database: {[{t.id: t.name} for t in all_tenants]}")
    
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        print(f"Tenant not found: {tenant_id}")
        raise HTTPException(status_code=404, detail="Company not found")
    
    print(f"Found tenant: {tenant.name} (id: {tenant.id})")
    return {
        "id": tenant.id,
        "name": tenant.name,
        "created_at": tenant.created_at
    }

# superadmin/company management ------------------------------------------------

@app.get("/superadmin/companies", response_model=list[dict])
def list_companies(db: Session = Depends(get_db), _super: User = Depends(get_current_superadmin)):
    """Return all tenant/company records. Only superadmins may call this."""
    tenants = db.query(Tenant).all()
    return [{"id": t.id, "name": t.name} for t in tenants]


@app.patch("/superadmin/companies/{tenant_id}", response_model=dict)
def rename_company(
    tenant_id: str,
    payload: TenantUpdate,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if db.query(Tenant).filter(Tenant.name == payload.name, Tenant.id != tenant_id).first():
        raise HTTPException(status_code=400, detail="Another tenant already uses that name")
    tenant.name = payload.name
    db.commit()
    return {"ok": True}

@app.post("/superadmin/companies", response_model=dict, status_code=201)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    name = payload.name
    admin_email = payload.admin_email
    admin_full_name = payload.admin_full_name
    admin_password = payload.admin_password
    """Create a new tenant (company) and immediately provision its single admin."""
    if db.query(Tenant).filter(Tenant.name == name).first():
        raise HTTPException(status_code=400, detail="Tenant name already exists")
    tenant = Tenant(id=str(uuid.uuid4()), name=name)
    db.add(tenant)
    db.flush()
    # record any purchased connectors from the managed catalog
    for conn_id in payload.connectors:
        catalog_conn = (
            db.query(models.ConnectorCatalog)
            .filter(models.ConnectorCatalog.connector_id == conn_id)
            .first()
        )
        if not catalog_conn:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid connector id: {conn_id}",
            )
        db.add(
            models.Connector(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                name=catalog_conn.connector_id,
                category=catalog_conn.type,
                type="prebuilt",
                logo_url="",
                external_url="",
            )
        )
    # create admin user for this company
    try:
        user, membership = create_user_with_membership(
            db,
            email=admin_email,
            full_name=admin_full_name,
            password=admin_password,
            tenant_id=tenant.id,
            role=RoleEnum.ADMIN,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit()
    return {"tenant_id": tenant.id, "admin_id": user.id}

@app.post("/superadmin/companies/{tenant_id}/admin", response_model=UserOut, status_code=201)
def add_company_admin(
    tenant_id: str,
    email: str,
    full_name: str,
    password: str,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    """Add an admin user to an existing tenant; multiple admins allowed."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    # Multiple admins allowed per tenant - removing restriction
    try:
        user, membership = create_user_with_membership(
            db,
            email=email,
            full_name=full_name,
            password=password,
            tenant_id=tenant_id,
            role=RoleEnum.ADMIN,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at,
        role=membership.role,
        superadmin=user.superadmin,
        auth_provider=user.auth_provider,
        google_subject=user.google_subject,
        mfa_enabled=user.mfa_enabled,
        totp_verified=user.totp_verified,
    )


@app.post("/admin/{tenant_id}/users", response_model=UserOut, status_code=201)
def create_tenant_user(
    tenant_id: str,
    email: str,
    full_name: str,
    password: str,
    role: RoleEnum = RoleEnum.MEMBER,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_admin),
):
    # determine whether the tenant currently has an admin
    existing = (
        db.query(Membership)
        .filter(Membership.tenant_id == tenant_id, Membership.role == RoleEnum.ADMIN)
        .first()
    )

    if existing:
        # normal path: only members may be created through this endpoint
        if role != RoleEnum.MEMBER:
            raise HTTPException(
                status_code=400,
                detail="Only MEMBER users can be created here. Admin is created during company creation.",
            )
        role_to_use = RoleEnum.MEMBER
    else:
        # no admin yet – the first user becomes the admin automatically
        role_to_use = RoleEnum.ADMIN

    try:
        user, membership = create_user_with_membership(
            db,
            email=email,
            full_name=full_name,
            password=password,
            tenant_id=tenant_id,
            role=role_to_use,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at,
        role=membership.role,
        superadmin=user.superadmin,
        auth_provider=user.auth_provider,
        google_subject=user.google_subject,
        mfa_enabled=user.mfa_enabled,
        totp_verified=user.totp_verified,
    )


@app.patch("/admin/{tenant_id}/users/{user_id}", response_model=dict)
def update_tenant_user(
    tenant_id: str,
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    try:
        print(f"Received update request for user {user_id} in tenant {tenant_id}")
        print(f"Payload: {payload}")
        print(f"Payload full_name: {payload.full_name}")
        print(f"Payload role: {payload.role}")
        
        if payload.full_name is not None:
            db.query(User).filter(User.id == user_id).update(
                {User.full_name: payload.full_name}
            )
        if payload.role is not None:
            current_membership = (
                db.query(Membership)
                .filter(Membership.tenant_id == tenant_id, Membership.user_id == user_id)
                .first()
            )
            if not current_membership:
                raise HTTPException(status_code=404, detail="User membership not found")
            
            # Allow role changes for admins and superadmins (except self)
            if user_id == _admin.id:
                raise HTTPException(
                    status_code=403,
                    detail="Cannot change your own role",
                )
            
            # Validate role value
            if payload.role not in [RoleEnum.ADMIN, RoleEnum.MEMBER]:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid role. Must be ADMIN or MEMBER",
                )
            
            print(f"Updating role from {current_membership.role} to {payload.role} for user {user_id}")
            # Update the role
            current_membership.role = payload.role
            db.flush()  # Ensure the change is tracked before commit
            
        # Handle password update if provided
        if payload.password is not None and payload.password != "":
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            print(f"Updating password for user {user.email}")
            user.password_hash = hash_password(payload.password)
            db.flush()  # Ensure the change is tracked before commit
            
        try:
            db.commit()
            return {"ok": True}
        except Exception as e:
            db.rollback()
            print(f"Database error during user update: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error during user update: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.patch("/admin/{tenant_id}/users/{user_id}/password", response_model=dict)
def update_user_password(
    tenant_id: str,
    user_id: str,
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    try:
        print(f"Received password update request for user {user_id} in tenant {tenant_id}")
        print(f"Payload: {payload}")
        
        membership = (
            db.query(Membership)
            .filter(Membership.tenant_id == tenant_id, Membership.user_id == user_id)
            .first()
        )
        if not membership:
            raise HTTPException(status_code=404, detail="User membership not found")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        print(f"Updating password for user {user.email}")
        user.password_hash = hash_password(payload.new_password)
        
        try:
            db.commit()
            print(f"Password updated successfully for user {user.email}")
            return {"ok": True}
        except Exception as e:
            db.rollback()
            print(f"Database error during password update: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to update password: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error during password update: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.delete("/admin/{tenant_id}/users/{user_id}", response_model=dict)
def delete_tenant_user(
    tenant_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    membership = db.query(Membership).filter(
        Membership.tenant_id == tenant_id, Membership.user_id == user_id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="User membership not found")
    # only superadmins may delete the company admin; normal admins are blocked
    if membership.role == RoleEnum.ADMIN and not _admin.superadmin:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete company admin",
        )
    db.delete(membership)
    remaining = db.query(Membership).filter(Membership.user_id == user_id).count()
    if remaining == 0:
        db.query(models.ConnectorRequest).filter(
            models.ConnectorRequest.requested_by_user_id == user_id
        ).update({models.ConnectorRequest.requested_by_user_id: None})
        db.query(models.ConnectorRequest).filter(
            models.ConnectorRequest.decided_by_user_id == user_id
        ).update({models.ConnectorRequest.decided_by_user_id: None})
        db.query(models.Notification).filter(
            models.Notification.recipient_user_id == user_id
        ).delete()
        db.query(models.Notification).filter(
            models.Notification.actor_user_id == user_id
        ).delete()
        db.query(User).filter(User.id == user_id).delete()
    db.commit()
    return {"ok": True}




@app.get("/superadmin/users", response_model=list[UserOut])
def list_all_users(
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    """Return every user in the system; superadmins can filter or inspect
    which ones came from OAuth versus local signup.

    We can't simply return the raw SQLAlchemy objects because the
    response model also requires a `role` field.  Compute each user's
    role from their first membership (or SUPERADMIN flag) and build
    the UserOut manually.
    """
    out: list[UserOut] = []
    users = db.query(User).all()
    for u in users:
        # determine a current role; default MEMBER unless overridden
        if u.superadmin:
            role = RoleEnum.SUPERADMIN
        else:
            membership = db.query(Membership).filter(Membership.user_id == u.id).first()
            role = membership.role if membership else RoleEnum.MEMBER
        out.append(
            UserOut(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                created_at=u.created_at,
                role=role,
                superadmin=u.superadmin,
                auth_provider=u.auth_provider,
                google_subject=u.google_subject,
                mfa_enabled=u.mfa_enabled,
                totp_verified=u.totp_verified,
            )
        )
    return out

# ---------- Superadmin removal helpers ----------

@app.delete("/superadmin/companies/{tenant_id}/admin", response_model=dict)
def remove_company_admin(
    tenant_id: str,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    """Delete the administrator membership for a given tenant.
    Only superadmins may call this; they can remove the account entirely if it
    has no other memberships.
    """
    membership = (
        db.query(Membership)
        .filter(Membership.tenant_id == tenant_id, Membership.role == RoleEnum.ADMIN)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Tenant has no admin")
    user_id = membership.user_id
    db.delete(membership)
    remaining = db.query(Membership).filter(Membership.user_id == user_id).count()
    if remaining == 0:
        db.query(models.ConnectorRequest).filter(
            models.ConnectorRequest.requested_by_user_id == user_id
        ).update({models.ConnectorRequest.requested_by_user_id: None})
        db.query(models.ConnectorRequest).filter(
            models.ConnectorRequest.decided_by_user_id == user_id
        ).update({models.ConnectorRequest.decided_by_user_id: None})
        db.query(models.Notification).filter(
            models.Notification.recipient_user_id == user_id
        ).delete()
        db.query(models.Notification).filter(
            models.Notification.actor_user_id == user_id
        ).delete()
        db.query(User).filter(User.id == user_id).delete()
    db.commit()
    return {"ok": True}


@app.delete("/superadmin/companies/{tenant_id}", response_model=dict)
def delete_company(
    tenant_id: str,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    """Remove a company and all its related data (memberships, connectors).
    Any users who no longer have memberships will also be deleted.
    """
    # drop connectors first (FK with tenant_id)
    db.query(models.Connector).filter(models.Connector.tenant_id == tenant_id).delete()
    db.query(models.ConnectorRequest).filter(models.ConnectorRequest.tenant_id == tenant_id).delete()
    db.query(models.Notification).filter(models.Notification.tenant_id == tenant_id).delete()
    # remove all memberships for this tenant
    user_ids = [m.user_id for m in db.query(Membership).filter(Membership.tenant_id == tenant_id).all()]
    db.query(Membership).filter(Membership.tenant_id == tenant_id).delete()
    # delete the tenant record
    db.query(Tenant).filter(Tenant.id == tenant_id).delete()
    # clean up users with zero memberships
    for uid in user_ids:
        rem = db.query(Membership).filter(Membership.user_id == uid).count()
        if rem == 0:
            # clean up password resets (FK without cascade) before dropping user
            db.query(PasswordReset).filter(PasswordReset.user_id == uid).delete()
            db.query(User).filter(User.id == uid).delete()
    db.commit()
    return {"ok": True}


# ---------- Self profile ----------

@app.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # superadmins don't need a membership to get their role
    if user.superadmin:
        role = RoleEnum.SUPERADMIN
    else:
        membership = db.query(Membership).filter(Membership.user_id == user.id).first()
        role = membership.role if membership else RoleEnum.MEMBER
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at,
        role=role,
        superadmin=user.superadmin,
        auth_provider=user.auth_provider,
        google_subject=user.google_subject,
        mfa_enabled=user.mfa_enabled,
        totp_verified=user.totp_verified,
    )


@app.get("/connectors/catalog", response_model=list[dict])
def list_connector_catalog(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    rows = (
        db.query(models.ConnectorCatalog)
        .order_by(models.ConnectorCatalog.name.asc())
        .all()
    )
    return [
        {
            "id": row.id,
            "connector_id": row.connector_id,
            "name": row.name,
            "type": row.type,
            "usecase": row.usecase,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@app.post("/connectors/catalog", response_model=dict, status_code=201)
def create_connector_catalog(
    payload: ConnectorCatalogCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Create a new connector in the catalog"""
    # Check if connector_id already exists
    existing = (
        db.query(models.ConnectorCatalog)
        .filter(models.ConnectorCatalog.connector_id == payload.connector_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Connector ID already exists")

    # Create new connector catalog entry
    connector = models.ConnectorCatalog(
        id=str(uuid.uuid4()),
        connector_id=payload.connector_id,
        name=payload.name,
        type=payload.type,
        usecase=payload.usecase,
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
        "created_at": connector.created_at,
    }


@app.patch("/connectors/catalog/{connector_id}", response_model=dict)
def update_connector_catalog(
    connector_id: str,
    payload: ConnectorCatalogUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Update an existing connector in the catalog"""
    connector = (
        db.query(models.ConnectorCatalog)
        .filter(models.ConnectorCatalog.id == connector_id)
        .first()
    )
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    # Update only the provided fields
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
        "created_at": connector.created_at,
    }


@app.get("/connectors/categories", response_model=list[str])
def list_connector_categories(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get list of unique connector categories from the connector_categories table"""
    categories = (
        db.query(models.ConnectorCategory.name)
        .filter(models.ConnectorCategory.name.isnot(None))
        .order_by(models.ConnectorCategory.name.asc())
        .all()
    )
    return [category.name for category in categories]


@app.patch("/me", response_model=dict)
def update_me(
    full_name: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if full_name is not None:
        db.query(User).filter(User.id == user.id).update({User.full_name: full_name})
        db.commit()
    return {"ok": True}


@app.patch("/me/password", response_model=dict)
def change_own_password(
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.auth_provider != "LOCAL":
        raise HTTPException(status_code=400, detail="Password not available for OAuth users")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}

@app.get("/admin/{tenant_id}/connectors", response_model=list[dict])
def get_tenant_connectors(
    tenant_id: str,
    db: Session = Depends(get_db),
    _tenant_user: User = Depends(get_current_tenant_member),
):
    """Return all purchased connectors for a tenant."""
    conns = db.query(models.Connector).filter(models.Connector.tenant_id == tenant_id).all()
    connector_keys = [conn.name for conn in conns]
    catalog_rows = (
        db.query(models.ConnectorCatalog)
        .filter(models.ConnectorCatalog.connector_id.in_(connector_keys))
        .all()
        if connector_keys
        else []
    )
    catalog_by_id = {row.connector_id: row for row in catalog_rows}
    return [
        {
            "id": c.id,
            "connector_id": c.name,
            "name": (catalog_by_id.get(c.name).name if catalog_by_id.get(c.name) else c.name),
            "category": (
                catalog_by_id.get(c.name).type if catalog_by_id.get(c.name) else c.category
            ),
            "type": c.type,
            "logo_url": c.logo_url,
            "external_url": c.external_url,
        }
        for c in conns
    ]


@app.get("/admin/{tenant_id}/connector-requests", response_model=list[dict])
def list_connector_requests(
    tenant_id: str,
    db: Session = Depends(get_db),
    _tenant_user: User = Depends(get_current_tenant_member),
):
    rows = (
        db.query(models.ConnectorRequest)
        .filter(models.ConnectorRequest.tenant_id == tenant_id)
        .order_by(models.ConnectorRequest.created_at.desc())
        .all()
    )
    changed = False
    for row in rows:
        changed = _maybe_escalate_pending_request(db, row) or changed
    if changed:
        db.commit()

    requested_by_ids = {
        row.requested_by_user_id
        for row in rows
        if row.requested_by_user_id
    }
    decided_by_ids = {
        row.decided_by_user_id
        for row in rows
        if row.decided_by_user_id
    }
    user_rows = (
        db.query(User)
        .filter(User.id.in_(list(requested_by_ids | decided_by_ids)))
        .all()
        if (requested_by_ids or decided_by_ids)
        else []
    )
    users_by_id = {user.id: user for user in user_rows}
    return [
        _connector_request_to_dict(
            row=row,
            requested_by_map=users_by_id,
            decided_by_map=users_by_id,
        )
        for row in rows
    ]


@app.post("/admin/{tenant_id}/connector-requests", response_model=dict, status_code=201)
def create_connector_request(
    tenant_id: str,
    payload: ConnectorRequestCreate,
    db: Session = Depends(get_db),
    _requester: User = Depends(get_current_tenant_member),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    connector_id = payload.connector_id.strip()
    if not connector_id:
        raise HTTPException(status_code=400, detail="connector_id is required")

    catalog_conn = (
        db.query(models.ConnectorCatalog)
        .filter(models.ConnectorCatalog.connector_id == connector_id)
        .first()
    )
    if not catalog_conn:
        raise HTTPException(status_code=400, detail="Connector not found in catalog")

    already_purchased = (
        db.query(models.Connector)
        .filter(
            models.Connector.tenant_id == tenant_id,
            models.Connector.name == connector_id,
        )
        .first()
    )
    if already_purchased:
        raise HTTPException(status_code=409, detail="Connector already purchased")

    pending_req = (
        db.query(models.ConnectorRequest)
        .filter(
            models.ConnectorRequest.tenant_id == tenant_id,
            models.ConnectorRequest.connector_id == connector_id,
            models.ConnectorRequest.status == models.ConnectorRequestStatus.PENDING,
        )
        .first()
    )
    if pending_req:
        raise HTTPException(status_code=409, detail="Connector request already pending")

    requester_membership = (
        db.query(Membership)
        .filter(
            Membership.tenant_id == tenant_id,
            Membership.user_id == _requester.id,
        )
        .first()
    )
    requester_role = requester_membership.role if requester_membership else RoleEnum.SUPERADMIN

    row = models.ConnectorRequest(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        connector_id=connector_id,
        connector_name=catalog_conn.name,
        connector_type=catalog_conn.type or "Unknown",
        status=models.ConnectorRequestStatus.PENDING,
        requested_by_user_id=_requester.id,
        request_comment=payload.comment,
        attachment_name=payload.attachment_name,
        attachment_url=payload.attachment_url,
        sla_due_at=datetime.utcnow() + timedelta(hours=CONNECTOR_REQUEST_SLA_HOURS),
    )
    db.add(row)

    # Notify tenant admin when request comes from a member.
    if requester_role == RoleEnum.MEMBER:
        admin_memberships = (
            db.query(Membership)
            .filter(
                Membership.tenant_id == tenant_id,
                Membership.role == RoleEnum.ADMIN,
            )
            .all()
        )
        for membership in admin_memberships:
            _create_notification(
                db=db,
                tenant_id=tenant_id,
                recipient_user_id=membership.user_id,
                actor_user_id=_requester.id,
                title="Connector request from member",
                message=(
                    f"{_requester.full_name or _requester.email} requested "
                    f"{catalog_conn.name}."
                ),
                entity_type="connector_request",
                entity_id=row.id,
            )

    # Always notify superadmins since they are approvers.
    superadmins = db.query(User).filter(User.superadmin == True).all()
    for super_user in superadmins:
        _create_notification(
            db=db,
            tenant_id=tenant_id,
            recipient_user_id=super_user.id,
            actor_user_id=_requester.id,
            title="Connector approval request pending",
            message=(
                f"{catalog_conn.name} was requested by "
                f"{_requester.full_name or _requester.email}."
            ),
            entity_type="connector_request",
            entity_id=row.id,
        )

    db.commit()
    db.refresh(row)
    requester_map = {_requester.id: _requester}
    return {
        **_connector_request_to_dict(
            row=row,
            requested_by_map=requester_map,
            decided_by_map={},
        ),
        "requested_by_user_id": row.requested_by_user_id,
    }


@app.get("/tenant/{tenant_id}/notifications", response_model=list[NotificationOut])
def list_tenant_notifications(
    tenant_id: str,
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_tenant_member),
):
    query = db.query(models.Notification).filter(
        models.Notification.tenant_id == tenant_id,
        models.Notification.recipient_user_id == user.id,
    )
    if unread_only:
        query = query.filter(models.Notification.is_read == False)
    rows = query.order_by(models.Notification.created_at.desc()).limit(limit).all()
    return [_notification_to_dict(row) for row in rows]


@app.patch("/tenant/{tenant_id}/notifications/{notification_id}/read", response_model=dict)
def mark_notification_read(
    tenant_id: str,
    notification_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_tenant_member),
):
    row = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.tenant_id == tenant_id,
            models.Notification.recipient_user_id == user.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    row.is_read = True
    db.commit()
    return {"ok": True}


@app.patch("/tenant/{tenant_id}/notifications/read-all", response_model=dict)
def mark_all_notifications_read(
    tenant_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_tenant_member),
):
    (
        db.query(models.Notification)
        .filter(
            models.Notification.tenant_id == tenant_id,
            models.Notification.recipient_user_id == user.id,
            models.Notification.is_read == False,
        )
        .update({models.Notification.is_read: True})
    )
    db.commit()
    return {"ok": True}


@app.patch("/superadmin/connector-requests/{request_id}", response_model=dict)
def decide_connector_request(
    request_id: str,
    payload: ConnectorRequestDecision,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    row = (
        db.query(models.ConnectorRequest)
        .filter(models.ConnectorRequest.id == request_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Connector request not found")

    if row.status != models.ConnectorRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Connector request already processed")

    action = payload.action.lower()
    if action not in {"grant", "decline"}:
        raise HTTPException(status_code=400, detail="Invalid action")

    if action == "grant":
        existing = (
            db.query(models.Connector)
            .filter(
                models.Connector.tenant_id == row.tenant_id,
                models.Connector.name == row.connector_id,
            )
            .first()
        )
        if not existing:
            db.add(
                models.Connector(
                    id=str(uuid.uuid4()),
                    tenant_id=row.tenant_id,
                    name=row.connector_id,
                    category=row.connector_type or "Unknown",
                    type="prebuilt",
                    logo_url="",
                    external_url="",
                )
            )
        row.status = models.ConnectorRequestStatus.GRANTED
        # store the optional access link provided by the approver
        if payload.granted_access_url:
            row.granted_access_url = payload.granted_access_url
    else:
        row.status = models.ConnectorRequestStatus.DECLINED

    row.decided_at = datetime.utcnow()
    row.decided_by_user_id = _super.id
    row.decision_note = payload.note
    row.escalation_notified = row.escalation_notified or (row.status != models.ConnectorRequestStatus.PENDING)

    if row.requested_by_user_id:
        _create_notification(
            db=db,
            tenant_id=row.tenant_id,
            recipient_user_id=row.requested_by_user_id,
            actor_user_id=_super.id,
            title=(
                "Connector request granted"
                if row.status == models.ConnectorRequestStatus.GRANTED
                else "Connector request declined"
            ),
            message=(
                f"{row.connector_name} request has been "
                f"{row.status.value.lower()}."
            ),
            entity_type="connector_request",
            entity_id=row.id,
        )

    # Notify tenant admin(s) about final decision to keep company stakeholders informed.
    admin_memberships = (
        db.query(Membership)
        .filter(
            Membership.tenant_id == row.tenant_id,
            Membership.role == RoleEnum.ADMIN,
        )
        .all()
    )
    for membership in admin_memberships:
        if membership.user_id == row.requested_by_user_id:
            continue
        _create_notification(
            db=db,
            tenant_id=row.tenant_id,
            recipient_user_id=membership.user_id,
            actor_user_id=_super.id,
            title=(
                "Connector approved for tenant"
                if row.status == models.ConnectorRequestStatus.GRANTED
                else "Connector request declined for tenant"
            ),
            message=f"{row.connector_name} request status: {row.status.value}.",
            entity_type="connector_request",
            entity_id=row.id,
        )

    db.commit()
    db.refresh(row)
    users = (
        db.query(User)
        .filter(User.id.in_([uid for uid in [row.requested_by_user_id, row.decided_by_user_id] if uid]))
        .all()
    )
    user_by_id = {user.id: user for user in users}
    return _connector_request_to_dict(
        row=row,
        requested_by_map=user_by_id,
        decided_by_map=user_by_id,
    )


@app.post("/admin/{tenant_id}/connectors", response_model=dict, status_code=201)
def add_tenant_connector(
    tenant_id: str,
    payload: TenantConnectorCreate,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    """Mark a marketplace connector as purchased for a tenant (superadmin only)."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    connector_id = payload.connector_id.strip()
    if not connector_id:
        raise HTTPException(status_code=400, detail="connector_id is required")

    catalog_conn = (
        db.query(models.ConnectorCatalog)
        .filter(models.ConnectorCatalog.connector_id == connector_id)
        .first()
    )
    if not catalog_conn:
        raise HTTPException(status_code=400, detail="Connector not found in catalog")

    existing = (
        db.query(models.Connector)
        .filter(
            models.Connector.tenant_id == tenant_id,
            models.Connector.name == connector_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Connector already purchased")

    conn = models.Connector(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        # keep canonical connector key in name for compatibility with existing rows
        name=connector_id,
        category=catalog_conn.type or "",
        type="prebuilt",
        logo_url=payload.logo_url or "",
        external_url=payload.external_url or "",
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return {
        "id": conn.id,
        "connector_id": conn.name,
        "name": conn.name,
        "category": conn.category,
        "type": conn.type,
        "logo_url": conn.logo_url,
        "external_url": conn.external_url,
    }


@app.delete("/admin/{tenant_id}/connectors/{connector_id}", response_model=dict)
def remove_tenant_connector(
    tenant_id: str,
    connector_id: str,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    """Remove a purchased connector from a tenant (superadmin only)."""
    conn = (
        db.query(models.Connector)
        .filter(
            models.Connector.tenant_id == tenant_id,
            models.Connector.name == connector_id,
        )
        .first()
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Connector not found for tenant")

    db.delete(conn)
    db.commit()
    return {"ok": True}
