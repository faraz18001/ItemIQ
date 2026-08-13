from app.core.security import require_roles
from app.database import get_db
from app.models import User
from app.services.diagnostics_service import run_checks
from fastapi import APIRouter, Depends

router = APIRouter(tags=["Admin"])


@router.get("/diagnostics")
def diagnostics(
    _: User = Depends(require_roles("qbm", "hod", "admin")),
    db=Depends(get_db),
):
    return run_checks(db)
