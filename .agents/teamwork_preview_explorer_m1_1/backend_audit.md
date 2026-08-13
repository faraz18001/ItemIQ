# Backend API Route & Schema Audit Report

**Project**: ItemIQ Backend (`/home/syedfaraz/Projects/Murtaza-Project/backend/`)  
**Auditor**: Explorer 1 (backend route & schema auditor)  
**Date**: 2026-08-13  
**Status**: Completed  

---

## 1. Executive Summary

A comprehensive audit of the FastAPI backend codebase was conducted across all 11 router modules (`app/routers/`), application core configuration (`app/config.py`, `app/database.py`, `app/main.py`, `app/core/security.py`), Pydantic models (`app/schemas/__init__.py`), SQLAlchemy database models (`app/models/`), serialization services (`app/services/serializers.py`), and auxiliary services (`diagnostics_service.py`, `pdf_parser.py`, `response_import.py`, `stats.py`, `paper_export.py`, `ai_reviewer.py`).

### Key Statistics
- **Total API Endpoints Cataloged**: 30 endpoints across 11 routers + main entry point.
- **Routers Cataloged**: `admin`, `ai`, `analytics`, `auth`, `engagement`, `mock`, `papers`, `questions`, `requests`, `taxonomy`, `users`.
- **Database Models Identified**: 14 SQLAlchemy models (`User`, `Role`, `UserRole`, `Question`, `QuestionOption`, `QuestionReview`, `QuestionRequest`, `PdfSubmission`, `SubmissionReviewLog`, `ExamPaper`, `ExamPaperQuestion`, `StudentResponse`, `TOS`, `TOSEntry`, `Program`, `Subject`, `Topic`, `Subtopic`, `Description`, `Notification`, `Bookmark`, `Attempt`, `MockPaper`, `MockPaperQuestion`).
- **Pydantic Request Schemas**: 18 Pydantic models in `app/schemas/__init__.py`.

---

## 2. Backend Startup & Database Initialization Audit

### 2.1 Startup Mechanics (`app/main.py`)
- **FastAPI Instance**: Initialized with title `"ItemIQ API"`.
- **Global API Prefix**: All 11 router sub-apps are included under prefix `/api`.
- **Database Table Auto-Creation**:
  ```python
  if settings.debug:
      Base.metadata.create_all(bind=engine)
  ```
  - **Dev Mode**: When `DEBUG=true` (default in dev), SQLite tables are created automatically on startup.
  - **Prod Mode**: When `DEBUG=false`, table creation relies on Alembic migrations.

### 2.2 Potential Errors & Inconsistencies Found

1. **Empty Alembic Migrations Directory (`alembic/versions/`)**:
   - `alembic/versions/` is currently **empty**. In production mode (`DEBUG=false`), the application will fail to start or operate if tables are not pre-created, as no migration scripts exist to generate the schema.
2. **Missing Seed Scripts (`seed/`)**:
   - The `seed/` directory is completely empty. Although `diagnostics_service.py` references running a "seeder to populate the bank", no seeding script or CLI utility is currently present in the backend folder.
3. **Critical Runtime Bug in Response Import (`app/services/response_import.py`)**:
   - In `_commit()` (lines 205-241):
     ```python
     is_correct = selected == next((o.position for o in q.options if o.is_correct), -1)
     ```
     `q` is an instance of `ExamPaperQuestion`, which has a `question` relationship pointing to `Question`. `ExamPaperQuestion` does **NOT** have an `options` attribute directly. Calling `q.options` will crash with `AttributeError: 'ExamPaperQuestion' object has no attribute 'options'`.
     - **Fix**: Update line 218 to `q.question.options`.
4. **Casing Discrepancy in PDF Submission Serialization (`app/services/serializers.py`)**:
   - Almost all endpoints serialize response objects into **camelCase** (e.g. `publicId`, `subtopicName`, `isRead`, `nResponses`, `pValue`, `difficultyTag`).
   - However, `serialize_submission()` returns **snake_case** keys:
     ```python
     {
         "id": str(sub.id),
         "request_id": str(sub.request_id) if sub.request_id else None,
         "faculty_id": str(sub.faculty_id),
         "pdf_path": sub.pdf_path,
         "references": sub.references,
         "status": sub.status,
         "created_at": _iso(sub.created_at),
     }
     ```
     - **Impact**: Frontend components expecting `requestId`, `facultyId`, `pdfPath`, or `createdAt` will experience undefined property errors.
