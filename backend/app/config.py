"""Application settings, loaded from environment / .env.

Never put real secrets in this file. Copy ``.env.example`` to ``.env`` and
override there; values are read at import time so a restart applies them.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = _BACKEND_DIR.parent


class Settings(BaseSettings):
    app_name: str = "ItemIQ API"
    debug: bool = False

    # Security. The default is a placeholder so the app can boot in a clean
    # checkout; a deployment MUST set SECRET_KEY in .env.
    secret_key: str = "dev-only-insecure-key-change-me-32bytes"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    database_url: str = f"sqlite:///{_BACKEND_DIR / 'itemiq.db'}"

    # Where uploaded PDFs live and where the built frontend is served from.
    upload_dir: str = str(PROJECT_ROOT / "uploads")
    frontend_dist: str = str(PROJECT_ROOT / "frontend" / "dist")

    # The frontend proxy in development; CORS is only opened for these.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
