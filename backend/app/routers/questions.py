"""
questions.py — Question Bank Management, Workflow Router & PDF Submission Pipeline.

Overview:
  This router manages the core question lifecycle within ItemIQ:
  1. Question Bank Querying (`/questions`): Search, filter, and retrieve questions with psychometric metrics.
  2. Manual Question Authoring (`POST /questions`): Direct question creation by faculty.
  3. PDF Past Paper Submissions (`POST /questions/submit-pdf`): Ingestion of Question Paper & Mark Scheme PDFs.
  4. SME Review Queue (`POST /questions/submissions/{id}/sme-approve`): Subject Matter Expert verification of extracted questions.
  5. QBM Per-Item Decisions (`POST /questions/submissions/{id}/item-decisions`): Interactive item-by-item sign-off.
  6. Final Bank Approval (`POST /questions/submissions/{id}/final-approve`): Moving approved questions into the active Question Bank.
"""

import os
from pathlib import Path
import shutil
import uuid
from typing import List

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
from app.models.engagement import Notification
from app.schemas import QuestionCreate, QuestionUpdate, ReviewDecision
from app.services.serializers import serialize_question, serialize_submission
from app.services.stats import attempt_aggregates
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter(prefix="/questions", tags=["Questions & Workflows"])

settings = get_settings()

# Default classical test theory difficulty scores mapped from qualitative tags
DIFFICULTY_SCORE = {"Easy": 0.35, "Medium": 0.55, "Hard": 0.75}


# ── Pydantic Schemas for Interactive Review ─────────────────────────────────

class ItemDecision(BaseModel):
    """Represents a QBM's review verdict on an individual extracted question item."""
    q_id: str
    decision: str   # Valid options: "accepted" | "rejected"
    remark: str = ""

class ItemDecisionsPayload(BaseModel):
    """Payload containing batch item decisions during QBM review."""
    decisions: List[ItemDecision]