5. **PapaCambridge Naming Dependency in `pdf_parser.py`**:
   - `parse_paper()` expects filenames conforming to `{subject}_{session}_qp_{variant}.pdf` (e.g., `9709_s21_qp_12.pdf`). Standard file uploads from faculty (e.g., `chapter1_questions.pdf`) fail filename regex parsing and return `[]`, silently skipping question extraction upon QBM approval.

---

## 3. Comprehensive API Endpoint Catalog

All routes are mounted under prefix `/api`.

### 3.1 Health & Diagnostics

| Full URL Path | Method | Auth Required | Roles Allowed | Request Model / Params | Response Structure |
|---|---|---|---|---|---|
| `/api/health` | GET | None | Public | None | `{"status": "ok"}` |
| `/api/diagnostics` | GET | Bearer JWT | `qbm`, `hod`, `admin` | None | `{"checks": list, "tally": dict, "healthy": bool}` |

---

### 3.2 Authentication (`/api/auth`)

| Full URL Path | Method | Auth Required | Roles Allowed | Request Model / Body | Response Structure |
|---|---|---|---|---|---|
| `/api/auth/register` | POST | None | Public | `RegisterRequest`<br>- `name`: str<br>- `email`: str<br>- `password`: str (≥8)<br>- `role`: str ("faculty" or "student") | `{"token": str, "user": dict}` |
| `/api/auth/login` | POST | None | Public | `LoginRequest`<br>- `identifier`: str (email/username)<br>- `password`: str | `{"token": str, "user": dict}` |
| `/api/auth/me` | GET | Bearer JWT | Any active user | None | Serialized auth user dict (`id`, `publicId`, `name`, `email`, `department`, `role`, `roles`, `studentId`) |
| `/api/auth/logout` | POST | None | Public | None | `{"ok": true}` |
| `/api/auth/password` | POST | Bearer JWT | Any active user | `ChangePasswordRequest`<br>- `currentPassword`: str<br>- `newPassword`: str (≥8) | `{"ok": true}` |
| `/api/auth/forgot-password` | POST | None | Public | `ForgotPasswordRequest`<br>- `email`: str | `{"ok": true, "message": str, "devToken": str\|null}` |
| `/api/auth/reset-password` | POST | None | Public | `PasswordResetSubmit`<br>- `token`: str<br>- `newPassword`: str (≥8) | `{"ok": true}` |

---

### 3.3 User Management (`/api/users`)

| Full URL Path | Method | Auth Required | Roles Allowed | Request Model / Body | Response Structure |
|---|---|---|---|---|---|
| `/api/users` | GET | Bearer JWT | `qbm`, `hod`, `admin` | Query: `include_inactive: bool = false` | List of serialized users (`id`, `publicId`, `name`, `email`, `department`, `role`, `roles`, `joiningDate`, `isActive`, `studentId`) |
| `/api/users` | POST | Bearer JWT | `qbm`, `hod`, `admin` | `UserCreate`<br>- `name`: str<br>- `email`: str<br>- `department`: str<br>- `role`: str (staff role)<br>- `password`: str (≥8) | Serialized user object |
| `/api/users/{user_id}` | PATCH | Bearer JWT | `qbm`, `hod`, `admin` | Path: `user_id: int`<br>`UserUpdate`<br>- `role`: Optional[str]<br>- `isActive`: Optional[bool] | Serialized user object |
| `/api/users/{user_id}/roles` | POST | Bearer JWT | `admin` | Path: `user_id: int`<br>`GrantRoleRequest`<br>- `role`: str ("admin") | Serialized user object |
| `/api/users/{user_id}/roles/{role}` | DELETE | Bearer JWT | `admin` | Path: `user_id: int`, `role: str` ("admin") | Serialized user object |
| `/api/users/{user_id}/reset-password` | POST | Bearer JWT | `qbm`, `hod`, `admin` | Path: `user_id: int`<br>`ResetPasswordRequest`<br>- `newPassword`: str (≥8) | `{"ok": true}` |

