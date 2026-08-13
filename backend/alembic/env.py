"""Alembic configuration.

Reads the database URL from the application config so the dev (SQLite) and
production (Postgres) settings stay in one place, then runs migrations.
"""

from logging.config import fileConfig

from alembic import context

from app.config import get_settings
from app.database import Base

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

from app.config import get_settings
from app.database import Base
import app.models  # noqa: F401 register all tables on Base for autogenerate

settings = get_settings()
target_metadata = Base.metadata


def get_url() -> str:
    url = settings.database_url
    if url.startswith("sqlite"):
        url = f"sqlite:///{url.split('///', 1)[1]}"
    return url


def run_migrations_offline():
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    from sqlalchemy import engine_from_config, pool
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        url=get_url(),
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
