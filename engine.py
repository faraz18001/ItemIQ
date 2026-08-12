from fastapi import APIRouter

router = APIRouter(prefix="/engine", tags=["Engine"])

@router.post("/critique/{question_id}")
def critique_question(question_id: int):
    # LangGraph AI Reviewer logic will go here
    return {"message": "LangGraph critique workflow triggered", "question_id": question_id}

@router.post("/calibrate/{exam_paper_id}")
def calibrate_exam(exam_paper_id: int):
    # IRT girth logic will go here
    return {"message": "IRT Calibration triggered", "exam_paper_id": exam_paper_id}
