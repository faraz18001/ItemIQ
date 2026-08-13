from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models import User
from app.services.serializers import serialize_taxonomy

router = APIRouter(prefix="/taxonomy", tags=["Taxonomy"])


@router.get("")
def get_taxonomy(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return serialize_taxonomy(db)
