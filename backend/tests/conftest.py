"""Shared fixtures: an isolated SQLite database per test session.

The env vars are set before any ``app`` module is imported so the engine the
application builds points at the throwaway test database. The fixture then
drops and recreates the schema and seeds a small, deterministic dataset.
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_itemiq.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("DEBUG", "false")

from app.core.security import get_password_hash  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import (  # noqa: E402
    Attempt,
    Program,
    Question,
    QuestionOption,
    Subject,
    Subtopic,
    Topic,
    User,
)
from fastapi.testclient import TestClient  # noqa: E402
import pytest  # noqa: E402


@pytest.fixture()
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    prog = Program(name="MBBS", description="test program", level="UG")
    db.add(prog)
    db.commit()
    subj = Subject(name="Physiology", code="PHY", program_id=prog.id)
    db.add(subj)
    db.commit()
    topic = Topic(name="Cardiovascular", subject_id=subj.id, code="CV")
    db.add(topic)
    db.commit()
    sub = Subtopic(name="Cardiac Cycle", topic_id=topic.id, code="CC")
    db.add(sub)
    db.commit()

    users = {}
    for role in ("admin", "qbm", "hod", "sme", "faculty", "examiner", "student"):
        u = User(
            name=f"{role.title()} User",
            email=f"{role}@test.itemiq",
            password_hash=get_password_hash("password"),
            role=role,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        users[role] = u

    q = Question(
        stem="What is the normal duration of ventricular ejection in health?",
        subtopic_id=sub.id,
        author_id=users["faculty"].id,
        status="in_bank",
        difficulty_tag="Medium",
        difficulty_score=0.55,
        faculty_difficulty="Medium",
        explanation="Roughly 80 milliseconds.",
        reference="Test Guide",
    )
    db.add(q)
    db.flush()
    opts = ["20 ms", "40 ms", "80 ms", "120 ms"]
    for pos, text in enumerate(opts):
        q.options.append(
            QuestionOption(text=text, position=pos, is_correct=pos == 2)
        )
    db.flush()
    for i in range(24):
        picked = 2 if i % 5 != 0 else 0
        db.add(Attempt(
            user_id=users["student"].id, question_id=q.id,
            selected_position=picked, is_correct=picked == 2, is_first=True,
        ))
        q.attempt_count += 1
    db.commit()
    yield {"db": db, "users": users, "question": q}
    db.close()


@pytest.fixture()
def client(db):
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def tokens(client, db):
    users = db["users"]
    out = {}
    for role in ("qbm", "faculty", "student", "admin", "sme", "hod", "examiner"):
        r = client.post("/api/auth/login",
                        json={"identifier": f"{role}@test.itemiq", "password": "password"})
        assert r.status_code == 200, r.json()
        out[role] = r.json()["token"]
    return {"token": out, "users": users, "question": db["question"]}
