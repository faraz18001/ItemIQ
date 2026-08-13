from app.database import Base, _utcnow
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class UserRole(Base):
    __tablename__ = "user_role"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), primary_key=True)
    assigned_at = mapped_column(DateTime, default=_utcnow)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # Staff log in with their email; students with their roll number.
    username: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    student_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(String(64), default="faculty")
    department: Mapped[str] = mapped_column(String(200), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = mapped_column(DateTime, default=_utcnow)
    updated_at = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    granted: Mapped[list[Role]] = relationship(
        "Role",
        secondary="user_role",
        lazy="selectin",
    )


def role_names_for(user: User) -> set[str]:
    """Every role a user holds: the primary ``role`` plus granted junction roles."""
    return {user.role, *(r.name for r in user.granted)}
