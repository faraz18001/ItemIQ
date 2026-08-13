from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, QuestionRequest, Topic, Subject

router = APIRouter(prefix="/requests", tags=["Requests"])

@router.get("")
def get_requests(db: Session = Depends(get_db)):
    reqs = db.query(QuestionRequest).all()
    out = []
    for r in reqs:
        topic = db.query(Topic).filter(Topic.id == r.topic_id).first()
        subject = db.query(Subject).filter(Subject.id == topic.subject_id).first() if topic else None
        
        out.append({
            "id": str(r.id),
            "subtopicName": topic.name if topic else "Unknown",
            "subjectName": subject.name if subject else "Unknown",
            "topicName": topic.name if topic else "Unknown",
            "qCount": 3,
            "qType": "MCQ",
            "difficulty": "Medium",
            "status": "In_Progress" if r.status == "PENDING" else "Generated",
            "assignedTo": str(r.assigned_to) if r.assigned_to else None,
            "submitted": 1,
            "createdAt": r.created_at.isoformat() if r.created_at else ""
        })
    return out

@router.post("/{id}/assign")
def assign_request(id: int, payload: dict, db: Session = Depends(get_db)):
    req = db.query(QuestionRequest).filter(QuestionRequest.id == id).first()
    if req:
        req.assigned_to = payload.get("facultyId")
        db.commit()
    return {"status": "ok"}
