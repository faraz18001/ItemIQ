from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models import Attempt, Bookmark, Notification, Question, User
from app.schemas import AttemptIn, BookmarkIn
from app.services.serializers import attempt_result, serialize_notification

router = APIRouter(tags=["Engagement"])


# ── notifications ────────────────────────────────────────────────────────────

@router.get("/notifications")
def list_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Notification)
        .filter(Notification.recipient_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
        .all()
    )
    return [serialize_notification(n) for n in rows]


@router.post("/notifications/{notif_id}/read")
def mark_read(
    notif_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.get(Notification, notif_id)
    if not notif or notif.recipient_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(Notification.recipient_id == user.id).update({"is_read": True})
    db.commit()
    return {"ok": True}


# ── bookmarks ────────────────────────────────────────────────────────────────

@router.get("/bookmarks")
def list_bookmarks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(Bookmark).filter(Bookmark.user_id == user.id).all()
    return [str(b.question_id) for b in rows]


@router.post("/bookmarks")
def add_bookmark(
    payload: BookmarkIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    question_id = int(payload.questionId)
    if not db.get(Question, question_id):
        raise HTTPException(status_code=404, detail="Question not found")
    if not db.query(Bookmark).filter_by(user_id=user.id, question_id=question_id).first():
        db.add(Bookmark(user_id=user.id, question_id=question_id))
        db.commit()
    return {"ok": True}


@router.delete("/bookmarks/{question_id}")
def remove_bookmark(
    question_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Bookmark).filter(Bookmark.user_id == user.id, Bookmark.question_id == question_id).delete()
    db.commit()
    return {"ok": True}


# ── attempts & progress ──────────────────────────────────────────────────────

@router.post("/attempts")
def record_attempt(
    payload: AttemptIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    question = db.get(Question, int(payload.questionId))
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    correct_position = next((o.position for o in question.options if o.is_correct), None)
    is_correct = payload.selected == correct_position
    prior = (
        db.query(Attempt)
        .filter(Attempt.user_id == user.id, Attempt.question_id == question.id)
        .first()
    )
    is_first = prior is None

    db.add(Attempt(
        user_id=user.id,
        question_id=question.id,
        selected_position=payload.selected,
        is_correct=is_correct,
        is_first=is_first,
    ))
    question.attempt_count = (question.attempt_count or 0) + 1
    db.commit()
    db.refresh(question)
    return attempt_result(question, payload.selected, is_correct, is_first)


@router.get("/progress/me")
def my_progress(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    first_attempts = (
        db.query(Attempt)
        .filter(Attempt.user_id == user.id, Attempt.is_first.is_(True))
        .all()
    )
    all_attempts = db.query(Attempt).filter(Attempt.user_id == user.id).count()

    attempted = len(first_attempts)
    correct = sum(1 for a in first_attempts if a.is_correct)

    by_subject: dict[str, dict] = {}
    for a in first_attempts:
        question = db.get(Question, a.question_id)
        if not question or not question.subtopic_id:
            continue
        subject = question.subtopic.topic.subject
        name = subject.name if subject else "Unknown"
        bucket = by_subject.setdefault(name, {"correct": 0, "total": 0})
        bucket["total"] += 1
        bucket["correct"] += 1 if a.is_correct else 0

    ordered = sorted(first_attempts, key=lambda a: a.created_at, reverse=True)
    streak = 0
    for a in ordered:
        if a.is_correct:
            streak += 1
        else:
            break

    return {
        "attempted": attempted,
        "correct": correct,
        "accuracy": round(correct / attempted, 3) if attempted else 0,
        "streak": streak,
        "totalAttempts": all_attempts,
        "bySubject": [
            {"subject": name, "correct": v["correct"], "total": v["total"]}
            for name, v in by_subject.items()
        ],
    }
