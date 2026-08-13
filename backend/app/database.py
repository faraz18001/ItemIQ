from datetime import datetime, timezone

from app.config import get_settings
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


class Base(DeclarativeBase):
    pass


settings = get_settings()

_connect_args = {"check_same_thread": False} if _is_sqlite(settings.database_url) else {}

engine = create_engine(settings.database_url, connect_args=_connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
