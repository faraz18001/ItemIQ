from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, User

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    out = []
    for u in users:
        out.append({
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "roles": [u.role],
            "department": "SIUT Examinations"
        })
    return out
