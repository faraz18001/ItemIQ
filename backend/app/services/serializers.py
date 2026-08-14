"""Serializers: every HTTP response shape, in one place.

The field names mirror ``frontend/src/types/index.ts`` exactly so the frontend
types and the API cannot drift apart. ``serialize_question`` takes the optional
``attempts`` map (question_id -> aggregate) so the list endpoint can compute it
in one query instead of N+1.
"""

from app.models import (
    TOS,
    Description,
    ExamPaper,
    PdfSubmission,
    Program,
    Question,
    QuestionRequest,
    Subject,
    Subtopic,
    Topic,
    User,
)
from sqlalchemy.orm import Session

DEFAULT_WEIGHTS = {"faculty": 0.6, "ai": 0.2, "student": 0.2}


def _iso(dt) -> str | None:
    return dt.isoformat() if dt else None


def _option_label(position: int) -> str:
    return chr(ord("A") + position)


# ── users ────────────────────────────────────────────────────────────────────


def serialize_user(user: User) -> dict:
    roles = sorted({user.role, *(r.name for r in user.granted)})
    return {
        "id": str(user.id),
        "publicId": f"USR-{user.id}",
        "name": user.name,
        "email": user.email,
        "department": user.department or "SIUT Examinations",
        "role": user.role,
        "roles": roles,
        "joiningDate": user.created_at.date().isoformat() if user.created_at else None,
        "isActive": user.is_active,
        "studentId": user.student_id,
    }


def serialize_auth_user(user: User) -> dict:
    data = serialize_user(user)
    data.pop("joiningDate", None)
    data.pop("isActive", None)
    return data


# ── taxonomy / programmes ────────────────────────────────────────────────────


def serialize_program(program) -> dict:
    return {
        "id": str(program.id),
        "name": program.name,
        "description": program.description,
        "level": program.level,
        "isActive": program.is_active,
        "subjectIds": [str(s) for s in (program.subject_ids or [])],
    }


def serialize_taxonomy(db: Session) -> dict:
    subjects = []
    for s in db.query(Subject).filter_by(is_active=True).order_by(Subject.name).all():
        subjects.append(
            {
                "id": str(s.id),
                "name": s.name,
                "code": s.code,
                "programId": str(s.program_id) if s.program_id else None,
            }
        )

    topics = []
    for t in db.query(Topic).filter_by(is_active=True).order_by(Topic.name).all():
        topics.append({"id": str(t.id), "subjectId": str(t.subject_id), "name": t.name, "code": t.code})

    subtopics = []
    for s in db.query(Subtopic).filter_by(is_active=True).order_by(Subtopic.name).all():
        subtopics.append(
            {
                "id": str(s.id),
                "topicId": str(s.topic_id),
                "subjectId": str(s.topic.subject_id),
                "name": s.name,
                "code": s.code,
            }
        )

    descriptions = [
        {"id": str(d.id), "subtopicId": str(d.subtopic_id), "text": d.text}
        for d in db.query(Description).order_by(Description.id).all()
    ]
    return {"subjects": subjects, "topics": topics, "subtopics": subtopics, "descriptions": descriptions}


# ── requests ─────────────────────────────────────────────────────────────────


def request_status(req: QuestionRequest, submitted: int) -> str:
    if req.status in ("FULFILLED", "COMPLETED"):
        return "Completed"
    if submitted > 0:
        return "In_Progress"
    if req.assigned_to:
        return "Assigned"
    return "Generated"


