from fastapi import APIRouter

router = APIRouter(prefix="/taxonomy", tags=["Taxonomy"])

@router.get("/programs")
def get_programs():
    return []
