# ItemIQ Comprehensive Workflow, Build & Ingestion Audit Report

**Audit Date**: August 13, 2026  
**Auditor**: Explorer 3 (Role Workflows & Build/Ingestion Auditor)  
**Target Workspace**: `/home/syedfaraz/Projects/Murtaza-Project`  
**Report File**: `/home/syedfaraz/Projects/Murtaza-Project/.agents/teamwork_preview_explorer_m1_3/workflow_audit.md`

---

## 1. Executive Summary

This report presents a thorough read-only audit of the **ItemIQ** project across frontend TypeScript build setup, backend runtime/environment configuration, the end-to-end PDF ingestion pipeline, and 5 primary user role workflows (Faculty, SME, QBM, HOD/Admin, Student).

### Key Audit Discoveries
1. **Frontend Build Failure**: Running `npm run build` fails with **13 TypeScript compilation errors** across 5 files, primarily caused by unused variables/imports (`noUnusedLocals`), string status enum mismatches, and Framer Motion easing type definitions.
2. **Backend Architecture Dualism**: The root directory contains legacy backend files (`main.py`, `database.py`, `routers/`), whereas the active FastAPI application is in `backend/app/main.py` executed via `PYTHONPATH=backend uvicorn app.main:app`.
3. **Ingestion Pipeline Failure Points**:
   - Filename parsing requirement is strictly hardcoded to PapaCambridge standard (`{subject}_{session}_qp_{variant}.pdf`). Uploads with standard or custom names produce 0 extracted questions without error feedback.
   - QBM approval of a PDF triggers extraction, but extracted questions are saved with `subtopic_id = None` and `options = []` (no `QuestionOption` rows are created for MCQs).
   - "View PDF" anchor link in the Review Queue attempts direct browser navigation to an authenticated endpoint without `Authorization: Bearer` headers, resulting in **401 Unauthorized** errors.
4. **Role Workflow Gaps**:
   - **Faculty**: `/app/faculty/new` ("Add Question") is actually an "Upload Past Paper" page; `WorksheetBuilder.tsx` displays a placeholder toast ("not yet implemented") without PDF generation.
   - **QBM**: `Requests.tsx` lacks UI controls for assigning requests to faculty, forcing reliance on HOD views.
   - **Student**: Mock exams rendering questions with empty options (from PDF ingestion) become unanswerable.

---

## 2. Frontend TypeScript Build Setup Audit

### Configuration Inspection
- **`package.json`**:
  - Build script: `"build": "tsc -b && vite build"`
- **`tsconfig.app.json`**:
  - Options: `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"moduleResolution": "bundler"`.
  - Because `noUnusedLocals` is enabled, unused imports immediately cause `tsc` build failures.

### Build Verification & Error Inventory
Command executed: `npm run build` (cwd: `frontend/`)  
**Result**: Build Failed (Exit code 2) with **13 TypeScript Errors**:

