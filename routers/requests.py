from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, QuestionRequest, Topic, Subject, Subtopic
from schemas import QuestionRequestCreate, QuestionRequestResponse
from security import get_current_user

router = APIRouter(prefix="/requests", tags=["Requests"])

class RequestPayload(BaseModel):
    subtopicId: str
    qType: str
    qCount: int
    difficulty: str

@router.post("")
def create_request(req_in: RequestPayload, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    subtopic = db.query(Subtopic).filter(Subtopic.id == int(req_in.subtopicId)).first()
    if not subtopic:
        raise HTTPException(status_code=404, detail="Subtopic not found")
        
    db_req = QuestionRequest(
        topic_id=subtopic.topic_id,
        assigned_to=None,
        requested_by=current_user["id"]
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    
    topic = db.query(Topic).filter(Topic.id == db_req.topic_id).first()
    subject = db.query(Subject).filter(Subject.id == topic.subject_id).first() if topic else None
    
    return {
        "id": str(db_req.id),
        "subtopicName": subtopic.name,
        "subjectName": subject.name if subject else "Unknown",
        "topicName": topic.name if topic else "Unknown",
        "qCount": req_in.qCount,
        "qType": req_in.qType,
        "difficulty": req_in.difficulty,
        "status": "Generated",
        "assignedTo": None,
        "submitted": 0,
        "createdAt": db_req.created_at.isoformat() if db_req.created_at else ""
    }

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

@router.post("/{id}/assign", response_model=QuestionRequestResponse)
def assign_request(id: int, payload: dict, db: Session = Depends(get_db)):
    req = db.query(QuestionRequest).filter(QuestionRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.assigned_to = payload.get("facultyId")
    db.commit()
    db.refresh(req)
    return req