def serialize_request(db: Session, req: QuestionRequest) -> dict:
    submitted = db.query(PdfSubmission).filter(PdfSubmission.request_id == req.id).count()
    approved = (
        db.query(PdfSubmission).filter(PdfSubmission.request_id == req.id, PdfSubmission.status == "APPROVED").first()
        is not None
    )
    if approved:
        status = "Completed"
    elif submitted > 0:
        status = "In_Progress"
    elif req.assigned_to:
        status = "Assigned"
    else:
        status = "Generated"

    subtopic = db.get(Subtopic, req.subtopic_id) if req.subtopic_id else None
    topic = subtopic.topic if subtopic else (db.get(Topic, req.topic_id) if req.topic_id else None)
    subject = topic.subject if topic else None

    return {
        "id": str(req.id),
        "subtopicName": subtopic.name if subtopic else (topic.name if topic else "Unknown"),
        "subjectName": subject.name if subject else "Unknown",
        "topicName": topic.name if topic else "Unknown",
        "qType": req.q_type,
        "qCount": req.q_count,
        "difficulty": req.difficulty,
        "status": status,
        "assignedTo": str(req.assigned_to) if req.assigned_to else None,
        "createdAt": _iso(req.created_at),
        "assignedAt": _iso(req.updated_at) if req.assigned_to else None,
        "submitted": submitted,
    }


# ── submissions ──────────────────────────────────────────────────────────────


def serialize_submission(sub: PdfSubmission) -> dict:
    return {
        "id": str(sub.id),
        "requestId": str(sub.request_id) if sub.request_id else None,
        "facultyId": str(sub.faculty_id),
        "pdfPath": sub.pdf_path,
        "msPdfPath": sub.ms_pdf_path,
        "references": sub.references,
        "status": sub.status,
        "extractedJson": sub.extracted_json,
        "itemDecisions": sub.item_decisions,
        "createdAt": _iso(sub.created_at),
    }


# ── questions ────────────────────────────────────────────────────────────────


def _question_names(q: Question) -> dict:
    subtopic = q.subtopic if q.subtopic_id else None
    topic = subtopic.topic if subtopic else None
    subject = topic.subject if topic else None
    return {
        "subjectId": str(subject.id) if subject else None,
        "subjectName": subject.name if subject else None,
        "topicId": str(topic.id) if topic else None,
        "topicName": topic.name if topic else None,
        "subtopicId": str(subtopic.id) if subtopic else None,
        "subtopicName": subtopic.name if subtopic else None,
    }


def _question_stats(agg: dict | None):
    if not agg or agg.get("n", 0) == 0:
        return None
    n = agg["n"]
    p = agg["correct"] / n
    return {
        "nResponses": n,
        "pValue": round(p, 3),
        "adjustedPValue": round(p, 3),
        "discriminationIndex": 0.0,
        "pointBiserial": 0.0,
        "distractorEfficiency": 0.0,
        "nonfunctionalDistractors": 0,
        "optionPicks": agg.get("picks", []),
        "flagged": False,
    }


def serialize_question(
    q: Question,
    viewer: User | None = None,
    attempts: dict[int, dict] | None = None,
) -> dict:
    redact = viewer is not None and viewer.role == "student"
    names = _question_names(q)
    correct_position = next((o.position for o in q.options if o.is_correct), None)

    options = []
    for o in q.options:
        entry = {
            "id": str(o.id),
            "label": _option_label(o.position),
            "position": o.position,
            "text": o.text,
        }
        if not redact:
            entry["isCorrect"] = o.is_correct
        options.append(entry)

    agg = attempts.get(q.id) if attempts else None

    return {
        "id": str(q.id),
        "publicId": f"Q-{q.id}",
        "type": q.q_type,
        **names,
        "descriptionId": str(q.description_id) if q.description_id else None,
        "stem": q.stem,
        "options": options,
        "images": q.images or [],
        "subParts": q.sub_parts or [],
        "correctLabel": _option_label(correct_position) if correct_position is not None and not redact else None,
        "facultyDifficulty": q.faculty_difficulty,
        "facultySignal": q.faculty_signal,
        "aiDifficulty": q.ai_difficulty,
        "aiSignal": q.ai_signal,
        "aiReasoning": q.ai_reasoning,
        "cognitiveLevel": q.cognitive_level,
        "explanation": q.explanation if not redact else None,
        "markingScheme": q.marking_scheme if not redact else None,
        "reference": q.reference,
        "status": q.status,
        "authorId": str(q.author_id),
        "createdAt": _iso(q.created_at),
        "updatedAt": _iso(q.updated_at),
        "reviews": [serialize_review(r) for r in q.reviews],
        "tagHistory": [],
        "stats": _question_stats(agg),
        "irt": None,
        "iccCurve": None,
        "discriminationStatus": None,
        "seenByBatches": [],
        "lastCalibratedAt": None,
        "studentSignal": q.student_signal,
        "attemptCount": q.attempt_count,
        "difficultyTag": q.difficulty_tag,
        "difficultyScore": q.difficulty_score,
        "weights": q.weights or DEFAULT_WEIGHTS,
        "contradiction": q.contradiction,
        "reviewRemark": q.review_remark,
    }


