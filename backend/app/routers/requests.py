from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import require_roles
from app.database import get_db
from app.models import QuestionRequest, Subtopic, User
from app.schemas import AssignRequestPayload, RequestPayload
from app.services.serializers import serialize_request

router = APIRouter(prefix="/requests", tags=["Requests"])


@router.post("")
def create_request(
    payload: RequestPayload,
    user: User = Depends(require_roles("qbm", "hod", "admin")),
    db: Session = Depends(get_db),
):
    subtopic = db.get(Subtopic, int(payload.subtopicId))
    if not subtopic:
        raise HTTPException(status_code=404, detail="Subtopic not found")

    req = QuestionRequest(
        topic_id=subtopic.topic_id,
        subtopic_id=subtopic.id,
        requested_by=user.id,
        q_type=payload.qType,
        difficulty=payload.difficulty,
        q_count=payload.qCount,
        status="PENDING",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return serialize_request(db, req)


@router.get("")
def get_requests(
    user: User = Depends(require_roles("qbm", "hod", "faculty", "sme", "examiner", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(QuestionRequest).order_by(QuestionRequest.created_at.desc())
    if user.role == "faculty":
        query = query.filter(
            (QuestionRequest.assigned_to == user.id) | (QuestionRequest.requested_by == user.id)
        )
    elif user.role in ("sme", "examiner"):
        query = query.filter(QuestionRequest.requested_by == user.id)
    return [serialize_request(db, r) for r in query.all()]


@router.post("/{req_id}/assign")
def assign_request(
    req_id: int,
    payload: AssignRequestPayload,
    user: User = Depends(require_roles("qbm", "hod", "admin")),
    db: Session = Depends(get_db),
):
    req = db.get(QuestionRequest, req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.assigned_to = int(payload.facultyId) if payload.facultyId else None
    db.commit()
    db.refresh(req)
    return serialize_request(db, req)
