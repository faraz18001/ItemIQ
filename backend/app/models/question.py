from __future__ import annotations

from typing import TYPE_CHECKING

from app.database import Base, _utcnow
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.taxonomy import Description, Subtopic
    from app.models.user import User


class QuestionRequest(Base):
    __tablename__ = "question_request"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topic.id"), nullable=False)
    subtopic_id: Mapped[int | None] = mapped_column(ForeignKey("subtopic.id"), nullable=True)
    requested_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    q_type: Mapped[str] = mapped_column(String(16), default="MCQ")
    difficulty: Mapped[str] = mapped_column(String(16), default="Medium")
    q_count: Mapped[int] = mapped_column(Integer, default=3)
    status: Mapped[str] = mapped_column(String(32), default="PENDING")
    created_at = mapped_column(DateTime, default=_utcnow)
    updated_at = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)


class PdfSubmission(Base):
    __tablename__ = "pdf_submission"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[int | None] = mapped_column(ForeignKey("question_request.id"), nullable=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    pdf_path: Mapped[str] = mapped_column(String(500), nullable=False)
    # Mark scheme PDF — mandatory; answers are never in the QP
    ms_pdf_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    references: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING_SME")
    # Stores the structured JSON preview produced by the parser before QBM sign-off
    extracted_json: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # QBM per-question accept/reject decisions stored before final approval
    # Shape: [{"q_id": "9700_s23_p12_q1", "decision": "accepted"|"rejected", "remark": "..."}]
    item_decisions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at = mapped_column(DateTime, default=_utcnow)
    updated_at = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)


class Question(Base):
    __tablename__ = "question"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stem: Mapped[str] = mapped_column(Text, nullable=False)
    q_type: Mapped[str] = mapped_column(String(16), default="MCQ")
    marking_scheme: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    subtopic_id: Mapped[int | None] = mapped_column(ForeignKey("subtopic.id"), nullable=True)
    description_id: Mapped[int | None] = mapped_column(ForeignKey("description.id"), nullable=True)
    submission_id: Mapped[int | None] = mapped_column(ForeignKey("pdf_submission.id"), nullable=True)
    regions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Paths to extracted diagram/image crops from the PDF
    images: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Structured sub-parts for SAQ / theory questions
    sub_parts: Mapped[list | None] = mapped_column(JSON, nullable=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    faculty_difficulty: Mapped[str] = mapped_column(String(16), default="Medium")
    ai_difficulty: Mapped[str] = mapped_column(String(16), default="Medium")
    difficulty_tag: Mapped[str] = mapped_column(String(16), default="Medium")
    faculty_signal: Mapped[int] = mapped_column(Integer, default=0)
    ai_signal: Mapped[int] = mapped_column(Integer, default=0)
    student_signal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    difficulty_score: Mapped[float] = mapped_column(Float, default=0.55)
    ai_reasoning: Mapped[str] = mapped_column(Text, default="")
    weights: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    cognitive_level: Mapped[str | None] = mapped_column(String(64), nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    review_remark: Mapped[str | None] = mapped_column(Text, nullable=True)
    contradiction: Mapped[bool] = mapped_column(Boolean, default=False)
    last_calibrated_at = mapped_column(DateTime, nullable=True)

    created_at = mapped_column(DateTime, default=_utcnow)
    updated_at = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    options: Mapped[list[QuestionOption]] = relationship(
        "QuestionOption",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionOption.position",
    )
    reviews: Mapped[list[QuestionReview]] = relationship(
        "QuestionReview",
        back_populates="question",
        cascade="all, delete-orphan",
    )
    subtopic: Mapped[Subtopic] = relationship("Subtopic")
    description: Mapped[Description] = relationship("Description")
    submission: Mapped[PdfSubmission] = relationship("PdfSubmission")
    author: Mapped[User] = relationship("User")


class QuestionOption(Base):
    __tablename__ = "question_option"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question.id"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped[Question] = relationship("Question", back_populates="options")


class QuestionReview(Base):
    __tablename__ = "question_review"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question.id"), nullable=False)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    stage: Mapped[str] = mapped_column(String(32), nullable=False)
    decision: Mapped[str] = mapped_column(String(32), nullable=False)
    remarks: Mapped[str] = mapped_column(Text, default="")
    created_at = mapped_column(DateTime, default=_utcnow)

    question: Mapped[Question] = relationship("Question", back_populates="reviews")


class SubmissionReviewLog(Base):
    __tablename__ = "submission_review_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("pdf_submission.id"), nullable=False)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    comment: Mapped[str] = mapped_column(Text, default="")
    decision: Mapped[str] = mapped_column(String(32), nullable=False)
    stage: Mapped[str] = mapped_column(String(32), default="departmental")
    created_at = mapped_column(DateTime, default=_utcnow)
