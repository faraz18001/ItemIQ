from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pathlib import Path
from typing import Optional
import os
import shutil
import uuid

from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import get_current_user, has_role, require_roles
from app.database import get_db
from app.models import (
    PdfSubmission,
    Question,
    QuestionOption,
    QuestionRequest,
    QuestionReview,
    SubmissionReviewLog,
    Subtopic,
    User,
)
from app.schemas import QuestionCreate, QuestionUpdate, ReviewDecision
from app.services.serializers import serialize_question, serialize_review, serialize_submission
from app.services.stats import attempt_aggregates

router = APIRouter(prefix="/questions", tags=["Questions & Workflows"])

settings = get_settings()

DIFFICULTY_SCORE = {"Easy": 0.35, "Medium": 0.55, "Hard": 0.75}


def _write_question(db: Session, user: User, payload: QuestionCreate, question: Question):
    question.author_id = user.id
    question.subtopic_id = int(payload.subtopicId)
    question.stem = payload.stem
    question.q_type = "MCQ"
    question.faculty_difficulty = payload.facultyDifficulty
    question.difficulty_tag = payload.facultyDifficulty
    question.difficulty_score = DIFFICULTY_SCORE.get(payload.facultyDifficulty, 5.5)
    question.ai_difficulty = payload.facultyDifficulty
    question.explanation = payload.explanation
    question.reference = payload.reference

    # Rebuild options from the list; the `correct` index marks the key.
    question.options.clear()
    db.flush()
    for position, text in enumerate(payload.options):
        question.options.append(
            QuestionOption(
                question_id=question.id,
                text=text,
                position=position,
                is_correct=position == payload.correct,
            )
        )
    question.status = "submitted" if payload.submit else "draft"
    if not question.subtopic_id:
        question.subtopic_id = int(payload.subtopicId)
    db.add(question)
    db.commit()
    db.refresh(question)


@router.post("")
def create_question(
    payload: QuestionCreate,
    user: User = Depends(require_roles("faculty", "sme", "hod", "qbm", "examiner", "admin")),
    db: Session = Depends(get_db),
):
    if not db.get(Subtopic, int(payload.subtopicId)):
        raise HTTPException(status_code=404, detail="Subtopic not found")
    question = Question(subtopic_id=int(payload.subtopicId))
    _write_question(db, user, payload, question)
    return serialize_question(question, viewer=user, attempts=attempt_aggregates(db, [question.id]))


@router.get("")
def get_questions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Question).order_by(Question.created_at.desc())
    if user.role == "student":
        query = query.filter(Question.status == "in_bank")
    elif user.role == "faculty":
        query = query.filter((Question.author_id == user.id) | (Question.status == "in_bank"))
    elif user.role in ("sme", "examiner"):
        query = query.filter(
            Question.status.in_(["in_bank", "submitted", "under_departmental_review", "correction_required"])
        )

    questions = query.all()
    attempts = attempt_aggregates(db, [q.id for q in questions])
    return [serialize_question(q, viewer=user, attempts=attempts) for q in questions]


@router.patch("/{question_id}")
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question.author_id != user.id and not has_role(user, "qbm") and not has_role(user, "hod") and not has_role(user, "admin"):
        raise HTTPException(status_code=403, detail="You cannot edit this question.")

    if payload.subtopicId is not None:
        question.subtopic_id = int(payload.subtopicId)
    if payload.stem is not None:
        question.stem = payload.stem
    if payload.facultyDifficulty is not None:
        question.faculty_difficulty = payload.facultyDifficulty
        question.difficulty_tag = payload.facultyDifficulty
        question.difficulty_score = DIFFICULTY_SCORE.get(payload.facultyDifficulty, 5.5)
    if payload.explanation is not None:
        question.explanation = payload.explanation
    if payload.reference is not None:
        question.reference = payload.reference
    if payload.options is not None and payload.correct is not None:
        question.options.clear()
        db.flush()
        for position, text in enumerate(payload.options):
            question.options.append(
                QuestionOption(
                    question_id=question.id,
                    text=text,
                    position=position,
                    is_correct=position == payload.correct,
                )
            )
    db.commit()
    db.refresh(question)
    return serialize_question(question, viewer=user, attempts=attempt_aggregates(db, [question.id]))


