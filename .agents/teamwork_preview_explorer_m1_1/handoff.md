# Handoff Report — Explorer 1 (Backend Route & Schema Auditor)

## 1. Observation
- **Codebase Audited**: `/home/syedfaraz/Projects/Murtaza-Project/backend/`
- **Main App & Routers Analyzed**:
  - `backend/app/main.py`: Line 17-18 (`if settings.debug: Base.metadata.create_all(bind=engine)`), 11 routers registered under `/api`.
  - `backend/app/config.py`: Default settings loaded from env, `database_url = "sqlite:///./itemiq.db"`.
  - `backend/app/core/security.py`: `get_current_user` (lines 45-63), `require_roles(*roles)` (lines 70-80), `OAuth2PasswordBearer(tokenUrl="api/auth/login")`.
  - `backend/app/schemas/__init__.py`: 18 Pydantic request models (`LoginRequest`, `RegisterRequest`, `UserCreate`, `UserUpdate`, `GrantRoleRequest`, `ResetPasswordRequest`, `ForgotPasswordRequest`, `ChangePasswordRequest`, `PasswordResetSubmit`, `RequestPayload`, `AssignRequestPayload`, `QuestionCreate`, `QuestionUpdate`, `ReviewDecision`, `AttemptIn`, `BookmarkIn`, `TosEntryDraft`, `TosCreate`, `PaperCreate`, `PaperStatusUpdate`, `MockStart`, `MockSubmit`, `AiCritiqueTarget`).
  - `backend/app/services/serializers.py`: All response serializers (`serialize_user`, `serialize_auth_user`, `serialize_program`, `serialize_taxonomy`, `serialize_request`, `serialize_submission`, `serialize_question`, `serialize_review`, `serialize_notification`, `serialize_tos`, `serialize_paper`, `paper_meta`, `attempt_result`).
  - `backend/app/services/response_import.py`: Line 218: `is_correct = selected == next((o.position for o in q.options if o.is_correct), -1)` where `q` is an `ExamPaperQuestion` object (which lacks an `options` property; the relation is `q.question.options`).
  - `backend/alembic/versions`: Directory exists but is empty (0 migration scripts).
  - `backend/seed`: Directory exists but is empty (0 seed scripts).

- **Total API Endpoints Cataloged**: 52 routes across 11 router files + 1 root health endpoint in `main.py`.

---

## 2. Logic Chain
1. **Endpoint Cataloging**: By examining `main.py` router mounting (prefix `/api`) and each individual router's `APIRouter` declaration (e.g. `prefix="/questions"`, `prefix="/auth"`, `prefix="/users"`), all 52 API endpoints were mapped to their full URL paths, HTTP verbs, parameter requirements, request body schemas, and response JSON formats.
2. **Casing Analysis**: Cross-referencing Pydantic schemas in `schemas/__init__.py` and serializers in `serializers.py` revealed that request models and response models almost uniformly use **camelCase** (e.g., `subtopicId`, `qType`, `facultyDifficulty`, `isRead`, `publicId`, `nResponses`, `pValue`). However, `serialize_submission()` in `serializers.py` returns **snake_case** keys (`request_id`, `faculty_id`, `pdf_path`, `created_at`), which presents a schema misalignment for PDF submission endpoints (`GET /api/questions/submissions` and `POST /api/questions/submissions`).
3. **Runtime Bug Identification**: In `response_import.py`, line 218 attempts to access `q.options` where `q` is an instance of `ExamPaperQuestion`. The SQLAlchemy mapping for `ExamPaperQuestion` defines `question = relationship("Question")` and does not alias `options`. Attempting to process response sheets with `dry_run=False` will trigger an `AttributeError` when accessing `q.options`.
4. **Startup & Deployment Vulnerability**: `main.py` executes `Base.metadata.create_all(bind=engine)` only if `settings.debug` is True. In production builds (`settings.debug = False`), table creation depends on Alembic migrations. Because `alembic/versions/` is empty, starting the application in non-debug mode against a fresh database will result in missing table errors.

---

## 3. Caveats
- **Front-end Mapping**: This audit focused exclusively on backend routers, schemas, models, and services. Comparison with frontend Axios/fetch API calls is designated for Milestone 2 / Explorer 2 handoff reconciliation.
- **IRT / Psychometric Calibration**: Hard IRT fit functions in `app/services/stats.py` are stubbed (`irt` parameters returned as `None`), as noted in code comments regarding future integration with the `girth` package.
- **PDF Extraction**: `pdf_parser.py` uses PapaCambridge filename matching (`{subject}_{session}_qp_{variant}.pdf`). Generic non-conforming PDF uploads return an empty question array.

---

## 4. Conclusion
The backend codebase is well-structured, modular, and mostly standardized around camelCase JSON representations and JWT-based Role-Based Access Control (RBAC). 52 API endpoints have been completely cataloged into `/home/syedfaraz/Projects/Murtaza-Project/.agents/teamwork_preview_explorer_m1_1/backend_audit.md`.

Key critical items requiring attention in subsequent milestones:
1. **AttributeError Bug Fix**: Update `q.options` to `q.question.options` in `app/services/response_import.py:218`.
2. **Casing Alignment**: Update `serialize_submission()` in `app/services/serializers.py` to return camelCase keys (`requestId`, `facultyId`, `pdfPath`, `createdAt`).
3. **Alembic / Database Seeding**: Generate an initial Alembic migration script in `alembic/versions/` and populate `seed/` scripts for production readiness.

---

## 5. Verification Method
- **Report Location**: `/home/syedfaraz/Projects/Murtaza-Project/.agents/teamwork_preview_explorer_m1_1/backend_audit.md`
- **Independent Verification Commands**:
  - Run python module import check:
    `python3 -c "import app.main; print('FastAPI App Loaded Successfully')"`
  - Verify router catalog completeness against code:
    Inspect files in `/home/syedfaraz/Projects/Murtaza-Project/backend/app/routers/*.py`.
