# admin/router.py - Admin module router
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_current_admin, get_db, hash_password
from models import Membership, RoleEnum, User, Tenant, Connector
from schemas import UserCreateRequest, UserOut, UserPasswordUpdate, UserUpdate
from google_authenticator.totp_service import TOTPService


router = APIRouter(prefix="/admin/{tenant_id}", tags=["admin"])


def _user_out(user: User, role: RoleEnum) -> UserOut:
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
        totp_verified=user.totp_verified or False,
    )


@router.get("/users", response_model=list[UserOut])
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
    return [_user_out(m.user, m.role) for m in memberships]


@router.post("/users", response_model=UserOut, status_code=201)
def create_tenant_user(
    tenant_id: str,
    email: str = Query(...),
    full_name: str = Query(...),
    password: str = Query(...),
    role: RoleEnum = Query(RoleEnum.MEMBER),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    # Check if tenant exists first
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    existing_admin = (
        db.query(Membership)
        .filter(Membership.tenant_id == tenant_id, Membership.role == RoleEnum.ADMIN)
        .first()
    )

    role_to_use = role
    if existing_admin and role != RoleEnum.MEMBER:
        raise HTTPException(
            status_code=400,
            detail="Only MEMBER users can be created. Admin is created during company creation.",
        )
    if not existing_admin:
        role_to_use = RoleEnum.ADMIN

    if db.query(User.id).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already in use")

    user = User(
        id=str(uuid.uuid4()),
        email=email,
        full_name=full_name,
        password_hash=hash_password(password),
        auth_provider="LOCAL",
        mfa_enabled=True,  # Auto-enable MFA for new users
        totp_verified=False,
        totp_secret=None,
    )
    db.add(user)
    db.flush()

    membership = Membership(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        user_id=user.id,
        role=role_to_use,
    )
    db.add(membership)
    db.commit()
    db.refresh(user)
    return _user_out(user, membership.role)


@router.patch("/users/{user_id}", response_model=dict)
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
        
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        membership = (
            db.query(Membership)
            .filter(Membership.tenant_id == tenant_id, Membership.user_id == user_id)
            .first()
        )
        if not membership:
            raise HTTPException(status_code=404, detail="User membership not found")

        if payload.full_name is not None:
            target_user.full_name = payload.full_name
        if payload.role is not None and payload.role != membership.role:
            # Allow role changes for admin users
            print(f"Updating role from {membership.role} to {payload.role} for user {user_id}")
            membership.role = payload.role
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


@router.patch("/users/{user_id}/password", response_model=dict)
def update_user_password(
    tenant_id: str,
    user_id: str,
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
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

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.get("/company", response_model=dict)
def get_company_details(
    tenant_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Get company details for the current admin's tenant"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return {
        "id": tenant.id,
        "name": tenant.name,
        "created_at": tenant.created_at
    }


@router.delete("/users/{user_id}", response_model=dict)
def delete_tenant_user(
    tenant_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    membership = (
        db.query(Membership)
        .filter(Membership.tenant_id == tenant_id, Membership.user_id == user_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="User membership not found")

    if membership.role == RoleEnum.ADMIN and not _admin.superadmin:
        raise HTTPException(status_code=400, detail="Cannot delete company admin")

    user = db.query(User).filter(User.id == user_id).first()
    db.delete(membership)
    remaining = db.query(Membership).filter(Membership.user_id == user_id).count()
    if remaining == 0 and user:
        db.delete(user)

    db.commit()
    return {"ok": True}


@router.get("/connectors", response_model=list[dict])
def get_admin_connectors(
    tenant_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Get connectors for admin management"""
    connectors = (
        db.query(Connector)
        .filter(Connector.tenant_id == tenant_id)
        .all()
    )
    return [
        {
            "id": connector.id,
            "name": connector.name,
            "category": connector.category,
            "type": connector.type,
            "logo_url": connector.logo_url,
            "external_url": connector.external_url,
            "created_at": connector.created_at
        }
        for connector in connectors
    ]


@router.get("/connector-requests", response_model=list[dict])
def get_connector_requests(
    tenant_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Get connector requests for admin management"""
    from models import ConnectorRequest, ConnectorRequestStatus
    
    requests = (
        db.query(ConnectorRequest)
        .filter(ConnectorRequest.tenant_id == tenant_id)
        .all()
    )
    return [
        {
            "id": request.id,
            "connector_id": request.connector_id,
            "connector_name": request.connector_name,
            "connector_type": request.connector_type,
            "status": request.status,
            "requested_by_user_id": request.requested_by_user_id,
            "request_comment": request.request_comment,
            "created_at": request.created_at
        }
        for request in requests
    ]


@router.post("/users/{user_id}/reset-2fa", response_model=dict)
def reset_user_2fa(
    tenant_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Reset 2FA for a user - disables Google Authenticator and requires user to set it up again"""
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

    # Use TOTPService to reset TOTP (keeps MFA enabled for re-setup)
    TOTPService.reset_totp(db, user)
    
    return {"ok": True, "message": "2FA reset successfully. User will need to set up Google Authenticator again."}
