from __future__ import annotations

from typing import TYPE_CHECKING

from app.database import Base, _utcnow
from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.question import Question


class ExamPaper(Base):
    __tablename__ = "exam_paper"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    tos_id: Mapped[int | None] = mapped_column(ForeignKey("tos.id"), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    exam_date: Mapped[object | None] = mapped_column(Date, nullable=True)
    batch: Mapped[str | None] = mapped_column(String(64), nullable=True)
    academic_year: Mapped[str | None] = mapped_column(String(64), nullable=True)
    program_id: Mapped[int | None] = mapped_column(ForeignKey("program.id"), nullable=True)
    exam_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    allow_repeats: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at = mapped_column(DateTime, default=_utcnow)
    updated_at = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow)

    questions: Mapped[list[ExamPaperQuestion]] = relationship(
        "ExamPaperQuestion",
        cascade="all, delete-orphan",
        order_by="ExamPaperQuestion.position",
    )


class ExamPaperQuestion(Base):
    __tablename__ = "exam_paper_question"

    exam_paper_id: Mapped[int] = mapped_column(ForeignKey("exam_paper.id"), primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question.id"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    # Per-sitting statistics, written when responses are imported.
    n_responses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    p_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    point_biserial: Mapped[float | None] = mapped_column(Float, nullable=True)
    distractor_efficiency: Mapped[float | None] = mapped_column(Float, nullable=True)
    difficulty_tag: Mapped[str | None] = mapped_column(String(16), nullable=True)
    option_picks: Mapped[list | None] = mapped_column(JSON, nullable=True)
    calibrated_at = mapped_column(DateTime, nullable=True)

    question: Mapped[Question] = relationship("Question")  # noqa: F821


class StudentResponse(Base):
    __tablename__ = "student_response"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    exam_paper_id: Mapped[int] = mapped_column(ForeignKey("exam_paper.id"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("question.id"), nullable=False)
    candidate_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    selected_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at = mapped_column(DateTime, default=_utcnow)


class TOS(Base):
    __tablename__ = "tos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    program_id: Mapped[int | None] = mapped_column(ForeignKey("program.id"), nullable=True)
    exam_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    academic_year: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = mapped_column(DateTime, default=_utcnow)

    entries: Mapped[list[TOSEntry]] = relationship(
        "TOSEntry",
        back_populates="tos",
        cascade="all, delete-orphan",
    )


class TOSEntry(Base):
    __tablename__ = "tos_entry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tos_id: Mapped[int] = mapped_column(ForeignKey("tos.id"), nullable=False)
    topic_id: Mapped[int | None] = mapped_column(ForeignKey("topic.id"), nullable=True)
    subtopic_id: Mapped[int | None] = mapped_column(ForeignKey("subtopic.id"), nullable=True)
    q_type: Mapped[str] = mapped_column(String(16), default="MCQ")
    difficulty: Mapped[str] = mapped_column(String(16), default="Medium")
    n_required: Mapped[int] = mapped_column(Integer, default=5)
    bloom: Mapped[str | None] = mapped_column(String(64), nullable=True)

    tos: Mapped[TOS] = relationship("TOS", back_populates="entries")
