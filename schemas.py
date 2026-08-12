from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Users
class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str
    role: str = "faculty"

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Taxonomy
class ProgramBase(BaseModel):
    name: str
    description: Optional[str] = ""

class ProgramResponse(ProgramBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class SubjectResponse(BaseModel):
    id: int
    program_id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True

# Questions
class QuestionOptionBase(BaseModel):
    text: str
    is_correct: bool

class QuestionOptionResponse(QuestionOptionBase):
    id: int
    question_id: int

    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    stem: str
    q_type: str = "MCQ"
    marking_scheme: Optional[str] = None
    reference: Optional[str] = None
    subtopic_id: Optional[int] = None
    submission_id: Optional[int] = None
    regions: Optional[dict] = None

class QuestionResponse(QuestionBase):
    id: int
    status: str
    created_at: datetime
    options: List[QuestionOptionResponse] = []

    class Config:
        from_attributes = True

class QuestionRequestCreate(BaseModel):
    topic_id: int
    assigned_to: Optional[int] = None

class QuestionRequestResponse(QuestionRequestCreate):
    id: int
    requested_by: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PdfSubmissionCreate(BaseModel):
    request_id: Optional[int] = None
    pdf_path: str
    references: Optional[str] = None

class PdfSubmissionResponse(PdfSubmissionCreate):
    id: int
    faculty_id: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class SubmissionReviewLogCreate(BaseModel):
    comment: str
    decision: str # APPROVED, REJECTED, CHANGES_REQUESTED

# Exams
class ExamPaperBase(BaseModel):
    title: str

class ExamPaperResponse(ExamPaperBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
