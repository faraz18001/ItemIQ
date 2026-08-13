from datetime import date
from random import sample as random_sample

from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models import (
    TOS,
    ExamPaper,
    ExamPaperQuestion,
    Program,
    Question,
    Subtopic,
    Topic,
    TOSEntry,
    User,
)
from app.schemas import PaperCreate, PaperStatusUpdate, TosCreate
from app.services.serializers import (
    serialize_paper,
    serialize_program,
    serialize_question,
    serialize_tos,
)
from app.services.stats import attempt_aggregates, sitting_stats
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

router = APIRouter(tags=["Papers & Blueprints"])


# ── programmes ───────────────────────────────────────────────────────────────


@router.get("/programs")
def get_programs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [serialize_program(p) for p in db.query(Program).order_by(Program.name).all()]


# ── table of specification ───────────────────────────────────────────────────


@router.get("/tos")
def list_tos(
    user: User = Depends(require_roles("qbm", "hod", "examiner", "admin")),
    db: Session = Depends(get_db),
):
    rows = db.query(TOS).order_by(TOS.created_at.desc()).all()
    return [serialize_tos(t, db) for t in rows]


@router.post("/tos")
def create_tos(
    payload: TosCreate,
    user: User = Depends(require_roles("qbm", "hod", "examiner", "admin")),
    db: Session = Depends(get_db),
):
    tos = TOS(
        title=payload.title,
        program_id=int(payload.programId) if payload.programId else None,
        exam_type=payload.examType,
        academic_year=payload.academicYear,
        created_by=user.id,
    )
    for e in payload.entries:
        tos.entries.append(
            TOSEntry(
                topic_id=int(e.topicId) if e.topicId else None,
                subtopic_id=int(e.subtopicId) if e.subtopicId else None,
                q_type=e.qType or "MCQ",
                difficulty=e.difficulty or "Medium",
                n_required=e.nRequired,
                bloom=e.bloom,
            )
        )
    db.add(tos)
    db.commit()
    db.refresh(tos)
    return serialize_tos(tos, db)


@router.post("/tos/{tos_id}/autofill")
def autofill(
    tos_id: int,
    batch: str | None = Query(None),
    user: User = Depends(require_roles("qbm", "hod", "examiner", "admin")),
    db: Session = Depends(get_db),
):
    tos = db.get(TOS, tos_id)
    if not tos:
        raise HTTPException(status_code=404, detail="Blueprint not found")

    selected_ids: set[int] = set()
    selected: list[Question] = []
    shortfalls = []
    repeats_for_batch: list[str] = []

    for entry in tos.entries:
        query = db.query(Question).filter(Question.status == "in_bank")
        if entry.subtopic_id:
            query = query.filter(Question.subtopic_id == entry.subtopic_id)
        elif entry.topic_id:
            topic_ids = [st.id for st in db.query(Subtopic).filter(Subtopic.topic_id == entry.topic_id).all()]
            query = query.filter(Question.subtopic_id.in_(topic_ids))
        if entry.difficulty and entry.difficulty != "Any":
            query = query.filter(Question.difficulty_tag == entry.difficulty)
        candidates = [q for q in query.all() if q.id not in selected_ids]

        available = len(candidates)
        needed = min(entry.n_required, available)
        for q in random_sample(candidates, needed) if candidates else []:
            selected_ids.add(q.id)
            selected.append(q)
        if available < entry.n_required:
            name = "Any"
            if entry.subtopic_id:
                s = db.get(Subtopic, entry.subtopic_id)
                name = s.name if s else None
            elif entry.topic_id:
                t = db.get(Topic, entry.topic_id)
                name = t.name if t else None
            shortfalls.append(
                {
                    "entryId": str(entry.id),
                    "subtopicName": name or "Any",
                    "required": entry.n_required,
                    "available": available,
                }
            )

    attempts = attempt_aggregates(db, [q.id for q in selected])
    return {
        "questions": [serialize_question(q, viewer=user, attempts=attempts) for q in selected],
        "shortfalls": shortfalls,
        "programId": str(tos.program_id) if tos.program_id else None,
        "offProgrammeSkipped": 0,
        "repeatsForBatch": repeats_for_batch,
    }


# ── papers ───────────────────────────────────────────────────────────────────


@router.get("/papers")
def list_papers(
    user: User = Depends(require_roles("qbm", "hod", "examiner", "admin")),
    db: Session = Depends(get_db),
):
    rows = db.query(ExamPaper).order_by(ExamPaper.created_at.desc()).all()
    return [serialize_paper(p) for p in rows]


@router.post("/papers")
def create_paper(
    payload: PaperCreate,
    user: User = Depends(require_roles("qbm", "hod", "examiner", "admin")),
    db: Session = Depends(get_db),
):
    paper = ExamPaper(
        title=payload.title,
        tos_id=int(payload.tosId) if payload.tosId else None,
        created_by=user.id,
        batch=payload.batch,
        academic_year=payload.academicYear,
        program_id=int(payload.programId) if payload.programId else None,
        exam_type=payload.examType,
        allow_repeats=payload.allowRepeats,
    )
    if payload.examDate:
        try:
            paper.exam_date = date.fromisoformat(payload.examDate)
        except ValueError:
            raise HTTPException(status_code=400, detail="examDate must be YYYY-MM-DD.") from None

    for position, qid in enumerate(payload.questionIds):
        question = db.get(Question, int(qid))
        if not question:
            continue
        paper.questions.append(
            ExamPaperQuestion(exam_paper_id=paper.id, question_id=question.id, position=position + 1)
        )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return serialize_paper(paper)


@router.post("/papers/{paper_id}/status")
def set_paper_status(
    paper_id: int,
    payload: PaperStatusUpdate,
    user: User = Depends(require_roles("qbm", "hod", "admin")),
    db: Session = Depends(get_db),
):
    paper = db.get(ExamPaper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if paper.status == "sat" and payload.status != "sat":
        raise HTTPException(status_code=400, detail="A sat paper cannot be reopened.")
    paper.status = payload.status
    db.commit()
    db.refresh(paper)
    return serialize_paper(paper)


@router.get("/papers/{paper_id}/export")
def export_paper(
    paper_id: int,
    variant: str = Query("paper"),
    user: User = Depends(require_roles("qbm", "hod", "examiner", "admin")),
    db: Session = Depends(get_db),
):
    paper = db.get(ExamPaper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if variant not in ("paper", "key", "template"):
        raise HTTPException(status_code=400, detail="Unknown export variant.")

    from app.services.paper_export import export_paper as build_docx

    content = build_docx(paper, variant)
    filename = f"{variant}.docx"
    return Response(
        content=content,
        media_type=("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/papers/{paper_id}/responses")
def import_responses(
    paper_id: int,
    dry_run: bool = Query(True),
    file: UploadFile = File(...),
    user: User = Depends(require_roles("qbm", "hod", "admin")),
    db: Session = Depends(get_db),
):
    paper = db.get(ExamPaper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    from app.services.response_import import ImportError_, parse_sheet

    try:
        preview = parse_sheet(db, paper, file.file, dry_run=dry_run)
    except ImportError_ as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not dry_run and preview["responsesWritten"]:
        paper.status = "sat"
        db.commit()
        sitting_stats(db, paper_id)

    return preview