| # | File | Line | Error Code | Description |
|---|------|------|------------|-------------|
| 1 | `src/components/layout/PublicLayout.tsx` | 1:16 | `TS6133` | `'NavLink'` is declared but its value is never read. |
| 2 | `src/components/layout/PublicLayout.tsx` | 5:1 | `TS6133` | `'cn'` is declared but its value is never read. |
| 3 | `src/pages/app/faculty/AddQuestion.tsx` | 19:91 | `TS2367` | Comparison between `"Generated" \| "Assigned" \| "In_Progress" \| "Completed"` and `'completed'` (case mismatch: should be `'Completed'`). |
| 4 | `src/pages/app/faculty/FacultyDashboard.tsx` | 1:19 | `TS6133` | `'useState'` is declared but its value is never read. |
| 5 | `src/pages/app/workflow/ReviewQueue.tsx` | 9:1 | `TS6192` | Unused import `Card, CardContent` from `@/components/ui/card`. |
| 6 | `src/pages/public/Home.tsx` | 87:9 | `TS2322` | `fadeUpVariants` transition `ease: [0.22, 1, 0.36, 1]` is typed as `number[]` instead of `Easing` / `[number, number, number, number]`. |
| 7 | `src/pages/public/Home.tsx` | 116:11 | `TS2322` | Duplicate `fadeUpVariants` easing type mismatch on `<motion.section>`. |
| 8 | `src/pages/public/Home.tsx` | 150:45 | `TS2322` | Duplicate `fadeUpVariants` easing type mismatch on `<motion.li>`. |
| 9 | `src/pages/public/Home.tsx` | 165:11 | `TS2322` | Duplicate `fadeUpVariants` easing type mismatch on `<motion.section>`. |
| 10 | `src/pages/public/Home.tsx` | 209:11 | `TS2322` | Duplicate `fadeUpVariants` easing type mismatch on `<motion.section>`. |
| 11 | `src/pages/public/Home.tsx` | 219:37 | `TS2322` | Duplicate `fadeUpVariants` easing type mismatch on `<motion.div>`. |
| 12 | `src/pages/public/Home.tsx` | 234:11 | `TS2322` | Duplicate `fadeUpVariants` easing type mismatch on `<motion.section>`. |
| 13 | `src/pages/public/Home.tsx` | 244:40 | `TS2322` | Duplicate `fadeUpVariants` easing type mismatch on `<motion.div>`. |

---

## 3. Backend Startup, Virtual Environment & Database Audit

### Virtual Environment & Dependencies
- **Location**: `/home/syedfaraz/Projects/Murtaza-Project/virtual`
- **Python Version**: `3.14.6`
- **Installed Packages**: `fastapi` (0.141.1), `uvicorn` (0.52.2), `sqlalchemy` (2.0.52), `pydantic` (2.13.4), `pydantic-settings` (2.15.0), `pymupdf` (1.28.2), `openpyxl` (3.1.5), `python-docx` (1.2.0), `alembic` (1.19.1), `pyjwt` (2.13.0), `bcrypt` (5.0.0).
- **Requirements Discrepancy**: Root `requirements.txt` lists older/fewer dependencies compared to `backend/requirements.txt`. The active dependencies are fully met inside `virtual/`.

### Entry Point & Database
- **Active Server Entry Point**: `backend/app/main.py` (`ItemIQ API`).
- **Server Startup Command**: `PYTHONPATH=backend /home/syedfaraz/Projects/Murtaza-Project/virtual/bin/uvicorn app.main:app --reload`
- **Database Configuration**:
  - Connection string: `sqlite:///./itemiq.db` configured in `backend/app/config.py` and `backend/app/database.py`.
  - Development table auto-creation enabled via `Base.metadata.create_all(bind=engine)` when `settings.debug` is True.
  - SQLite database file `itemiq.db` exists in the project root (size: 90KB).

---

## 4. End-to-End Ingestion Pipeline Audit

The PDF Ingestion Pipeline follows this workflow:  
**Upload PDF (Faculty) → SME Review (Departmental) → QBM Approval (Med Edu) → PyMuPDF Extraction → Question Bank Entry**

```
[Faculty Upload PDF] ──> Status: PENDING_SME
                              │
                              ▼
[SME Review Queue]  ──> Decision: 'accepted' ──> Status: PENDING_QBM
                              │
                              ▼
[QBM Final Review]  ──> Decision: 'accepted' ──> Status: APPROVED
                                                       │
                                                       ▼
                                            _extract_from_pdf()
                                                       │
                                                       ▼
                                            parse_paper(pdf_path)
```

### Critical Ingestion Defects & Failure Modes

1. **PapaCambridge Filename Regex Dependency**:
   - In `backend/app/services/pdf_parser.py` (`parse_paper` function, lines 27-40):
     ```python
     parts = name_no_ext.split("_")
     if len(parts) >= 4:
         subject_code = parts[0]
         session_year = parts[1]
         variant = parts[3]
         ...
     else:
         print(f"Warning: Filename '{file_name}' does not match PapaCambridge standard.")
         return []
     ```
   - **Impact**: If a faculty member uploads a file named `Biology_Past_Paper_2023.pdf` or `9700_paper.pdf`, `parse_paper` logs a warning to stdout and returns `[]`.

