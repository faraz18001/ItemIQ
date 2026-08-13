from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, Subject, Topic, Subtopic

router = APIRouter(prefix="/taxonomy", tags=["Taxonomy"])

@router.get("")
def get_taxonomy(db: Session = Depends(get_db)):
    subjects = [{"id": str(s.id), "programId": str(s.program_id), "name": s.name} for s in db.query(Subject).all()]
    topics = [{"id": str(t.id), "subjectId": str(t.subject_id), "name": t.name} for t in db.query(Topic).all()]
    subtopics = [{"id": str(s.id), "topicId": str(s.topic_id), "name": s.name} for s in db.query(Subtopic).all()]
    
    return {
        "subjects": subjects,
        "topics": topics,
        "subtopics": subtopics,
        "descriptions": []
    }
