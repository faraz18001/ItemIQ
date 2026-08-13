from app.database import Base, _utcnow
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Notification(Base):
    __tablename__ = "notification"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(64), default="Info")
    message: Mapped[str] = mapped_column(Text, default="")
    related_question_id: Mapped[int | None] = mapped_column(
        ForeignKey("question.id"),
        nullable=True,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at = mapped_column(DateTime, default=_utcnow)


class Bookmark(Base):
    __tablename__ = "bookmark"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question.id"), primary_key=True)
    created_at = mapped_column(DateTime, default=_utcnow)


class Attempt(Base):
    __tablename__ = "attempt"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question.id"), nullable=False)
    selected_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_first: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = mapped_column(DateTime, default=_utcnow)


class MockPaper(Base):
    __tablename__ = "mock_paper"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at = mapped_column(DateTime, default=_utcnow)

    questions: Mapped[list["MockPaperQuestion"]] = relationship(
        "MockPaperQuestion",
        cascade="all, delete-orphan",
        order_by="MockPaperQuestion.position",
    )


class MockPaperQuestion(Base):
    __tablename__ = "mock_paper_question"

    mock_paper_id: Mapped[int] = mapped_column(ForeignKey("mock_paper.id"), primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question.id"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
