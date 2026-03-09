# admin/superadmin_router.py - Superadmin routes
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import create_user_with_membership, get_current_superadmin, get_db
from models import Membership, RoleEnum, Tenant, User
from schemas import CompanyAdminCreate, CompanyCreate, TenantUpdate, UserOut


router = APIRouter(prefix="/superadmin", tags=["superadmin"])


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


@router.get("/companies", response_model=list[dict])
def list_companies(
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    tenants = db.query(Tenant).all()
    return [{"id": tenant.id, "name": tenant.name} for tenant in tenants]


@router.patch("/companies/{tenant_id}", response_model=dict)
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


@router.post("/companies", response_model=dict, status_code=201)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    if db.query(Tenant).filter(Tenant.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Tenant name already exists")

    tenant = Tenant(id=str(uuid.uuid4()), name=payload.name)
    db.add(tenant)
    db.flush()

    try:
        user, _membership = create_user_with_membership(
            db=db,
            email=payload.admin_email,
            full_name=payload.admin_full_name,
            password=payload.admin_password,
            tenant_id=tenant.id,
            role=RoleEnum.ADMIN,
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"tenant_id": tenant.id, "admin_id": user.id}


@router.post("/companies/{tenant_id}/admin", response_model=UserOut, status_code=201)
def add_company_admin(
    tenant_id: str,
    payload: CompanyAdminCreate,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Multiple admins allowed per tenant - removing restriction

    try:
        user, membership = create_user_with_membership(
            db=db,
            email=payload.email,
            full_name=payload.full_name,
            password=payload.password,
            tenant_id=tenant_id,
            role=RoleEnum.ADMIN,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _user_out(user, membership.role)


@router.get("/users", response_model=list[UserOut])
def list_all_users(
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    result: list[UserOut] = []
    users = db.query(User).all()
    for user in users:
        if user.superadmin:
            role = RoleEnum.SUPERADMIN
        else:
            membership = db.query(Membership).filter(Membership.user_id == user.id).first()
            role = membership.role if membership else RoleEnum.MEMBER
        result.append(_user_out(user, role))
    return result


@router.delete("/companies/{tenant_id}/admin", response_model=dict)
def remove_company_admin(
    tenant_id: str,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    membership = (
        db.query(Membership)
        .filter(Membership.tenant_id == tenant_id, Membership.role == RoleEnum.ADMIN)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="Tenant has no admin")

    user_id = membership.user_id
    db.delete(membership)
    if db.query(Membership).filter(Membership.user_id == user_id).count() == 0:
        db.query(User).filter(User.id == user_id).delete()
    db.commit()
    return {"ok": True}


@router.delete("/companies/{tenant_id}", response_model=dict)
def delete_company(
    tenant_id: str,
    db: Session = Depends(get_db),
    _super: User = Depends(get_current_superadmin),
):
    user_ids = [
        row.user_id
        for row in db.query(Membership).filter(Membership.tenant_id == tenant_id).all()
    ]
    db.query(Membership).filter(Membership.tenant_id == tenant_id).delete()
    db.query(Tenant).filter(Tenant.id == tenant_id).delete()

    for user_id in user_ids:
        if db.query(Membership).filter(Membership.user_id == user_id).count() == 0:
            db.query(User).filter(User.id == user_id).delete()

    db.commit()
    return {"ok": True}
