# modules/users/router.py - Users module router
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, get_db, hash_password
from models import Membership, RoleEnum, User
from schemas import UserOut, UserPasswordUpdate, UserUpdate


router = APIRouter(tags=["users"])


def _resolve_role(user: User, db: Session) -> RoleEnum:
    if user.superadmin:
        return RoleEnum.SUPERADMIN
    membership = db.query(Membership).filter(Membership.user_id == user.id).first()
    return membership.role if membership else RoleEnum.MEMBER


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # # Refresh user object to ensure latest data
    # user = db.query(User).filter(User.id == user.id).first()
    role = _resolve_role(user, db)
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at,
        role=role,
        superadmin=user.superadmin,
        auth_provider=user.auth_provider,
        tenant_id=user.tenant_id,
        google_subject=user.google_subject,
        mfa_enabled=user.mfa_enabled,
        totp_verified=user.totp_verified,
    )


@router.patch("/me", response_model=dict)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.full_name is not None:
        user.full_name = payload.full_name
        db.commit()
    return {"ok": True}


@router.patch("/me/password", response_model=dict)
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
