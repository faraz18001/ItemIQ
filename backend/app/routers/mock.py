from fastapi import APIRouter, Depends, HTTPException
from random import sample as random_sample

from sqlalchemy.orm import Session

from app.core.security import require_roles
from app.database import get_db
from app.models import Attempt, MockPaper, MockPaperQuestion, Question, User
from app.schemas import MockStart, MockSubmit
from app.services.serializers import attempt_result, serialize_question

router = APIRouter(prefix="/mock", tags=["Mock exams"])


@router.post("/start")
def start_mock(
    payload: MockStart,
    user: User = Depends(require_roles("student")),
    db: Session = Depends(get_db),
):
    query = db.query(Question).filter(Question.status == "in_bank")
    if payload.subtopicId:
        query = query.filter(Question.subtopic_id == int(payload.subtopicId))
    elif payload.topicId:
        query = query.filter(Question.subtopic_id.in_(
            db.query(Question.subtopic_id).filter(
                Question.subtopic_id.isnot(None),
                Question.id.in_(db.query(Question.id).join(Question.subtopic).filter(
                    Question.subtopic.has(topic_id=int(payload.topicId)) if False else True
                )),
            )
        ))
    elif payload.subjectId:
        query = query.filter(Question.subtopic_id.in_(
            db.query(Question.subtopic_id).filter(
                Question.subtopic_id.isnot(None)
            )
        ))
    if payload.difficulty:
        query = query.filter(Question.difficulty_tag == payload.difficulty)

    candidates = query.all()
    if payload.subjectId and not payload.topicId and not payload.subtopicId:
        candidates = [q for q in candidates if q.subtopic and q.subtopic.topic.subject_id == int(payload.subjectId)]
    if payload.topicId and not payload.subtopicId:
        candidates = [q for q in candidates if q.subtopic and q.subtopic.topic_id == int(payload.topicId)]

    chosen = random_sample(candidates, min(payload.count, len(candidates))) if candidates else []

    paper = MockPaper(user_id=user.id)
    for position, q in enumerate(chosen):
        paper.questions.append(MockPaperQuestion(question_id=q.id, position=position))
    db.add(paper)
    db.commit()
    db.refresh(paper)

    questions = [serialize_question(db.get(Question, q.question_id), viewer=user) for q in paper.questions]
    return {"paperId": str(paper.id), "questions": questions}


@router.post("/{paper_id}/submit")
def submit_mock(
    paper_id: int,
    payload: MockSubmit,
    user: User = Depends(require_roles("student")),
    db: Session = Depends(get_db),
):
    paper = db.get(MockPaper, paper_id)
    if not paper or paper.user_id != user.id:
        raise HTTPException(status_code=404, detail="Mock paper not found")

    results = []
    correct = 0
    answered = 0
    for link in paper.questions:
        question = db.get(Question, link.question_id)
        if not question:
            continue
        selected = payload.answers.get(str(question.id))
        correct_position = next((o.position for o in question.options if o.is_correct), None)
        is_correct = selected is not None and selected == correct_position
        if selected is not None:
            answered += 1
            if is_correct:
                correct += 1
            prior = (
                db.query(Attempt)
                .filter(Attempt.user_id == user.id, Attempt.question_id == question.id)
                .first()
            )
            db.add(Attempt(
                user_id=user.id,
                question_id=question.id,
                selected_position=selected,
                is_correct=is_correct,
                is_first=prior is None,
            ))
            question.attempt_count = (question.attempt_count or 0) + 1
        results.append(attempt_result(question, selected, is_correct, prior is None if selected is not None else False))

    db.commit()

    total = len(paper.questions)
    return {
        "paperId": str(paper.id),
        "total": total,
        "answered": answered,
        "correct": correct,
        "score": round(correct / total, 3) if total else 0,
        "results": results,
    }