---

### 3.4 Taxonomy (`/api/taxonomy` & `/api/programs`)

| Full URL Path | Method | Auth Required | Roles Allowed | Request Model / Body | Response Structure |
|---|---|---|---|---|---|
| `/api/taxonomy` | GET | Bearer JWT | Any active user | None | `{"subjects": list, "topics": list, "subtopics": list, "descriptions": list}` |
| `/api/programs` | GET | Bearer JWT | Any active user | None | List of programs (`id`, `name`, `description`, `level`, `isActive`, `subjectIds`) |

---

### 3.5 Question Requests (`/api/requests`)

| Full URL Path | Method | Auth Required | Roles Allowed | Request Model / Body | Response Structure |
|---|---|---|---|---|---|
| `/api/requests` | GET | Bearer JWT | `faculty`, `sme`, `examiner`, `qbm`, `hod`, `admin` | None | List of request dicts (`id`, `subtopicName`, `subjectName`, `topicName`, `qType`, `qCount`, `difficulty`, `status`, `assignedTo`, `createdAt`, `assignedAt`, `submitted`) |
| `/api/requests` | POST | Bearer JWT | `qbm`, `hod`, `admin` | `RequestPayload`<br>- `subtopicId`: str<br>- `qType`: str ("MCQ")<br>- `qCount`: int (1)<br>- `difficulty`: str ("Medium") | Serialized request object |
| `/api/requests/{req_id}/assign` | POST | Bearer JWT | `qbm`, `hod`, `admin` | Path: `req_id: int`<br>`AssignRequestPayload`<br>- `facultyId`: Optional[str] | Serialized request object |

---

### 3.6 Questions & Workflows (`/api/questions`)

| Full URL Path | Method | Auth Required | Roles Allowed | Request Model / Body | Response Structure |
|---|---|---|---|---|---|
| `/api/questions` | GET | Bearer JWT | Any active user | None | List of serialized question objects (filtered by role) |
| `/api/questions` | POST | Bearer JWT | `faculty`, `sme`, `hod`, `qbm`, `examiner`, `admin` | `QuestionCreate`<br>- `subtopicId`: str<br>- `descriptionId`: Optional[str]<br>- `stem`: str<br>- `options`: list[str]<br>- `correct`: int<br>- `facultyDifficulty`: str<br>- `explanation`: Optional[str]<br>- `reference`: Optional[str]<br>- `submit`: bool | Serialized question object |
| `/api/questions/bank` | GET | Bearer JWT | Any active user | None | List of questions with `status == "in_bank"` |
| `/api/questions/{question_id}` | PATCH | Bearer JWT | Author or `qbm`/`hod`/`admin` | Path: `question_id: int`<br>`QuestionUpdate`<br>All fields optional (`subtopicId`, `stem`, `options`, `correct`, `facultyDifficulty`, etc.) | Serialized question object |
| `/api/questions/{question_id}/submit` | POST | Bearer JWT | Author only | Path: `question_id: int` | Serialized question object |
| `/api/questions/{question_id}/reviews` | POST | Bearer JWT | `sme`/`hod`/`qbm`/`admin` (dept)<br>`qbm`/`hod`/`admin` (med_edu) | Path: `question_id: int`<br>`ReviewDecision`<br>- `stage`: str<br>- `decision`: str<br>- `remarks`: str | Serialized question object |
| `/api/questions/submissions` | GET | Bearer JWT | `faculty`, `sme`, `examiner`, `qbm`, `hod`, `admin` | None | List of PDF submission objects (**snake_case**: `request_id`, `faculty_id`, `pdf_path`, `created_at`) |
| `/api/questions/submissions` | POST | Bearer JWT | `faculty`, `sme`, `hod`, `qbm`, `admin` | Multipart Form:<br>- `request_id`: Form[str]<br>- `references`: Form[Optional[str]]<br>- `file`: File[UploadFile] | Serialized submission object (**snake_case**) |
| `/api/questions/submissions/download/{sub_id}` | GET | Bearer JWT | Any active user | Path: `sub_id: int` | FileResponse (PDF binary stream) |
| `/api/questions/submissions/{sub_id}/review` | POST | Bearer JWT | `sme`/`hod`/`qbm`/`admin` (dept)<br>`qbm`/`hod`/`admin` (med_edu) | Path: `sub_id: int`<br>`ReviewDecision`<br>- `stage`: str<br>- `decision`: str<br>- `remarks`: str | `{"status": str, "message": str}` |