2. **Silent Failure & Missing Feedback**:
   - In `backend/app/routers/questions.py` (`_extract_from_pdf`, lines 306-330):
     ```python
     records = parse_paper(sub.pdf_path)
     for rec in records:
         ...
         db.add(q)
     db.commit()
     ```
   - When `parse_paper` returns `[]`, loop finishes with 0 database inserts, but the PDF submission is marked as `APPROVED` with response `"Review logged successfully."`. No alert, toast, or status flag informs QBM or Faculty that 0 questions were extracted.

3. **Incomplete Question Modeling (Missing Options)**:
   - In `_extract_from_pdf()`, extracted text is saved into `Question(stem=..., status="in_bank", subtopic_id=None)`.
   - **Bug**: The parser function does **NOT** parse multiple choice options `A, B, C, D` into `QuestionOption` database rows (`Question.options` remains empty `[]`).
   - **Impact**: Extracted questions in the bank have no choices. When rendered in Student Practice or Mock Exam views, 0 option buttons are displayed, rendering the question unanswerable.

4. **Authentication Failure on "View PDF"**:
   - In `frontend/src/pages/app/workflow/ReviewQueue.tsx` (line 74):
     ```tsx
     <a href={`/api/questions/submissions/download/${s.id}`} target="_blank" rel="noreferrer">
       <Eye className="size-4 mr-2" /> View PDF
     </a>
     ```
   - **Bug**: Plain `<a>` HTML navigation does not transmit the JWT Bearer token in headers. The backend endpoint `/api/questions/submissions/download/{sub_id}` requires `get_current_user`, returning **401 Unauthorized**.
   - **Fix Required**: Use `api.download()` or fetch blob using token and open an object URL.

---

## 5. User Role Workflows Audit

### 1. Faculty Workflow
- **Features Tested**: Request viewing, PDF past paper upload, worksheet builder, question creation.
- **Findings**:
  - **Navigation Misnomer**: Nav button says "Add Question", leading to route `/app/faculty/new` (`AddQuestion.tsx`). However, `AddQuestion.tsx` is exclusively a PDF past paper uploader. Manual single-question authoring UI is missing or not exposed in this route.
  - **Type Mismatch Bug**: `AddQuestion.tsx:19` checks `r.status !== 'completed'`. Backend `RequestEntry` status enum uses capitalized `'Completed'`, causing `myRequests` to fail filtering completed requests.
  - **Unimplemented Worksheet Builder**: `WorksheetBuilder.tsx:46` contains `handleGenerate()` which fires a toast: *"Worksheet generation is not yet implemented. This feature will be available in a future release."* It does not make any API request or generate a PDF file.

### 2. SME Workflow
- **Features Tested**: Departmental review queue, PDF review, approval/rejection.
- **Findings**:
  - **PDF Preview Broken**: SME cannot view the uploaded PDF from `ReviewQueue.tsx` due to missing bearer token in `<a>` link.
  - **Rejected Submission Workflow**: When SME rejects or requests correction on a PDF submission, submission status changes to `REJECTED` in backend, but Faculty Dashboard does not display rejected PDF submissions for re-upload (only displays single question corrections).

### 3. QBM Workflow
- **Features Tested**: Question request creation, request assignment, final review, paper generation, question bank management.
- **Findings**:
  - **Missing Request Assignment UI**: `Requests.tsx` allows QBM to view and generate requests, but does NOT render an assignment dropdown/button to assign requests to faculty members (even though `assignRequest` API exists in `DataContext` and backend).
  - **TOS Shortfall Warnings**: `PaperBuilder.tsx` alerts QBM when bank questions are insufficient for a TOS blueprint, but auto-fill leaves paper under-filled without prompt to generate question requests.
  - **Question Bank Quality**: Questions imported via PDF ingestion appear in `Bank.tsx` with missing subtopic names (`subtopic_id = null`).

