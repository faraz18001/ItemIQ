import os
from database import SessionLocal, QuestionRequest, PdfSubmission, SubmissionReviewLog, Question, QuestionOption

def clear_db():
    db = SessionLocal()
    
    try:
        # Delete in order to respect foreign keys
        db.query(QuestionOption).delete()
        db.query(Question).delete()
        db.query(SubmissionReviewLog).delete()
        db.query(PdfSubmission).delete()
        db.query(QuestionRequest).delete()
        
        db.commit()
        print("Successfully cleared all requests, submissions, and questions!")
    except Exception as e:
        db.rollback()
        print(f"Error clearing db: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_db()