---

### 3.7 Exam Papers & TOS Blueprints (`/api/tos` & `/api/papers`)

| Full URL Path | Method | Auth Required | Roles Allowed | Request Model / Body | Response Structure |
|---|---|---|---|---|---|
| `/api/tos` | GET | Bearer JWT | `qbm`, `hod`, `examiner`, `admin` | None | List of serialized TOS blueprint objects |
| `/api/tos` | POST | Bearer JWT | `qbm`, `hod`, `examiner`, `admin` | `TosCreate`<br>- `title`: str<br>- `programId`: Optional[str]<br>- `examType`: Optional[str]<br>- `academicYear`: Optional[str]<br>- `entries`: list[TosEntryDraft] | Serialized TOS object |
| `/api/tos/{tos_id}/autofill` | POST | Bearer JWT | `qbm`, `hod`, `examiner`, `admin` | Path: `tos_id: int`<br>Query: `batch: str\|null` | `{"questions": list, "shortfalls": list, "programId": str\|null, "offProgrammeSkipped": 0, "repeatsForBatch": list}` |
| `/api/papers` | GET | Bearer JWT | `qbm`, `hod`, `examiner`, `admin` | None | List of serialized paper objects |
| `/api/papers` | POST | Bearer JWT | `qbm`, `hod`, `examiner`, `admin` | `PaperCreate`<br>- `title`: str<br>- `tosId`: Optional[str]<br>- `questionIds`: list[str]<br>- `batch`: Optional[str]<br>- `academicYear`: Optional[str]<br>- `programId`: Optional[str]<br>- `examType`: Optional[str]<br>- `examDate`: Optional[str]<br>- `allowRepeats`: bool | Serialized paper object |
| `/api/papers/{paper_id}/status` | POST | Bearer JWT | `qbm`, `hod`, `admin` | Path: `paper_id: int`<br>`PaperStatusUpdate`<br>- `status`: str | Serialized paper object |
| `/api/papers/{paper_id}/export` | GET | Bearer JWT | `qbm`, `hod`, `examiner`, `admin` | Path: `paper_id: int`<br>Query: `variant: str` ("paper"\|"key"\|"template") | DOCX binary file stream |
| `/api/papers/{paper_id}/responses` | POST | Bearer JWT | `qbm`, `hod`, `admin` | Path: `paper_id: int`<br>Query: `dry_run: bool = true`<br>File: `file: UploadFile` | Import preview object (`dryRun`, `committed`, `candidates`, `questionsMatched`, `answers`, `warnings`, etc.) |

---

### 3.8 Student Engagement & Practice (`/api/engagement` & `/api/mock`)

