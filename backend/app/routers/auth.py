from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import create_access_token, get_current_user, get_password_hash, verify_password
from app.database import get_db
from app.models import User
from app.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    PasswordResetSubmit,
    RegisterRequest,
)
from app.services.serializers import serialize_auth_user

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()

# Roles a stranger may pick at sign-up. Everything else — qbm, hod, examiner,
# admin — is granted by an existing user through /users, never self-assigned.
PUBLIC_ROLES = {"faculty", "student"}


def _find_user(db: Session, identifier: str) -> User | None:
    return (
        db.query(User)
        .filter((User.email == identifier) | (User.username == identifier))
        .first()
    )


def _reset_token(user_id: int) -> str:
    import jwt
    return jwt.encode(
        {"sub": str(user_id), "scope": "reset"},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def _verify_reset_token(token: str) -> int:
    import jwt
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="The reset token is invalid or has expired.")
    if payload.get("scope") != "reset":
        raise HTTPException(status_code=400, detail="The reset token is invalid or has expired.")
    return int(payload.get("sub", 0))


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if payload.role not in PUBLIC_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That role cannot be chosen at registration.",
        )
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        department="",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user)
    return {"token": token, "user": serialize_auth_user(user)}


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = _find_user(db, payload.identifier)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )
    token = create_access_token(user)
    return {"token": token, "user": serialize_auth_user(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return serialize_auth_user(user)


@router.post("/logout")
def logout():
    # Stateless JWT auth: the client just drops the token.
    return {"ok": True}


@router.post("/password")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.currentPassword, user.password_hash):
        raise HTTPException(status_code=400, detail="The current password is incorrect.")
    user.password_hash = get_password_hash(payload.newPassword)
    db.commit()
    return {"ok": True}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # The response is intentionally identical whether or not the address exists,
    # so the form cannot be used to probe for accounts.
    user = db.query(User).filter(User.email == payload.email).first()
    token = _reset_token(user.id) if user else None
    return {
        "ok": True,
        "message": "If an account exists for that address, a reset link has been generated.",
        "devToken": settings.debug and token or None,
    }


@router.post("/reset-password")
def reset_password(payload: PasswordResetSubmit, db: Session = Depends(get_db)):
    user_id = _verify_reset_token(payload.token)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=400, detail="The reset token is invalid or has expired.")
    user.password_hash = get_password_hash(payload.newPassword)
    db.commit()
    return {"ok": True}
