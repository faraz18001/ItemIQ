import random
from database import SessionLocal, Base, engine, User, Role, UserRole, Program, Subject, Topic, Subtopic, QuestionRequest, PdfSubmission, Question
from security import get_password_hash

def seed_db():
    db = SessionLocal()
    
    # 1. Create Roles
    r_admin = Role(name="admin", description="System Administrator")
    r_faculty = Role(name="faculty", description="Question Author")
    r_student = Role(name="student", description="Student")
    r_sme = Role(name="sme", description="Subject Matter Expert")
    r_qbm = Role(name="qbm", description="Question Bank Manager")
    r_hod = Role(name="hod", description="Head of Department")
    db.add_all([r_admin, r_faculty, r_student, r_sme, r_qbm, r_hod])
    db.commit()

    # 2. Create Users
    qbm_user = User(name="QBM Admin", email="qbm@itemiq.test", password_hash=get_password_hash("password"), role="qbm")
    faculty_user = User(name="Dr. Smith", email="smith@itemiq.test", password_hash=get_password_hash("password"), role="faculty")
    sme_user = User(name="Dr. Expert", email="expert@itemiq.test", password_hash=get_password_hash("password"), role="sme")
    hod_user = User(name="Dr. Boss", email="hod@itemiq.test", password_hash=get_password_hash("password"), role="hod")
    db.add_all([qbm_user, faculty_user, sme_user, hod_user])
    db.commit()

    # 3. Create Taxonomy
    prog = Program(name="MBBS", description="Bachelor of Medicine, Bachelor of Surgery")
    db.add(prog)
    db.commit()
    
    subj = Subject(name="Physiology", program_id=prog.id)
    db.add(subj)
    db.commit()
    
    topic = Topic(name="Renal Physiology", subject_id=subj.id)
    db.add(topic)
    db.commit()

    subtopics = [
        Subtopic(name="Glomerular Filtration", topic_id=topic.id),
        Subtopic(name="Tubular Reabsorption", topic_id=topic.id)
    ]
    db.add_all(subtopics)
    db.commit()

    print("Seed complete! Taxonomy and Users created.")

if __name__ == "__main__":
    seed_db()