@router.post("/{question_id}/submit")
def submit_question(
    question_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question.author_id != user.id:
        raise HTTPException(status_code=403, detail="Only the author can submit this question.")
    question.status = "submitted"
    db.commit()
    db.refresh(question)
    return serialize_question(question, viewer=user)


@router.post("/{question_id}/reviews")
def review_question(
    question_id: int,
    payload: ReviewDecision,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.stage == "departmental":
        if not (has_role(user, "sme") or has_role(user, "hod") or has_role(user, "qbm") or has_role(user, "admin")):
            raise HTTPException(status_code=403, detail="Only an SME can pass this stage.")
    elif payload.stage == "med_edu":
        if not (has_role(user, "qbm") or has_role(user, "hod") or has_role(user, "admin")):
            raise HTTPException(status_code=403, detail="Only the QBM can pass this stage.")
    else:
        raise HTTPException(status_code=400, detail="Unknown review stage.")

    db.add(QuestionReview(
        question_id=question.id,
        reviewer_id=user.id,
        stage=payload.stage,
        decision=payload.decision,
        remarks=payload.remarks,
    ))

    if payload.stage == "departmental":
        question.status = (
            "under_med_edu_review" if payload.decision == "accepted"
            else "correction_required" if payload.decision == "correction_required"
            else "rejected"
        )
    else:
        question.status = (
            "in_bank" if payload.decision == "accepted"
            else "correction_required" if payload.decision == "correction_required"
            else "rejected"
        )
    question.review_remark = payload.remarks
    db.commit()
    db.refresh(question)
    return serialize_question(question, viewer=user)


# ── PDF submissions ─────────────────────────────────────────────────────────

@router.post("/submissions")
def submit_pdf(
    request_id: str = Form(...),
    references: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user: User = Depends(require_roles("faculty", "sme", "hod", "qbm", "admin")),
    db: Session = Depends(get_db),
):
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = os.path.splitext(file.filename or "pdf")[1] or ".pdf"
    file_name = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / file_name
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    sub = PdfSubmission(
        request_id=int(request_id) if request_id.isdigit() else None,
        faculty_id=user.id,
        pdf_path=str(file_path),
        references=references,
        status="PENDING_SME",
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return serialize_submission(sub)


@router.get("/submissions")
def get_submissions(
    user: User = Depends(require_roles("qbm", "hod", "faculty", "sme", "examiner", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(PdfSubmission).order_by(PdfSubmission.created_at.desc())
    if user.role == "faculty":
        query = query.filter(PdfSubmission.faculty_id == user.id)
    return [serialize_submission(s) for s in query.all()]


@router.get("/submissions/download/{sub_id}")
def download_submission(
    sub_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.get(PdfSubmission, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    path = Path(sub.pdf_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="The uploaded file no longer exists.")
    return FileResponse(str(path), media_type="application/pdf", filename=path.name)


@router.post("/submissions/{sub_id}/review")
def review_submission(
    sub_id: int,
    payload: ReviewDecision,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.get(PdfSubmission, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    if payload.stage == "departmental":
        if not (has_role(user, "sme") or has_role(user, "hod") or has_role(user, "qbm") or has_role(user, "admin")):
            raise HTTPException(status_code=403, detail="Only an SME can review this submission.")
    elif payload.stage == "med_edu":
        if not (has_role(user, "qbm") or has_role(user, "hod") or has_role(user, "admin")):
            raise HTTPException(status_code=403, detail="Only the QBM can approve this submission.")
    else:
        raise HTTPException(status_code=400, detail="Unknown review stage.")

    db.add(SubmissionReviewLog(
        submission_id=sub.id,
        reviewer_id=user.id,
        comment=payload.remarks,
        decision=payload.decision,
        stage=payload.stage,
    ))

    if payload.decision not in ("accepted", "rejected", "correction_required"):
        raise HTTPException(status_code=400, detail="Unknown decision.")

    if payload.decision != "accepted":
        sub.status = "REJECTED"
    elif sub.status == "PENDING_SME":
        sub.status = "PENDING_QBM"
    elif sub.status == "PENDING_QBM":
        sub.status = "APPROVED"
        _extract_from_pdf(db, sub, user)
    db.commit()
    db.refresh(sub)
    return {"status": sub.status, "message": "Review logged successfully."}


def _extract_from_pdf(db: Session, sub: PdfSubmission, viewer: User) -> None:
    try:
        from app.services.pdf_parser import parse_paper

        records = parse_paper(sub.pdf_path)
        for rec in records:
            q = Question(
                stem=rec.get("text", "Empty Question").strip(),
                q_type="MCQ",
                marking_scheme=str(rec.get("marks", "")),
                reference=sub.references,
                status="in_bank",
                subtopic_id=None,
                submission_id=sub.id,
                regions=rec.get("regions", []),
                author_id=sub.faculty_id,
                difficulty_tag="Medium",
                difficulty_score=5.5,
            )
            db.add(q)
        db.commit()
    except Exception as exc:  # pragma: no cover - depends on the uploaded file
        print(f"Error during PDF extraction: {exc}")
        db.rollback()


@router.get("/bank")
def get_bank(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    questions = db.query(Question).filter(Question.status == "in_bank").order_by(Question.created_at.desc()).all()
    attempts = attempt_aggregates(db, [q.id for q in questions])
    return [serialize_question(q, viewer=user, attempts=attempts) for q in questions]