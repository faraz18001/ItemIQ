from app.core.security import get_current_user
from app.database import get_db
from app.models import Question, User
from app.schemas import AiCritiqueTarget
from app.services.ai_reviewer import critique
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/critique")
def ai_critique(
    payload: AiCritiqueTarget,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.questionId:
        question = db.get(Question, int(payload.questionId))
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        target = AiCritiqueTarget(
            questionId=payload.questionId,
            stem=question.stem,
            options=[o.text for o in question.options],
            correct=next((o.position for o in question.options if o.is_correct), None),
            explanation=question.explanation,
        )
    else:
        target = payload
    return critique(target)
