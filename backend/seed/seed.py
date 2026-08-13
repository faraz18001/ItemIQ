"""Consolidated seed for ItemIQ.

Run from backend/:  python -m seed.seed            (skip if non-empty)
                    python -m seed.seed --reset    (wipe and reseed)

Creates demo accounts for every role, a small MBBS taxonomy, and banked
questions with practice attempts so the analytics pages have real numbers.
"""

from datetime import date
import random
import sys

from app.core.security import get_password_hash
from app.database import Base, SessionLocal, engine
from app.models import (  # noqa: E402
    Attempt,
    Description,
    ExamPaper,
    ExamPaperQuestion,
    Program,
    Question,
    QuestionOption,
    StudentResponse,
    Subject,
    Subtopic,
    Topic,
    User,
)

DEMO_PASSWORD = "password"


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def _make_user(name, email, role):
    return User(name=name, email=email, password_hash=get_password_hash(DEMO_PASSWORD), role=role)


def bank_questions():
    return [
        (
            "What is the normal duration of ventricular ejection in a healthy adult?",
            ["20 ms", "40 ms", "80 ms", "120 ms", "The ejection time equals the pulse transit time"],
            "Blood Pressure Regulation",
            "Hard",
            4,
        ),
        (
            "Which receptor mediates the immediate response to rising blood pressure in the carotid sinus?",
            ["Alpha-1 adrenergic", "Beta-1 adrenergic", "Carotid sinus nerve", "Hering-Breuer reflex", "Baroreceptor"],
            "Blood Pressure Regulation",
            "Medium",
            4,
        ),
        (
            "Atrial natriuretic peptide is stored in which structure?",
            ["Atrial myocytes", "Endothelial cells", "Ventricular myocytes", "Renal podocytes", "Chromaffin cells"],
            "Cardiac Cycle",
            "Easy",
            0,
        ),
        (
            "The Hounsfield unit of myocardium on CT is closest to which of the following?",
            ["Water", "Fat", "Blood clot", "Contrast medium", "Air"],
            "Cardiac Cycle",
            "Medium",
            1,
        ),
    ]


