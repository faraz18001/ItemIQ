import os
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Date,
    JSON,
    Float,
)
from sqlalchemy.orm import sessionmaker, relationship, declarative_base

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./itemiq.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False, unique=True)
    description = Column(Text, default="")
    is_active = Column(Boolean, default=True)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(64), default="faculty")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_utcnow)

class UserRole(Base):
    __tablename__ = "user_role"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id"), primary_key=True)
    assigned_at = Column(DateTime, default=_utcnow)

class Program(Base):
    __tablename__ = "program"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    is_active = Column(Boolean, default=True)

class Subject(Base):
    __tablename__ = "subject"
    id = Column(Integer, primary_key=True, autoincrement=True)
    program_id = Column(Integer, ForeignKey("program.id"), nullable=False)
    name = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    program = relationship("Program")

class Topic(Base):
    __tablename__ = "topic"
    id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subject.id"), nullable=False)
    name = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    subject = relationship("Subject")

class Subtopic(Base):
    __tablename__ = "subtopic"
    id = Column(Integer, primary_key=True, autoincrement=True)
    topic_id = Column(Integer, ForeignKey("topic.id"), nullable=False)
    name = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    topic = relationship("Topic")

class QuestionRequest(Base):
    __tablename__ = "question_request"
    id = Column(Integer, primary_key=True, autoincrement=True)
    topic_id = Column(Integer, ForeignKey("topic.id"), nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False) # QBM
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True) # Faculty
    status = Column(String(32), default="PENDING") # PENDING, FULFILLED
    created_at = Column(DateTime, default=_utcnow)

class PdfSubmission(Base):
    __tablename__ = "pdf_submission"
    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey("question_request.id"), nullable=True)
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pdf_path = Column(String(500), nullable=False)
    references = Column(Text, nullable=True)
    status = Column(String(32), default="PENDING_SME") # PENDING_SME, PENDING_QBM, APPROVED, REJECTED
    created_at = Column(DateTime, default=_utcnow)

class Question(Base):
    __tablename__ = "question"
    id = Column(Integer, primary_key=True, autoincrement=True)
    stem = Column(Text, nullable=False)
    q_type = Column(String(16), default="MCQ") # "MCQ", "THEORY", "OSCE"
    marking_scheme = Column(Text, nullable=True)
    reference = Column(Text, nullable=True) # Inherited from PdfSubmission upon extraction
    status = Column(String(32), default="LIVE") # Questions in this table are approved
    subtopic_id = Column(Integer, ForeignKey("subtopic.id"), nullable=True)
    submission_id = Column(Integer, ForeignKey("pdf_submission.id"), nullable=True)
    regions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=_utcnow)

    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan")

class QuestionOption(Base):
    __tablename__ = "question_option"
    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("question.id"), nullable=False)
    text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)

    question = relationship("Question", back_populates="options")

class SubmissionReviewLog(Base):
    __tablename__ = "submission_review_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey("pdf_submission.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment = Column(Text, nullable=False)
    decision = Column(String(32), nullable=False) # APPROVED, REJECTED, CHANGES_REQUESTED
    created_at = Column(DateTime, default=_utcnow)

class ExamPaper(Base):
    __tablename__ = "exam_paper"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    status = Column(String(32), default="DRAFT") # DRAFT, PUBLISHED
    created_at = Column(DateTime, default=_utcnow)

class ExamPaperQuestion(Base):
    __tablename__ = "exam_paper_question"
    exam_paper_id = Column(Integer, ForeignKey("exam_paper.id"), primary_key=True)
    question_id = Column(Integer, ForeignKey("question.id"), primary_key=True)
    order = Column(Integer, default=0)

    n_responses = Column(Integer, nullable=True)
    p_value = Column(Float, nullable=True)
    difficulty_b = Column(Float, nullable=True)
    discrimination_a = Column(Float, nullable=True)
    guessing_c = Column(Float, nullable=True)

class StudentResponse(Base):
    __tablename__ = "student_response"
    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_paper_id = Column(Integer, ForeignKey("exam_paper.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("question.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    selected_option_id = Column(Integer, ForeignKey("question_option.id"), nullable=True)
    is_correct = Column(Boolean, nullable=False)
    submitted_at = Column(DateTime, default=_utcnow)
