from fastapi import APIRouter

router = APIRouter(tags=["Misc"])

@router.get("/notifications")
def get_notifications(): return []

@router.get("/bookmarks")
def get_bookmarks(): return []

@router.get("/tos")
def get_tos(): return []

@router.get("/papers")
def get_papers(): return []

@router.get("/programs")
def get_programs(): return []
