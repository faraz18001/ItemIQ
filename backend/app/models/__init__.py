"""All ORM models. Importing this package registers every table on ``Base``,
which is what Alembic autogenerate and ``Base.metadata.create_all`` rely on.
"""

from app.models.user import Role, User, UserRole, role_names_for
from app.models.taxonomy import Description, Program, Subject, Subtopic, Topic
from app.models.question import (
    PdfSubmission,
    Question,
    QuestionOption,
    QuestionRequest,
    QuestionReview,
    SubmissionReviewLog,
)
from app.models.exam import (
    ExamPaper,
    ExamPaperQuestion,
    StudentResponse,
    TOS,
    TOSEntry,
)
from app.models.engagement import (
    Attempt,
    Bookmark,
    MockPaper,
    MockPaperQuestion,
    Notification,
)

__all__ = [
    "Attempt",
    "Bookmark",
    "Description",
    "ExamPaper",
    "ExamPaperQuestion",
    "MockPaper",
    "MockPaperQuestion",
    "Notification",
    "PdfSubmission",
    "Program",
    "Question",
    "QuestionOption",
    "QuestionRequest",
    "QuestionReview",
    "Role",
    "StudentResponse",
    "Subject",
    "SubmissionReviewLog",
    "Subtopic",
    "TOS",
    "TOSEntry",
    "Topic",
    "User",
    "UserRole",
    "role_names_for",
]