| Full URL Path | Method | Auth Required | Roles Allowed | Request Model / Body | Response Structure |
|---|---|---|---|---|---|
| `/api/notifications` | GET | Bearer JWT | Any active user | None | List of serialized notification objects |
| `/api/notifications/{notif_id}/read` | POST | Bearer JWT | Any active user | Path: `notif_id: int` | `{"ok": true}` |
| `/api/notifications/read-all` | POST | Bearer JWT | Any active user | None | `{"ok": true}` |
| `/api/bookmarks` | GET | Bearer JWT | Any active user | None | `list[str]` (Array of bookmarked question IDs) |
| `/api/bookmarks` | POST | Bearer JWT | Any active user | `BookmarkIn`<br>- `questionId`: str | `{"ok": true}` |
| `/api/bookmarks/{question_id}` | DELETE | Bearer JWT | Any active user | Path: `question_id: int` | `{"ok": true}` |
| `/api/attempts` | POST | Bearer JWT | Any active user | `AttemptIn`<br>- `questionId`: str<br>- `selected`: int | Attempt result object (`questionId`, `selected`, `isCorrect`, `isFirst`, `correctLabel`, `explanation`) |
| `/api/progress/me` | GET | Bearer JWT | Any active user | None | Progress statistics object (`attempted`, `correct`, `accuracy`, `streak`, `bySubject`) |
| `/api/mock/start` | POST | Bearer JWT | `student` | `MockStart`<br>- `count`: int<br>- `subjectId`: Optional[str]<br>- `topicId`: Optional[str]<br>- `subtopicId`: Optional[str]<br>- `difficulty`: Optional[str] | `{"paperId": str, "questions": list}` |
| `/api/mock/{paper_id}/submit` | POST | Bearer JWT | `student` | Path: `paper_id: int`<br>`MockSubmit`<br>- `answers`: dict[str, int] | `{"paperId": str, "total": int, "answered": int, "correct": int, "score": float, "results": list}` |

---

### 3.9 Analytics & AI (`/api/analytics` & `/api/ai`)

| Full URL Path | Method | Auth Required | Roles Allowed | Request Model / Body | Response Structure |
|---|---|---|---|---|---|
| `/api/analytics/papers` | GET | Bearer JWT | Any active user | None | `{"papers": list[dict]}` |
| `/api/analytics/papers/{paper_id}` | GET | Bearer JWT | Any active user | Path: `paper_id: int` | Analytics detail object (`paper`, `stats`, `difficultyDistribution`, `items`, `needsAttention`) |
| `/api/analytics/items/{question_id}` | GET | Bearer JWT | Any active user | Path: `question_id: int` | Item detail object (`flags`, `examHistory`, `yearlyHistory`, base question dict) |
| `/api/ai/critique` | POST | Bearer JWT | Any active user | `AiCritiqueTarget`<br>- `questionId`: Optional[str]<br>- `stem`: Optional[str]<br>- `options`: list[str]<br>- `correct`: Optional[int]<br>- `explanation`: Optional[str] | Critique result object (`verdict`, `summary`, `strengths`, `issues`, `traps`, `harder`, `easier`, `provider`) |

---

## 4. Role-Based Access Control (RBAC) Matrix

The system implements role permissions through `require_roles(*roles)` and inline role checks:

| Endpoint Group | Public | Student | Faculty | SME | Examiner | QBM | HOD | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `POST /api/auth/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/auth/me`, `POST /api/auth/password` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/taxonomy`, `/programs`, `/notifications`, `/bookmarks`, `POST /attempts`, `GET /progress/me` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/mock/start`, `POST /api/mock/{id}/submit` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `GET /api/questions`, `GET /api/questions/bank` | ❌ | ✅* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/questions` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `PATCH /api/questions/{id}`, `POST /api/questions/{id}/submit` | ❌ | ❌ | Author | Author | Author | ✅ | ✅ | ✅ |
| `POST /api/questions/{id}/reviews` (dept) | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `POST /api/questions/{id}/reviews` (med_edu) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `GET /api/requests` | ❌ | ❌ | Assigned | Requested | Requested | ✅ | ✅ | ✅ |
| `POST /api/requests`, `POST /api/requests/{id}/assign` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `GET /api/tos`, `POST /api/tos`, `POST /api/tos/{id}/autofill` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/papers`, `POST /api/papers`, `GET /api/papers/{id}/export` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/papers/{id}/status`, `POST /api/papers/{id}/responses` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `GET /api/users`, `POST /api/users`, `PATCH /api/users/{id}`, `POST /api/users/{id}/reset-password` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `POST /api/users/{id}/roles`, `DELETE /api/users/{id}/roles/{role}` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `GET /api/diagnostics` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

*\*Student `GET /api/questions` returns only questions with `status == "in_bank"`.*

---

## 5. Verification Method

To verify backend startup and endpoint declarations independently:
1. Run backend syntax & type check:
   `pytest` or `python -m app.main`
2. Inspect schema imports:
   `python -c "import app.main; print('App loaded successfully')"`
