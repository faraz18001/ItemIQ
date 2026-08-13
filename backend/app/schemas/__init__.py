"""Pydantic request/response models.

These define what the API accepts; the serializers in
``app/services/serializers.py`` define what it returns.
"""

from typing import Optional

from pydantic import BaseModel, Field


# ── auth / users ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    identifier: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=8)
    role: str = "faculty"


class UserCreate(BaseModel):
    name: str
    email: str
    department: str = ""
    role: str = "faculty"
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    role: Optional[str] = None
    isActive: Optional[bool] = None


class GrantRoleRequest(BaseModel):
    role: str


class ResetPasswordRequest(BaseModel):
    newPassword: str = Field(min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=8)


class PasswordResetSubmit(BaseModel):
    token: str
    newPassword: str = Field(min_length=8)


# ── requests ─────────────────────────────────────────────────────────────────

class RequestPayload(BaseModel):
    subtopicId: str
    qType: str = "MCQ"
    qCount: int = 1
    difficulty: str = "Medium"


class AssignRequestPayload(BaseModel):
    facultyId: Optional[str] = None


# ── questions ────────────────────────────────────────────────────────────────

class QuestionCreate(BaseModel):
    subtopicId: str
    descriptionId: Optional[str] = None
    stem: str
    options: list[str] = Field(min_length=2)
    correct: int
    facultyDifficulty: str = "Medium"
    explanation: Optional[str] = None
    reference: Optional[str] = None
    submit: bool = False


class QuestionUpdate(BaseModel):
    subtopicId: Optional[str] = None
    descriptionId: Optional[str] = None
    stem: Optional[str] = None
    options: Optional[list[str]] = None
    correct: Optional[int] = None
    facultyDifficulty: Optional[str] = None
    explanation: Optional[str] = None
    reference: Optional[str] = None


class ReviewDecision(BaseModel):
    stage: str = "departmental"
    decision: str
    remarks: str = ""


class SubmissionReview(BaseModel):
    stage: str = "departmental"
    decision: str
    remarks: str = ""


# ── engagement ───────────────────────────────────────────────────────────────

class AttemptIn(BaseModel):
    questionId: str
    selected: int


class BookmarkIn(BaseModel):
    questionId: str


# ── papers / tos ─────────────────────────────────────────────────────────────

class TosEntryDraft(BaseModel):
    topicId: Optional[str] = None
    subtopicId: Optional[str] = None
    qType: Optional[str] = "MCQ"
    difficulty: Optional[str] = "Medium"
    nRequired: int = 5
    bloom: Optional[str] = None


class TosCreate(BaseModel):
    title: str
    programId: Optional[str] = None
    examType: Optional[str] = None
    academicYear: Optional[str] = None
    entries: list[TosEntryDraft] = Field(default_factory=list)


class PaperCreate(BaseModel):
    title: str
    tosId: Optional[str] = None
    questionIds: list[str] = Field(default_factory=list)
    batch: Optional[str] = None
    academicYear: Optional[str] = None
    programId: Optional[str] = None
    examType: Optional[str] = None
    examDate: Optional[str] = None
    allowRepeats: bool = False


class PaperStatusUpdate(BaseModel):
    status: str


# ── mock / ai ────────────────────────────────────────────────────────────────

class MockStart(BaseModel):
    count: int = 5
    subjectId: Optional[str] = None
    topicId: Optional[str] = None
    subtopicId: Optional[str] = None
    difficulty: Optional[str] = None


class MockSubmit(BaseModel):
    answers: dict[str, int] = Field(default_factory=dict)


class AiCritiqueTarget(BaseModel):
    questionId: Optional[str] = None
    stem: Optional[str] = None
    options: list[str] = Field(default_factory=list)
    correct: Optional[int] = None
    explanation: Optional[str] = None
