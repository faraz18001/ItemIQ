import os
from database import SessionLocal, User, Program, Subject, Topic, Subtopic, QuestionRequest, Question, QuestionOption
from security import get_password_hash

def seed_db():
    db = SessionLocal()
    
    # 1. Create Users
    roles = ['qbm', 'hod', 'faculty', 'sme']
    users = {}
    for role in roles:
        email = f"{role}@itemiq.test"
        existing = db.query(User).filter(User.email == email).first()
        if not existing:
            u = User(
                name=f"{role.upper()} Dr. Smith",
                email=email,
                password_hash=get_password_hash("itemiq"),
                role=role
            )
            db.add(u)
            db.commit()
            db.refresh(u)
            users[role] = u
        else:
            users[role] = existing

    # 2. Taxonomy
    prog = db.query(Program).first()
    if not prog:
        prog = Program(name="MBBS")
        db.add(prog)
        db.commit()
        db.refresh(prog)

    subj = db.query(Subject).first()
    if not subj:
        subj = Subject(name="Renal Physiology", program_id=prog.id)
        db.add(subj)
        db.commit()
        db.refresh(subj)
    
    topic = db.query(Topic).first()
    if not topic:
        topic = Topic(name="Glomerular Filtration", subject_id=subj.id)
        db.add(topic)
        db.commit()
        db.refresh(topic)
        
    subt = db.query(Subtopic).first()
    if not subt:
        subt = Subtopic(name="GFR Regulation", topic_id=topic.id)
        db.add(subt)
        db.commit()
        db.refresh(subt)

    # 3. Create Requests (QBM requesting from Faculty)
    if not db.query(QuestionRequest).first():
        req = QuestionRequest(
            topic_id=topic.id,
            requested_by=users['qbm'].id,
            assigned_to=users['faculty'].id,
            status="PENDING"
        )
        req2 = QuestionRequest(
            topic_id=topic.id,
            requested_by=users['qbm'].id,
            assigned_to=None,
            status="PENDING"
        )
        db.add_all([req, req2])
        db.commit()

    # 4. Create Fake Questions
    if not db.query(Question).first():
        q1 = Question(
            stem="Which of the following hormones constricts the efferent arteriole to maintain GFR?",
            subtopic_id=subt.id,
            status="under_departmental_review",
            q_type="MCQ"
        )
        q2 = Question(
            stem="What is the primary driver of net filtration pressure in the glomerulus?",
            subtopic_id=subt.id,
            status="in_bank",
            q_type="MCQ"
        )
        q3 = Question(
            stem="Which structure prevents large proteins from entering the Bowman's space?",
            subtopic_id=subt.id,
            status="correction_required",
            q_type="MCQ"
        )
        db.add_all([q1, q2, q3])
        db.commit()

    print("Database seeded successfully with fake data!")
    db.close()

if __name__ == "__main__":
    seed_db()
