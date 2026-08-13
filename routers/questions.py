from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db, QuestionRequest, PdfSubmission, SubmissionReviewLog, Question, QuestionOption, User
from schemas import (
    QuestionRequestCreate, QuestionRequestResponse, 
    PdfSubmissionCreate, PdfSubmissionResponse, 
    SubmissionReviewLogCreate, QuestionResponse
)
from security import get_current_user

router = APIRouter(prefix="/questions", tags=["Questions & Workflows"])

# --- 2. PDF Submissions (Faculty) ---
@router.post("/submissions", response_model=PdfSubmissionResponse)
def submit_pdf(sub_in: PdfSubmissionCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_sub = PdfSubmission(
        request_id=sub_in.request_id,
        faculty_id=current_user["id"],
        pdf_path=sub_in.pdf_path,
        references=sub_in.references,
        status="PENDING_SME"
    )
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    return db_sub

@router.get("/submissions", response_model=List[PdfSubmissionResponse])
def get_submissions(db: Session = Depends(get_db)):
    return db.query(PdfSubmission).all()

# --- 3. Verification & Extraction Trigger (SME & QBM) ---
@router.post("/submissions/{id}/review")
def review_submission(id: int, review: SubmissionReviewLogCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    sub = db.query(PdfSubmission).filter(PdfSubmission.id == id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    log = SubmissionReviewLog(
        submission_id=id,
        reviewer_id=current_user["id"],
        comment=review.comment,
        decision=review.decision
    )
    db.add(log)
    
    # State Machine
    if sub.status == "PENDING_SME" and review.decision == "APPROVED":
        sub.status = "PENDING_QBM"
    elif sub.status == "PENDING_QBM" and review.decision == "APPROVED":
        sub.status = "APPROVED"
        # Call the actual PyMuPDF algorithm
        try:
            from pdf_parser import parse_paper
            extracted_questions = parse_paper(sub.pdf_path)
            for rec in extracted_questions:
                q = Question(
                    stem=rec.get("text", "Empty Question"),
                    q_type="MCQ",
                    marking_scheme=str(rec.get("marks", "")),
                    reference=sub.references,
                    status="LIVE",
                    subtopic_id=1,  # Assuming a subtopic exists
                    submission_id=sub.id,
                    regions=rec.get("regions", [])
                )
                db.add(q)
            db.commit() # Commit extracted questions
        except Exception as e:
            print(f"Error during PDF extraction: {e}")
    elif review.decision in ("REJECTED", "CHANGES_REQUESTED"):
        sub.status = "REJECTED"
        
    db.commit()
    db.refresh(sub)
    return {"status": sub.status, "message": "Review logged successfully."}

# --- 4. Live Question Bank (For filtering & Worksheet generation) ---
@router.get("/bank", response_model=List[QuestionResponse])
def get_live_bank(db: Session = Depends(get_db)):
    return db.query(Question).filter(Question.status == "LIVE").all()

@router.get("")
def get_all_questions(db: Session = Depends(get_db)):
    qs = db.query(Question).all()
    faculty = db.query(User).filter(User.role == "faculty").first()
    faculty_id = str(faculty.id) if faculty else "1"
    
    out = []
    for q in qs:
        out.append({
            "id": str(q.id),
            "publicId": f"Q-{q.id}",
            "authorId": faculty_id,
            "subtopicId": str(q.subtopic_id),
            "stem": q.stem,
            "status": q.status,
            "subjectName": "Renal Physiology",
            "subtopicName": "GFR Regulation",
            "facultyDifficulty": "Medium",
            "difficultyTag": "Medium",
            "reviews": [],
            "updatedAt": q.created_at.isoformat() if q.created_at else ""
        })
    return out