def seed():
    db = SessionLocal()
    try:
        if db.query(User).first() is not None:
            print("Database is not empty — skipping seed (use --reset to wipe).")
            return

        accounts = [
            ("Admin", "admin@itemiq.test", "admin"),
            ("QBM", "qbm@itemiq.test", "qbm"),
            ("Head of Department", "hod@itemiq.test", "hod"),
            ("Subject Matter Expert", "expert@itemiq.test", "sme"),
            ("Examiner", "examiner@itemiq.test", "examiner"),
            ("Dr. Ahmed", "faculty@itemiq.test", "faculty"),
            ("Student", "student@itemiq.test", "student"),
        ]
        users = {role: _make_user(name, email, role) for name, email, role in accounts}
        # A small cohort of students so practice stats are real rather than one
        # user hammering an item forty times.
        cohort = [
            ("Alia", "alicia@itemiq.test"),
            ("Babar", "babar@itemiq.test"),
            ("Chloe", "chloe@itemiq.test"),
            ("Daud", "daud@itemiq.test"),
            ("Emaan", "emaan@itemiq.test"),
            ("Farid", "farid@itemiq.test"),
            ("Gul", "gul@itemiq.test"),
            ("Hamza", "hamza@itemiq.test"),
            ("Iram", "iram@itemiq.test"),
            ("Junaid", "junaid@itemiq.test"),
        ]
        students = {}
        for i, (name, email) in enumerate(cohort):
            u = User(
                name=name,
                email=email,
                student_id=f"S-{2020 + i}",
                password_hash=get_password_hash(DEMO_PASSWORD),
                role="student",
            )
            students[i] = u
        db.add_all(list(users.values()) + list(students.values()))
        db.commit()
        for u in users.values():
            db.refresh(u)
        for u in students.values():
            db.refresh(u)

        prog = Program(name="MBBS", description="Bachelor of Medicine, Bachelor of Surgery", level="Undergraduate")
        db.add(prog)
        db.commit()

        subj = Subject(name="Physiology", code="PHY", program_id=prog.id)
        db.add(subj)
        db.commit()

        topic = Topic(name="Cardiovascular Physiology", subject_id=subj.id, code="CV")
        db.add(topic)
        db.commit()

        subtopics = [
            Subtopic(name="Cardiac Cycle", topic_id=topic.id, code="CC"),
            Subtopic(name="Blood Pressure Regulation", topic_id=topic.id, code="BP"),
        ]
        db.add_all(subtopics)
        db.commit()
        for s in subtopics:
            db.add(Description(subtopic_id=s.id, text="Core learning outcomes for this subtopic."))

        from app.models import QuestionRequest
        req1 = QuestionRequest(
            topic_id=topic.id,
            subtopic_id=subtopics[0].id,
            requested_by=users["qbm"].id,
            assigned_to=users["faculty"].id,
            q_type="MCQ",
            difficulty="Medium",
            q_count=5,
            status="PENDING",
        )
        req2 = QuestionRequest(
            topic_id=topic.id,
            subtopic_id=subtopics[1].id,
            requested_by=users["hod"].id,
            assigned_to=users["faculty"].id,
            q_type="MCQ",
            difficulty="Hard",
            q_count=3,
            status="PENDING",
        )
        db.add_all([req1, req2])
        db.commit()

        score_map = {"Easy": 0.35, "Medium": 0.55, "Hard": 0.75}
        questions = []
        for stem, opts, subtopic_name, diff, correct_idx in bank_questions():
            sub = next(s for s in subtopics if s.name == subtopic_name)
            q = Question(
                stem=stem,
                q_type="MCQ",
                subtopic_id=sub.id,
                author_id=users["faculty"].id,
                faculty_difficulty=diff,
                difficulty_tag=diff,
                difficulty_score=score_map[diff],
                explanation="Seeded explanation.",
                reference="SIUT Physiology Guide",
                status="in_bank",
            )
            db.add(q)
            db.flush()
            for pos, text in enumerate(opts):
                q.options.append(QuestionOption(text=text, position=pos, is_correct=pos == correct_idx))
            db.flush()
            questions.append(q)

        # Practice attempts spread across the cohort so first-attempt stats are real:
        # each student attempts a few banked questions once.
        for u in students.values():
            for q in questions[:3]:
                correct = next(o.position for o in q.options if o.is_correct)
                picked = correct if random.random() < 0.65 else random.randint(0, len(q.options) - 1)
                db.add(
                    Attempt(
                        user_id=u.id,
                        question_id=q.id,
                        selected_position=picked,
                        is_correct=picked == correct,
                        is_first=True,
                    )
                )
                q.attempt_count += 1

        # A sat exam paper so PaperDetail / Analytics have sittings to render.
        paper = ExamPaper(
            title="Mock Cardiovascular Sitting",
            created_by=users["qbm"].id,
            status="sat",
            batch="2028",
            exam_type="mock",
            program_id=prog.id,
            exam_date=date(2025, 5, 1),
        )
        db.add(paper)
        db.commit()
        # Put all four banked questions on it.
        for pos, q in enumerate(questions, start=1):
            db.add(ExamPaperQuestion(exam_paper_id=paper.id, question_id=q.id, position=pos))
        db.commit()

        from app.services.stats import sitting_stats

        # Write responses for 12 candidates so sitting stats are non-trivial.
        links = (
            db.query(ExamPaperQuestion)
            .filter(ExamPaperQuestion.exam_paper_id == paper.id)
            .order_by(ExamPaperQuestion.position)
            .all()
        )
        for i in range(12):
            key = f"CAND-{paper.id}-{i}"
            for link in links:
                q = link.question
                correct = next((o.position for o in q.options if o.is_correct), 0)
                picked = correct if random.random() < 0.6 else random.randint(0, len(q.options) - 1)
                db.add(
                    StudentResponse(
                        exam_paper_id=paper.id,
                        question_id=q.id,
                        candidate_key=key,
                        selected_position=picked,
                        is_correct=picked == correct,
                    )
                )
        db.commit()
        sitting_stats(db, paper.id)
        db.commit()

        print("Seed complete. Demo accounts (password = 'password'):")
        for _, email, role in accounts:
            print(f"  {role:22s} {email}")
    finally:
        db.close()


if __name__ == "__main__":
    if "--reset" in sys.argv:
        reset_db()
    seed()