def serialize_review(r) -> dict:
    return {
        "id": str(r.id),
        "questionId": str(r.question_id),
        "reviewerId": str(r.reviewer_id),
        "stage": r.stage,
        "decision": r.decision,
        "remarks": r.remarks,
        "createdAt": _iso(r.created_at),
    }


# ── notifications ────────────────────────────────────────────────────────────


def serialize_notification(n) -> dict:
    return {
        "id": str(n.id),
        "recipientId": str(n.recipient_id),
        "type": n.type,
        "message": n.message,
        "relatedQuestionId": str(n.related_question_id) if n.related_question_id else None,
        "isRead": n.is_read,
        "createdAt": _iso(n.created_at),
    }


# ── TOS / papers ─────────────────────────────────────────────────────────────


def serialize_tos(tos: TOS, db: Session) -> dict:
    entries = []
    for e in tos.entries:
        subtopic = db.get(Subtopic, e.subtopic_id) if e.subtopic_id else None
        topic = db.get(Topic, e.topic_id) if e.topic_id else (subtopic.topic if subtopic else None)
        subject = topic.subject if topic else None
        entries.append(
            {
                "id": str(e.id),
                "topicId": str(e.topic_id) if e.topic_id else None,
                "subtopicId": str(e.subtopic_id) if e.subtopic_id else None,
                "qType": e.q_type,
                "difficulty": e.difficulty,
                "nRequired": e.n_required,
                "bloom": e.bloom,
                "subtopicName": subtopic.name if subtopic else None,
                "topicName": topic.name if topic else None,
                "subjectName": subject.name if subject else None,
            }
        )
    return {
        "id": str(tos.id),
        "title": tos.title,
        "programId": str(tos.program_id) if tos.program_id else None,
        "examType": tos.exam_type,
        "academicYear": tos.academic_year,
        "isActive": tos.is_active,
        "createdBy": str(tos.created_by),
        "createdAt": _iso(tos.created_at),
        "entries": entries,
    }


def serialize_paper(p: ExamPaper) -> dict:
    return {
        "id": str(p.id),
        "tosId": str(p.tos_id) if p.tos_id else None,
        "title": p.title,
        "createdBy": str(p.created_by),
        "status": p.status,
        "examDate": p.exam_date.isoformat() if p.exam_date else None,
        "createdAt": _iso(p.created_at),
        "programId": str(p.program_id) if p.program_id else None,
        "examType": p.exam_type,
        "batch": p.batch,
        "academicYear": p.academic_year,
        "questionIds": [str(q.question_id) for q in p.questions],
    }


def paper_meta(p: ExamPaper, db: Session) -> dict:
    program = db.get(Program, p.program_id) if p.program_id else None
    year = p.exam_date.year if p.exam_date else None
    return {
        "id": str(p.id),
        "title": p.title,
        "status": p.status,
        "examDate": p.exam_date.isoformat() if p.exam_date else None,
        "year": year,
        "batch": p.batch,
        "academicYear": p.academic_year,
        "isMock": p.exam_type == "mock",
        "examType": p.exam_type,
        "programId": str(p.program_id) if p.program_id else None,
        "programName": program.name if program else None,
    }


def attempt_result(q: Question, selected: int | None, is_correct: bool, is_first: bool) -> dict:
    correct_position = next((o.position for o in q.options if o.is_correct), None)
    return {
        "questionId": str(q.id),
        "selected": selected,
        "isCorrect": is_correct,
        "isFirst": is_first,
        "correctLabel": _option_label(correct_position) if correct_position is not None else None,
        "correctPosition": correct_position,
        "explanation": q.explanation,
        "skipped": selected is None,
    }
