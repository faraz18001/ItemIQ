from fastapi import APIRouter

router = APIRouter(prefix="/exams", tags=["Exams"])

@router.get("/")
def get_exams():
    return []
