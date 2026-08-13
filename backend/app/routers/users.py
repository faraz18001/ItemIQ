from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_password_hash, has_role, require_roles
from app.database import get_db
from app.models import Role, User
from app.schemas import GrantRoleRequest, ResetPasswordRequest, UserCreate, UserUpdate
from app.services.serializers import serialize_user

router = APIRouter(prefix="/users", tags=["Users"])

STAFF_ROLES = {"qbm", "hod", "faculty", "sme", "examiner"}


@router.get("")
def list_users(
    include_inactive: bool = Query(False),
    user: User = Depends(require_roles("qbm", "hod", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(User).order_by(User.name)
    if not include_inactive:
        query = query.filter(User.is_active.is_(True))
    return [serialize_user(u) for u in query.all()]


@router.post("")
def create_user(
    payload: UserCreate,
    user: User = Depends(require_roles("qbm", "hod", "admin")),
    db: Session = Depends(get_db),
):
    if payload.role not in STAFF_ROLES:
        raise HTTPException(status_code=400, detail="Unsupported staff role.")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="A user with that email already exists.")
    new_user = User(
        name=payload.name,
        email=payload.email,
        department=payload.department,
        role=payload.role,
        password_hash=get_password_hash(payload.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return serialize_user(new_user)


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdate,
    actor: User = Depends(require_roles("qbm", "hod", "admin")),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == actor.id and (payload.role is not None or payload.isActive is False):
        raise HTTPException(status_code=400, detail="You cannot change your own role or deactivate yourself.")

    if payload.role is not None:
        if payload.role not in STAFF_ROLES:
            raise HTTPException(status_code=400, detail="Unsupported staff role.")
        target.role = payload.role
    if payload.isActive is not None:
        target.is_active = payload.isActive
    db.commit()
    db.refresh(target)
    return serialize_user(target)


def _admin_role(db: Session) -> Role | None:
    return db.query(Role).filter(Role.name == "admin").first()


@router.post("/{user_id}/roles")
def grant_role(
    user_id: int,
    payload: GrantRoleRequest,
    actor: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    if payload.role != "admin":
        raise HTTPException(status_code=400, detail="Only the admin role can be granted here.")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    admin_role = _admin_role(db)
    if admin_role and not any(r.id == admin_role.id for r in target.granted):
        target.granted.append(admin_role)
        db.commit()
    db.refresh(target)
    return serialize_user(target)


@router.delete("/{user_id}/roles/{role}")
def revoke_role(
    user_id: int,
    role: str,
    actor: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    if role != "admin":
        raise HTTPException(status_code=400, detail="Only the admin role can be revoked here.")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == actor.id:
        raise HTTPException(status_code=400, detail="You cannot revoke your own admin access.")
    remaining = db.query(User).filter(User.is_active.is_(True)).all()
    admins = [u for u in remaining if has_role(u, "admin")]
    if len(admins) <= 1:
        raise HTTPException(status_code=400, detail="The system must always have an administrator.")
    admin_role = _admin_role(db)
    if admin_role:
        target.granted = [r for r in target.granted if r.id != admin_role.id]
        db.commit()
    db.refresh(target)
    return serialize_user(target)


@router.post("/{user_id}/reset-password")
def reset_password(
    user_id: int,
    payload: ResetPasswordRequest,
    actor: User = Depends(require_roles("qbm", "hod", "admin")),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.password_hash = get_password_hash(payload.newPassword)
    db.commit()
    return {"ok": True}
