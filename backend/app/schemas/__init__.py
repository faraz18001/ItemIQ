"""Pydantic request/response models.

These define what the API accepts; the serializers in
``app/services/serializers.py`` define what it returns.
"""

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
    role: str | None = None
    isActive: bool | None = None


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


class VerifyEmailRequest(BaseModel):
    token: str


# ── requests ─────────────────────────────────────────────────────────────────


class RequestPayload(BaseModel):
    subtopicId: str
    qType: str = "MCQ"
    qCount: int = 1
    difficulty: str = "Medium"


class AssignRequestPayload(BaseModel):
    facultyId: str | None = None


# ── questions ────────────────────────────────────────────────────────────────


class QuestionCreate(BaseModel):
    subtopicId: str
    descriptionId: str | None = None
    stem: str
    options: list[str] = Field(min_length=2)
    correct: int
    facultyDifficulty: str = "Medium"
    explanation: str | None = None
    reference: str | None = None
    submit: bool = False


class QuestionUpdate(BaseModel):
    subtopicId: str | None = None
    descriptionId: str | None = None
    stem: str | None = None
    options: list[str] | None = None
    correct: int | None = None
    facultyDifficulty: str | None = None
    explanation: str | None = None
    reference: str | None = None


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
    topicId: str | None = None
    subtopicId: str | None = None
    qType: str | None = "MCQ"
    difficulty: str | None = "Medium"
    nRequired: int = 5
    bloom: str | None = None


class TosCreate(BaseModel):
    title: str
    programId: str | None = None
    examType: str | None = None
    academicYear: str | None = None
    entries: list[TosEntryDraft] = Field(default_factory=list)


class PaperCreate(BaseModel):
    title: str
    tosId: str | None = None
    questionIds: list[str] = Field(default_factory=list)
    batch: str | None = None
    academicYear: str | None = None
    programId: str | None = None
    examType: str | None = None
    examDate: str | None = None
    allowRepeats: bool = False


class PaperStatusUpdate(BaseModel):
    status: str


# ── mock / ai ────────────────────────────────────────────────────────────────


class MockStart(BaseModel):
    count: int = 5
    subjectId: str | None = None
    topicId: str | None = None
    subtopicId: str | None = None
    difficulty: str | None = None


class MockSubmit(BaseModel):
    answers: dict[str, int] = Field(default_factory=dict)


class AiCritiqueTarget(BaseModel):
    questionId: str | None = None
    stem: str | None = None
    options: list[str] = Field(default_factory=list)
    correct: int | None = None
    explanation: str | None = None
