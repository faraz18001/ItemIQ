from app.core.security import get_current_user
from app.database import get_db
from app.models import User
from app.services.analytics import item_detail, paper_analytics, paper_summaries
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/papers")
def paper_summaries_view(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"papers": paper_summaries(db)}


@router.get("/papers/{paper_id}")
def paper_detail_view(
    paper_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return paper_analytics(db, paper_id, viewer=user)


@router.get("/items/{question_id}")
def item_detail_view(
    question_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return item_detail(db, question_id, viewer=user)