### 4. HOD / Admin Workflow
- **Features Tested**: User management, role assignment, password resets, system metrics.
- **Findings**:
  - **Role Switching**: `Users.tsx` permits HOD/Admin to manage staff accounts and reset passwords (`/users/{id}/reset-password`).
  - **Diagnostics Execution**: `/app/admin/diagnostics` runs system integrity checks via `/api/diagnostics`.
  - **Form Reset**: Password reset dialog does not clear previous input state if closed without submitting.

### 5. Student Workflow
- **Features Tested**: Mock exams, practice questions, progress analytics.
- **Findings**:
  - **Option Redaction Security**: `Practice.tsx` correctly conceals answer key until attempt is posted to `/api/attempts`.
  - **Mock Exam Crash Edge Case**: If questions in the mock paper originated from PDF ingestion without `QuestionOption` rows, `Mock.tsx` renders 0 options and user cannot select an answer to progress.
  - **Empty Analytics State**: `Progress.tsx` displays clean empty state when `attempted === 0`.

---

## 6. Summary Matrix of Audit Findings

| Category | Component / Route | Severity | Summary of Issue | Root Cause |
|----------|-------------------|----------|------------------|------------|
| **Build** | `PublicLayout.tsx` | High | `npm run build` fails | Unused imports `NavLink`, `cn` (`noUnusedLocals`) |
| **Build** | `AddQuestion.tsx` | High | `npm run build` fails & filter broken | Status string comparison `'completed'` vs `'Completed'` |
| **Build** | `FacultyDashboard.tsx` | High | `npm run build` fails | Unused import `useState` |
| **Build** | `ReviewQueue.tsx` | High | `npm run build` fails | Unused import `Card, CardContent` |
| **Build** | `Home.tsx` | High | `npm run build` fails (8 errors) | Framer Motion variant easing `number[]` type mismatch |
| **Ingestion** | `pdf_parser.py` | Critical | Extraction yields 0 questions for standard PDFs | Strict hardcoded PapaCambridge filename regex pattern |
| **Ingestion** | `questions.py` | Critical | Silent approval with 0 questions extracted | `_extract_from_pdf` ignores empty extraction list |
| **Ingestion** | `questions.py` | High | Extracted questions have empty options & null subtopic | `_extract_from_pdf` does not parse/create MCQ options |
| **Ingestion** | `ReviewQueue.tsx` | High | "View PDF" opens 401 Unauthorized page | `<a>` link bypasses Bearer authentication header |
| **Workflow** | `Requests.tsx` | Medium | QBM cannot assign requests to faculty | Missing assignment UI component in `Requests.tsx` |
| **Workflow** | `WorksheetBuilder.tsx` | Medium | Download button shows "Not implemented" toast | Missing PDF generation service integration |
| **Workflow** | `Mock.tsx` | Medium | Mock exam stuck on questions without options | Missing option existence check before rendering options |

---

## 7. Actionable Recommendations for M2 / M3 / M4

1. **Fix TypeScript Errors (M2/M4)**:
   - Remove unused imports in `PublicLayout.tsx`, `FacultyDashboard.tsx`, `ReviewQueue.tsx`.
   - Update `AddQuestion.tsx` line 19 to compare against `'Completed'`.
   - Explicitly type Framer motion easing tuples in `Home.tsx` as `const easeTuple: [number, number, number, number] = [0.22, 1, 0.36, 1]`.
2. **Harden PDF Ingestion Pipeline (M3/M4)**:
   - Fall back to generic question numbering regex when PapaCambridge filename convention is not present.
   - Return clear error/warning status when `parse_paper` extracts 0 questions, preventing approval of empty submissions.
   - Enhance PDF parser to extract MCQ options (`A`, `B`, `C`, `D`) and populate `QuestionOption` rows.
   - Replace direct `<a>` link in `ReviewQueue.tsx` with authenticated PDF viewer or `api.download()`.
3. **Enhance Role Workflows (M3)**:
   - Add request assignment dropdown modal to `Requests.tsx` for QBM.
   - Connect `WorksheetBuilder.tsx` to export service or backend PDF builder.
   - Guard `Mock.tsx` and `Practice.tsx` against questions without valid options.
