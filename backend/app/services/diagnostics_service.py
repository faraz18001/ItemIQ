"""Health checks for the admin Diagnostics screen.

Returns the ``Report`` shape from ``frontend/src/pages/app/admin/Diagnostics.tsx``:
a list of checks, a tally per status, and an overall ``healthy`` flag.
"""

from pathlib import Path

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    ExamPaper,
    PdfSubmission,
    Question,
    QuestionRequest,
    User,
)

settings = get_settings()


def run_checks(db: Session) -> dict:
    checks = [
        _db_check(db),
        _counts_check(db),
        _questions_check(db),
        _submissions_check(db),
        _upload_dir_check(),
        _config_check(),
    ]
    tally = {"fail": 0, "warn": 0, "info": 0, "ok": 0}
    for check in checks:
        tally[check["status"]] += 1
    return {
        "checks": checks,
        "tally": tally,
        "healthy": tally["fail"] == 0,
    }


def _db_check(db: Session) -> dict:
    try:
        db.execute(func.count(User.id))
        return {
            "key": "db_connect",
            "title": "Database reachable",
            "category": "Database",
            "status": "ok",
            "summary": f"Connected to {settings.database_url}",
            "remedy": None,
            "samples": [],
            "count": 0,
        }
    except Exception as exc:  # pragma: no cover
        return {
            "key": "db_connect",
            "title": "Database unreachable",
            "category": "Database",
            "status": "fail",
            "summary": str(exc),
            "remedy": "Check DATABASE_URL and that the database service is running.",
            "samples": [],
            "count": 0,
        }


def _counts_check(db: Session) -> dict:
    counts = {
        "users": db.query(User).count(),
        "questions": db.query(Question).count(),
        "requests": db.query(QuestionRequest).count(),
        "submissions": db.query(PdfSubmission).count(),
        "papers": db.query(ExamPaper).count(),
    }
    return {
        "key": "row_counts",
        "title": "Row counts",
        "category": "Data",
        "status": "info",
        "summary": "Rows per primary table as the API sees them.",
        "remedy": None,
        "samples": [{"table": k, "rows": v} for k, v in counts.items()],
        "count": sum(counts.values()),
    }


def _questions_check(db: Session) -> dict:
    total = db.query(Question).count()
    live = db.query(Question).filter(Question.status == "in_bank").count()
    status = "ok" if live else ("warn" if total else "fail")
    return {
        "key": "bank_size",
        "title": "Question bank",
        "category": "Quality",
        "status": status,
        "summary": f"{live} live questions in the bank of {total} written.",
        "remedy": "Write and approve questions, or run the seeder to populate the bank.",
        "samples": [],
        "count": live,
    }


def _submissions_check(db: Session) -> dict:
    stuck = db.query(PdfSubmission).filter(PdfSubmission.status == "PENDING_SME").count()
    status = "info" if stuck else "ok"
    return {
        "key": "stuck_submissions",
        "title": "Submissions waiting on SME review",
        "category": "Workflow",
        "status": status,
        "summary": f"{stuck} uploaded PDFs have not been reviewed yet.",
        "remedy": None,
        "samples": [],
        "count": stuck,
    }


def _upload_dir_check() -> dict:
    dir_path = Path(settings.upload_dir)
    dir_path.mkdir(parents=True, exist_ok=True)
    writable = _is_writable(dir_path)
    return {
        "key": "upload_dir",
        "title": "Upload directory writable",
        "category": "Storage",
        "status": "ok" if writable else "fail",
        "summary": str(dir_path),
        "remedy": "Ensure UPLOAD_DIR exists and the server process can write to it.",
        "samples": [],
        "count": 0,
    }


def _is_writable(dir_path: Path) -> bool:
    probe = dir_path / ".probe"
    try:
        probe.write_text("ok")
        probe.unlink()
        return True
    except OSError:
        return False


def _config_check() -> dict:
    insecure = settings.secret_key.startswith("dev-only")
    return {
        "key": "secret_key",
        "title": "JWT secret key",
        "category": "Security",
        "status": "warn" if insecure else "ok",
        "summary": (
            "Using the built-in development key. Set SECRET_KEY in .env before deploying."
            if insecure else "SECRET_KEY is set from the environment."
        ),
        "remedy": "Generate a key with `python -c \"import secrets; print(secrets.token_hex(32))\"` and put it in .env.",
        "samples": [],
        "count": 0,
    }