def _write_question(db: Session, user: User, payload: QuestionCreate, question: Question):
    """Helper routine to populate or update Question model fields from a authoring payload."""
    question.author_id = user.id
    question.subtopic_id = int(payload.subtopicId)
    question.stem = payload.stem
    question.q_type = "MCQ"
    question.faculty_difficulty = payload.facultyDifficulty
    question.difficulty_tag = payload.facultyDifficulty
    question.difficulty_score = DIFFICULTY_SCORE.get(payload.facultyDifficulty, 0.55)
    question.ai_difficulty = payload.facultyDifficulty
    question.explanation = payload.explanation
    question.reference = payload.reference

    # Rebuild options from payload list; position index determines key assignment
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
    if (
        question.author_id != user.id
        and not has_role(user, "qbm")
        and not has_role(user, "hod")
        and not has_role(user, "admin")
    ):
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

    db.add(
        QuestionReview(
            question_id=question.id,
            reviewer_id=user.id,
            stage=payload.stage,
            decision=payload.decision,
            remarks=payload.remarks,
        )
    )

    if payload.stage == "departmental":
        question.status = (
            "under_med_edu_review"
            if payload.decision == "accepted"
            else "correction_required"
            if payload.decision == "correction_required"
            else "rejected"
        )
    else:
        question.status = (
            "in_bank"
            if payload.decision == "accepted"
            else "correction_required"
            if payload.decision == "correction_required"
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
    references: str | None = Form(None),
    file: UploadFile = File(..., alias="file"),
    ms_file: UploadFile = File(..., alias="ms_file"),
    user: User = Depends(require_roles("faculty", "sme", "hod", "qbm", "admin")),
    db: Session = Depends(get_db),
):
    """Accept both the Question Paper PDF and the mandatory Mark Scheme PDF."""
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Save QP file
    ext = os.path.splitext(file.filename or "pdf")[1] or ".pdf"
    qp_name = f"{uuid.uuid4()}{ext}"
    qp_path = upload_dir / qp_name
    with qp_path.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)

    # Save MS file
    ms_ext = os.path.splitext(ms_file.filename or "pdf")[1] or ".pdf"
    ms_name = f"{uuid.uuid4()}{ms_ext}"
    ms_path = upload_dir / ms_name
    with ms_path.open("wb") as buf:
        shutil.copyfileobj(ms_file.file, buf)

    # Run parser immediately so SME can see structured preview
    extracted_preview: list | None = None
    try:
        from app.services.pdf_parser import parse_paper
        from app.config import get_settings
        cfg = get_settings()
        images_root = str(Path(cfg.upload_dir).parent)
        extracted_preview = parse_paper(str(qp_path), str(ms_path), images_root=images_root)
        # Trim heavy fields for the preview JSON
        for rec in extracted_preview:
            rec.pop("pdf", None)
    except Exception as exc:
        print(f"[submit_pdf] parser warning: {exc}")

    sub = PdfSubmission(
        request_id=int(request_id) if request_id.isdigit() else None,
        faculty_id=user.id,
        pdf_path=str(qp_path),
        ms_pdf_path=str(ms_path),
        references=references,
        status="PENDING_SME",
        extracted_json=extracted_preview,
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

    db.add(
        SubmissionReviewLog(
            submission_id=sub.id,
            reviewer_id=user.id,
            comment=payload.remarks,
            decision=payload.decision,
            stage=payload.stage,
        )
    )

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


@router.post("/submissions/{sub_id}/item-decisions")
def save_item_decisions(
    sub_id: int,
    payload: ItemDecisionsPayload,
    user: User = Depends(require_roles("qbm", "hod", "admin")),
    db: Session = Depends(get_db),
):
    """QBM saves per-question accept/reject decisions against extracted_json.
    This endpoint is idempotent — calling it again replaces previous decisions."""
    sub = db.get(PdfSubmission, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.status != "PENDING_QBM":
        raise HTTPException(
            status_code=400,
            detail=f"Item decisions can only be saved on PENDING_QBM submissions (current: {sub.status})",
        )

    sub.item_decisions = [d.model_dump() for d in payload.decisions]
    db.commit()
    db.refresh(sub)
    return serialize_submission(sub)


def _extract_from_pdf(db: Session, sub: PdfSubmission, viewer: User) -> None:
    """Called on QBM final approval.

    - Reads per-question decisions from sub.item_decisions (saved by QBM interactively).
    - Only inserts ACCEPTED questions into the question table.
    - Sends a Notification to the faculty member for every REJECTED question.
    - Falls back to accepting all questions if no item_decisions are set.
    """
    try:
        from app.services.pdf_parser import parse_paper
        from app.config import get_settings

        subtopic_id = None
        if sub.request_id:
            req = db.get(QuestionRequest, sub.request_id)
            if req:
                subtopic_id = req.subtopic_id

        # Use cached preview if available, otherwise re-parse
        records = sub.extracted_json
        if not records:
            cfg = get_settings()
            images_root = str(Path(cfg.upload_dir).parent)
            records = parse_paper(
                sub.pdf_path,
                sub.ms_pdf_path,
                images_root=images_root,
            )

        # Build lookup: q_id -> {decision, remark}
        decisions: dict[str, dict] = {}
        if sub.item_decisions:
            for d in sub.item_decisions:
                decisions[d["q_id"]] = d

        accepted_count = 0
        rejected_count = 0

        for rec in records:
            q_id = rec.get("id", "")
            item_dec = decisions.get(q_id, {})
            decision = item_dec.get("decision", "accepted")   # default accept if no decision set

            if decision == "rejected":
                rejected_count += 1
                remark = item_dec.get("remark", "No reason given.")
                stem_preview = (rec.get("stem") or "")[:80]
                # Notify the faculty member
                db.add(Notification(
                    recipient_id=sub.faculty_id,
                    type="Correction_Required",
                    message=(
                        f'QBM rejected question "{stem_preview}…" '
                        f'from your submission. Reason: {remark}'
                    ),
                ))
                continue  # skip inserting this question

            accepted_count += 1
            q = Question(
                stem=rec.get("stem") or rec.get("text", "Empty Question").strip(),
                q_type=rec.get("q_type", "MCQ"),
                marking_scheme=rec.get("marking_scheme", ""),
                reference=sub.references,
                status="in_bank",
                subtopic_id=subtopic_id,
                submission_id=sub.id,
                regions=rec.get("regions", []),
                images=rec.get("images", []),
                sub_parts=rec.get("sub_parts", []) or None,
                author_id=sub.faculty_id,
                difficulty_tag="Medium",
                difficulty_score=0.55,
            )
            db.add(q)
            db.flush()  # Get q.id before adding options

            for opt in rec.get("options", []):
                db.add(QuestionOption(
                    question_id=q.id,
                    text=opt.get("text", ""),
                    is_correct=bool(opt.get("is_correct", False)),
                    position=ord(opt["label"].upper()) - ord("A") if opt.get("label") else 0,
                ))

        print(
            f"[_extract_from_pdf] sub={sub.id}: "
            f"{accepted_count} inserted, {rejected_count} rejected"
        )
        db.commit()
    except Exception as exc:  # pragma: no cover
        print(f"[_extract_from_pdf] Error: {exc}")
        import traceback
        traceback.print_exc()
        db.rollback()


@router.get("/bank")
def get_bank(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    questions = db.query(Question).filter(Question.status == "in_bank").order_by(Question.created_at.desc()).all()
    attempts = attempt_aggregates(db, [q.id for q in questions])
    return [serialize_question(q, viewer=user, attempts=attempts) for q in questions]
