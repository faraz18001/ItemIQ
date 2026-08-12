from fastapi import FastAPI
from database import engine, Base
from routers import auth, users, taxonomy, questions, exams
import engine as ai_engine

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ItemIQ Prototype Backend")

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(taxonomy.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(exams.router, prefix="/api")
app.include_router(ai_engine.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "db": "sqlite"}
