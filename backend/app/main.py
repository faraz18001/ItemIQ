"""
main.py — FastAPI Application Entry Point & Route Assembly Server.

Overview:
  Bootstraps the ItemIQ FastAPI backend application server:
  - Database schema initialization (automatic table creation for development environment).
  - CORS middleware configuration with configurable allowed origins.
  - Mounts all domain API sub-routers under `/api` prefix.
  - Configures static asset serving for uploaded PDFs and extracted diagram crops (`/uploads/`).
  - Configures SPA static fallbacks for production frontend serving.
"""

from pathlib import Path

from app.config import get_settings
from app.database import Base, engine
from app.routers import (
    admin,
    ai,
    analytics,
    auth,
    engagement,
    mock,
    papers,
    questions,
    requests,
    taxonomy,
    users,
)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

settings = get_settings()

# Create tables directly in development. Alembic applies the same model in
# production (see alembic/versions); create_all is intentionally only here so
# a fresh checkout boots without a migration step.
if settings.debug:
    Base.metadata.create_all(bind=engine)

app = FastAPI(title="ItemIQ API")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(taxonomy.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(papers.router, prefix="/api")
app.include_router(engagement.router, prefix="/api")
app.include_router(mock.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files (extracted images, PDFs) under /uploads/
uploads_dir = Path(settings.upload_dir)
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# In production FastAPI serves the built frontend bundle.
dist = Path(settings.frontend_dist)
if dist.exists():
    app.mount("/", StaticFiles(directory=str(dist), html=True), name="frontend")
