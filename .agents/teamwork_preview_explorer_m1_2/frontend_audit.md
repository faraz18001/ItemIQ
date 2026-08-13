# Frontend API Call Audit & Backend Cross-Reference Report

**Agent**: Explorer 2 (Frontend API Call Auditor)  
**Working Directory**: `/home/syedfaraz/Projects/Murtaza-Project/.agents/teamwork_preview_explorer_m1_2`  
**Date**: 2026-08-13  
**Target Codebase**: `/home/syedfaraz/Projects/Murtaza-Project/frontend/` & `/home/syedfaraz/Projects/Murtaza-Project/backend/`

---

## 1. Executive Summary

This audit cataloged **all 51 API call invocation sites** in the frontend codebase (`/frontend/src/`) and cross-referenced them against the FastAPI backend route definitions (`/backend/app/routers/` & `main.py`).

### Key Audit Findings:
1. **API Client Architecture**: All HTTP communication in the frontend is routed through a single centralized client defined in `@/lib/api.ts` (`export const api`), utilizing native `fetch`. Base URL defaults to relative path `/api` (proxied by Vite in dev to `:8000`).
2. **Missing Endpoint Discrepancy**: **1 Critical Issue** detected:
   - `POST /api/auth/verify-email` is invoked by `src/pages/public/VerifyEmail.tsx`, but **no such route exists** in `backend/app/routers/auth.py`.
3. **Parameter & Schema Casing Discrepancy**:
   - **JSON / Request Bodies**: Almost all requests use `camelCase` (`identifier`, `currentPassword`, `subtopicId`, `facultyId`, `questionId`, `newPassword`, etc.) matching backend Pydantic schemas in `backend/app/schemas/__init__.py`.
   - **PDF Submissions (`PdfSubmission`)**: Backend serializer `serialize_submission` returns `snake_case` keys (`request_id`, `faculty_id`, `pdf_path`, `created_at`) while all other serialized entities return `camelCase` (`publicId`, `joiningDate`, `createdAt`, `qType`). Frontend types in `types/index.ts` adapt to `snake_case` for `PdfSubmission`.
4. **Unlinked / Unused Backend Endpoints**:
   - `GET /api/questions/bank`: Unused by frontend (frontend fetches via `GET /api/questions` and filters client-side).
   - `GET /api/questions/submissions/download/{sub_id}`: Unused by frontend (UI does not render download button for PDF submissions).
   - `GET /api/health`: Unused by frontend.

---

## 2. Complete Frontend API Call Catalog

Below is the exhaustive catalog of all API calls made in the frontend codebase, organized by source file and component/context function.

### A. Authentication & Session Management (`AuthContext.tsx`, `ChangePasswordDialog.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `VerifyEmail.tsx`)

#### 1. `GET /auth/me`
- **File & Function**: `src/context/AuthContext.tsx` — `AuthProvider` (in `useEffect` on mount)
- **HTTP Method**: `GET`
- **URL Path**: `/auth/me`
- **Params / Body**: None
- **Expected Response**: `Session` (`{ id: string, name: string, email: string, role: Role, roles?: Role[], department: string, publicId: string, studentId?: string }`)
- **Field Access**: `setSession(me)`
- **Error Handling**: `err instanceof ApiError && err.isAuthError` clears token via `setToken(null)`.

#### 2. `POST /auth/login`
- **File & Function**: `src/context/AuthContext.tsx` — `authenticate()`
- **HTTP Method**: `POST`
- **URL Path**: `/auth/login`
- **Request Body (camelCase)**: `{ identifier: string, password: string }`
- **Expected Response**: `{ token: string, user: Session }`
- **Field Access**: `res.token`, `res.user`
- **Error Handling**: Throws `ApiError` to caller (Login form).

#### 3. `POST /auth/register`
- **File & Function**: `src/context/AuthContext.tsx` — `registerUser()`
- **HTTP Method**: `POST`
- **URL Path**: `/auth/register`
- **Request Body (camelCase)**: `{ name: string, email: string, password: string, role: string }`
- **Expected Response**: `{ token: string, user: Session }`
- **Field Access**: `res.token`, `res.user`
- **Error Handling**: Throws `ApiError` to caller.

#### 4. `POST /auth/logout`
- **File & Function**: `src/context/AuthContext.tsx` — `logout()`
- **HTTP Method**: `POST`
- **URL Path**: `/auth/logout`
- **Request Body**: `{}`
- **Expected Response**: `{ ok: boolean }`
- **Error Handling**: `try/catch` ignores errors so client logout always completes locally.

#### 5. `POST /auth/password`
- **File & Function**: `src/components/common/ChangePasswordDialog.tsx` — `submit()`
- **HTTP Method**: `POST`
- **URL Path**: `/auth/password`
- **Request Body (camelCase)**: `{ currentPassword: string, newPassword: string }`
- **Expected Response**: `{ ok: boolean }`
- **Error Handling & Toast**: On success: `toast.success('Password changed.')`. On failure: sets `setError(err.message)`.

#### 6. `POST /auth/forgot-password`
- **File & Function**: `src/pages/public/ForgotPassword.tsx` — `submit()`
- **HTTP Method**: `POST`
- **URL Path**: `/auth/forgot-password`
- **Request Body (camelCase)**: `{ email: string }`
- **Expected Response**: `{ ok: boolean, message: string, devToken?: string | null }`
- **Error Handling**: On success sets `sent = true`. On error sets `setError(err.message)`.

#### 7. `POST /auth/reset-password`
- **File & Function**: `src/pages/public/ResetPassword.tsx` — `submit()`
- **HTTP Method**: `POST`
- **URL Path**: `/auth/reset-password`
- **Request Body (camelCase)**: `{ token: string, newPassword: string }`
- **Expected Response**: `{ ok: boolean }`
- **Error Handling & Toast**: On success: `toast.success('Password updated. Sign in with your new password.')`, redirects to `/login`. On error: sets `setError(err.message)`.

#### 8. `POST /auth/verify-email` *(DISCREPANCY — MISSING IN BACKEND)*
- **File & Function**: `src/pages/public/VerifyEmail.tsx` — `VerifyEmail` (in `useEffect`)
- **HTTP Method**: `POST`
- **URL Path**: `/auth/verify-email`
- **Request Body (camelCase)**: `{ token: string }`
- **Expected Response**: `{ ok: boolean, email?: string }`
- **Field Access**: `res.email`
- **Error Handling**: Sets component `state` to `{ status: 'failed', message: err.message }`.

---

### B. Core Data Provider (`DataContext.tsx`)

#### 9. `GET /questions`
- **File & Function**: `src/context/DataContext.tsx` — `loadQuestions()`, `refresh()`
- **HTTP Method**: `GET`
- **URL Path**: `/questions`
- **Params**: None
- **Expected Response**: `Question[]`
- **Field Access**: Populates `questions` state; derived `bankQuestions` filters `status === 'in_bank'`.

#### 10. `POST /questions`
- **File & Function**: `src/context/DataContext.tsx` — `addQuestion()`
- **HTTP Method**: `POST`
- **URL Path**: `/questions`
- **Request Body (camelCase)**: `{ subtopicId: string, descriptionId?: string, stem: string, options: string[], correct: number, facultyDifficulty: Difficulty, explanation?: string, reference?: string, submit: boolean }`
- **Expected Response**: `Question`
- **Error Handling**: Throws to caller, triggers `loadQuestions()` and `loadRequests()`.

#### 11. `PATCH /questions/${id}`
- **File & Function**: `src/context/DataContext.tsx` — `updateQuestion()`
- **HTTP Method**: `PATCH`
- **URL Path**: `/questions/${id}`
- **Request Body (camelCase)**: `Partial<NewQuestionInput>`
- **Expected Response**: `Question`
- **Error Handling**: Throws to caller, triggers `loadQuestions()`.

#### 12. `POST /questions/${id}/submit`
- **File & Function**: `src/context/DataContext.tsx` — `submitQuestion()`
- **HTTP Method**: `POST`
- **URL Path**: `/questions/${id}/submit`
- **Request Body**: `{}`
- **Expected Response**: `Question`
- **Error Handling**: Throws to caller, triggers `loadQuestions()`.

#### 13. `POST /questions/${questionId}/reviews`
- **File & Function**: `src/context/DataContext.tsx` — `reviewDecision()`
- **HTTP Method**: `POST`
- **URL Path**: `/questions/${questionId}/reviews`
- **Request Body (camelCase)**: `{ stage: 'departmental' | 'med_edu', decision: 'accepted' | 'correction_required' | 'rejected', remarks: string }`
- **Expected Response**: `Question`
- **Error Handling**: Triggers `loadQuestions()`, `loadNotifications()`, `loadRequests()`.

#### 14. `GET /questions/submissions`
- **File & Function**: `src/context/DataContext.tsx` — `loadSubmissions()`, `refresh()`
- **HTTP Method**: `GET`
- **URL Path**: `/questions/submissions`
- **Params**: None
- **Expected Response**: `PdfSubmission[]` (`[{ id, request_id, faculty_id, pdf_path, references, status, created_at }]`)
- **Field Access**: Populates `submissions` state. Note `snake_case` fields.

#### 15. `POST /questions/submissions` (Multipart File Upload)
- **File & Function**: `src/context/DataContext.tsx` — `uploadSubmissionPdf()`
- **HTTP Method**: `POST` (Multipart FormData)
- **URL Path**: `/questions/submissions`
- **FormData Keys (snake_case)**: `request_id`, `file`, `references` (optional)
- **Expected Response**: `PdfSubmission`
- **Error Handling**: Triggers `loadSubmissions()`.

#### 16. `POST /questions/submissions/${submissionId}/review`
- **File & Function**: `src/context/DataContext.tsx` — `reviewSubmission()`
- **HTTP Method**: `POST`
- **URL Path**: `/questions/submissions/${submissionId}/review`
- **Request Body (camelCase)**: `{ stage: 'departmental' | 'med_edu', decision: 'accepted' | 'correction_required' | 'rejected', remarks: string }`
- **Expected Response**: `{ status: string, message: string }`
- **Error Handling**: Triggers `loadSubmissions()`, `loadRequests()`, `loadQuestions()`.

#### 17. `GET /requests`
- **File & Function**: `src/context/DataContext.tsx` — `loadRequests()`, `refresh()`
- **HTTP Method**: `GET`
- **URL Path**: `/requests`
- **Params**: None
- **Expected Response**: `RequestEntry[]`
- **Field Access**: Populates `requests` state. Caught with `.catch(() => [])` for roles without access (e.g. examiners).

#### 18. `POST /requests`
- **File & Function**: `src/context/DataContext.tsx` — `generateRequest()`
- **HTTP Method**: `POST`
- **URL Path**: `/requests`
- **Request Body (camelCase)**: `{ subtopicId: string, qCount: number, difficulty: Difficulty, qType?: 'MCQ' | 'SAQ' }`
- **Expected Response**: `RequestEntry`
- **Error Handling**: Triggers `loadRequests()`.

#### 19. `POST /requests/${requestId}/assign`
- **File & Function**: `src/context/DataContext.tsx` — `assignRequest()`
- **HTTP Method**: `POST`
- **URL Path**: `/requests/${requestId}/assign`
- **Request Body (camelCase)**: `{ facultyId: string }`
- **Expected Response**: `RequestEntry`
- **Error Handling**: Triggers `loadRequests()`.

#### 20. `GET /papers`
- **File & Function**: `src/context/DataContext.tsx` — `loadPapers()`, `refresh()`
- **HTTP Method**: `GET`
- **URL Path**: `/papers`
- **Params**: None
- **Expected Response**: `ExamPaper[]`
- **Field Access**: Populates `papers` state.

#### 21. `POST /papers`
- **File & Function**: `src/context/DataContext.tsx` — `createPaper()`
- **HTTP Method**: `POST`
- **URL Path**: `/papers`
- **Request Body (camelCase)**: `{ title: string, tosId: string | null, questionIds: string[], batch?: string | null, academicYear?: string | null, allowRepeats?: boolean, programId?: string | null, examType?: string | null, examDate?: string | null }`
- **Expected Response**: `ExamPaper`
- **Error Handling**: Triggers `loadPapers()`.

#### 22. `POST /papers/${paperId}/status`
- **File & Function**: `src/context/DataContext.tsx` — `setPaperStatus()`
- **HTTP Method**: `POST`
- **URL Path**: `/papers/${paperId}/status`
- **Request Body (camelCase)**: `{ status: PaperStatus }`
- **Expected Response**: `ExamPaper`
- **Error Handling**: Triggers `loadPapers()`.

#### 23. `GET /notifications`
- **File & Function**: `src/context/DataContext.tsx` — `loadNotifications()`, `refresh()`
- **HTTP Method**: `GET`
- **URL Path**: `/notifications`
- **Expected Response**: `Notification[]`
- **Field Access**: Populates `notifications` state.

#### 24. `POST /notifications/${id}/read`
- **File & Function**: `src/context/DataContext.tsx` — `markNotificationRead()`
- **HTTP Method**: `POST`
- **URL Path**: `/notifications/${id}/read`
- **Request Body**: `{}`
- **Error Handling**: Optimistically sets `isRead: true`, catches error with `.catch(loadNotifications)`.

#### 25. `POST /notifications/read-all`
- **File & Function**: `src/context/DataContext.tsx` — `markAllRead()`
- **HTTP Method**: `POST`
- **URL Path**: `/notifications/read-all`
- **Request Body**: `{}`
- **Error Handling**: Optimistically sets `isRead: true`, catches error with `.catch(loadNotifications)`.

#### 26. `GET /bookmarks`
- **File & Function**: `src/context/DataContext.tsx` — `loadBookmarks()`, `refresh()`
- **HTTP Method**: `GET`
- **URL Path**: `/bookmarks`
- **Expected Response**: `string[]` (list of question IDs)
- **Field Access**: Populates `bookmarks` state.

#### 27. `POST /bookmarks`
- **File & Function**: `src/context/DataContext.tsx` — `toggleBookmark()`
- **HTTP Method**: `POST`
- **URL Path**: `/bookmarks`
- **Request Body (camelCase)**: `{ questionId: string }`
- **Expected Response**: `{ ok: boolean }`
- **Error Handling**: Optimistically toggles state, catches error and calls `loadBookmarks()`.

#### 28. `DELETE /bookmarks/${questionId}`
- **File & Function**: `src/context/DataContext.tsx` — `toggleBookmark()`
- **HTTP Method**: `DELETE`
- **URL Path**: `/bookmarks/${questionId}`
- **Expected Response**: `{ ok: boolean }`
- **Error Handling**: Optimistically toggles state, catches error and calls `loadBookmarks()`.

#### 29. `GET /progress/me`
- **File & Function**: `src/context/DataContext.tsx` — `loadProgress()`, `refresh()`
- **HTTP Method**: `GET`
- **URL Path**: `/progress/me`
- **Expected Response**: `ProgressSummary` (`{ attempted: number, correct: number, accuracy: number, streak: number, totalAttempts: number, bySubject: [...] }`)
- **Field Access**: Populates `progress` state.

#### 30. `POST /attempts`
- **File & Function**: `src/context/DataContext.tsx` — `recordAttempt()`
- **HTTP Method**: `POST`
- **URL Path**: `/attempts`
- **Request Body (camelCase)**: `{ questionId: string, selected: number }`
- **Expected Response**: `AttemptResult` (`{ questionId: string, selected: number, isCorrect: boolean, isFirst: boolean, correctLabel: string, correctPosition: number | null, explanation: string | null }`)
- **Error Handling**: Triggers `loadProgress()` and `loadQuestions()`.

#### 31. `GET /taxonomy`
- **File & Function**: `src/context/DataContext.tsx` — `refresh()`
- **HTTP Method**: `GET`
- **URL Path**: `/taxonomy`
- **Expected Response**: `Taxonomy` (`{ subjects: Subject[], topics: Topic[], subtopics: Subtopic[], descriptions: Description[] }`)
- **Field Access**: Populates `taxonomy` state.

#### 32. `GET /programs`
- **File & Function**: `src/context/DataContext.tsx` — `refresh()`
- **HTTP Method**: `GET`
- **URL Path**: `/programs`
- **Expected Response**: `Program[]`
- **Field Access**: Populates `programs` state.

#### 33. `GET /tos`
- **File & Function**: `src/context/DataContext.tsx` — `refresh()`
- **HTTP Method**: `GET`
- **URL Path**: `/tos`
- **Expected Response**: `TOS[]`
- **Field Access**: Populates `tos` state.

#### 34. `POST /tos`
- **File & Function**: `src/context/DataContext.tsx` — `createTos()`
- **HTTP Method**: `POST`
- **URL Path**: `/tos`
- **Request Body (camelCase)**: `{ title: string, programId?: string | null, examType?: string, academicYear?: string, entries: TOSEntryDraft[] }`
- **Expected Response**: `TOS`
- **Error Handling**: Updates `tos` state locally.

#### 35. `GET /users`
- **File & Function**: `src/context/DataContext.tsx` — `refresh()`
- **HTTP Method**: `GET`
- **URL Path**: `/users`
- **Expected Response**: `User[]`
- **Field Access**: Populates `users` state.

---

### C. Admin Surfaces (`Users.tsx`, `Diagnostics.tsx`)

#### 36. `GET /users?include_inactive=true`
- **File & Function**: `src/pages/app/admin/Users.tsx` — `load()`
- **HTTP Method**: `GET`
- **URL Path**: `/users?include_inactive=true`
- **Query Parameter**: `include_inactive=true`
- **Expected Response**: `User[]`
- **Field Access**: `setUsers(...)`

#### 37. `PATCH /users/${user.id}` (Toggle `isActive`)
- **File & Function**: `src/pages/app/admin/Users.tsx` — `setActive()`
- **HTTP Method**: `PATCH`
- **URL Path**: `/users/${user.id}`
- **Request Body (camelCase)**: `{ isActive: boolean }`
- **Expected Response**: `User`
- **Error Handling & Toast**: Optimistic state change. On success: `toast.success(...)`. On failure: reverts state and calls `toast.error(err.message)`.

#### 38. `PATCH /users/${user.id}` (Change `role`)
- **File & Function**: `src/pages/app/admin/Users.tsx` — `setRole()`
- **HTTP Method**: `PATCH`
- **URL Path**: `/users/${user.id}`
- **Request Body (camelCase)**: `{ role: Role }`
- **Expected Response**: `User`
- **Error Handling & Toast**: Optimistic state change. On success: `toast.success(...)`. On failure: reverts state and calls `toast.error(err.message)`.

#### 39. `POST /users/${user.id}/roles` (Grant `admin`)
- **File & Function**: `src/pages/app/admin/Users.tsx` — `setAdmin()`
- **HTTP Method**: `POST`
- **URL Path**: `/users/${user.id}/roles`
- **Request Body (camelCase)**: `{ role: 'admin' }`
- **Expected Response**: `User`
- **Error Handling & Toast**: Non-optimistic. On success: `toast.success(...)`. On failure: `toast.error(err.message)`.

#### 40. `DELETE /users/${user.id}/roles/admin` (Revoke `admin`)
- **File & Function**: `src/pages/app/admin/Users.tsx` — `setAdmin()`
- **HTTP Method**: `DELETE`
- **URL Path**: `/users/${user.id}/roles/admin`
- **Params**: None
- **Expected Response**: `User`
- **Error Handling & Toast**: Non-optimistic. On success: `toast.success(...)`. On failure: `toast.error(err.message)`.

#### 41. `POST /users` (Create Staff Account)
- **File & Function**: `src/pages/app/admin/Users.tsx` — `CreateUserDialog.submit()`
- **HTTP Method**: `POST`
- **URL Path**: `/users`
- **Request Body (camelCase)**: `{ name: string, email: string, department: string, role: Role, password: string }`
- **Expected Response**: `User`
- **Error Handling & Toast**: On success: `toast.success(...)`. On failure: sets `setError(err.message)`.

#### 42. `POST /users/${user.id}/reset-password`
- **File & Function**: `src/pages/app/admin/Users.tsx` — `ResetPasswordDialog.submit()`
- **HTTP Method**: `POST`
- **URL Path**: `/users/${user.id}/reset-password`
- **Request Body (camelCase)**: `{ newPassword: string }`
- **Expected Response**: `{ ok: boolean }`
- **Error Handling & Toast**: On success: `toast.success(...)`. On failure: sets `setError(err.message)`.

#### 43. `GET /diagnostics`
- **File & Function**: `src/pages/app/admin/Diagnostics.tsx` — `load()`
- **HTTP Method**: `GET`
- **URL Path**: `/diagnostics`
- **Expected Response**: `Report` (`{ checks: Check[], tally: Record<Status, number>, healthy: boolean }`)
- **Error Handling**: Sets local component `error` state.

---

### D. Analytics & Workflow Surfaces (`Analytics.tsx`, `ItemAnalysis.tsx`, `Mock.tsx`, `NewAdmissionTest.tsx`, `PaperBuilder.tsx`, `PaperDetail.tsx`, `AiItemReview.tsx`)

#### 44. `GET /analytics/papers`
- **File & Function**: `src/pages/app/shared/Analytics.tsx` — `Analytics` (in `useEffect`)
- **HTTP Method**: `GET`
- **URL Path**: `/analytics/papers`
- **Expected Response**: `{ papers: PaperSummary[] }`
- **Field Access**: `setSittings(d.papers)`

#### 45. `GET /analytics/items/${summary.id}`
- **File & Function**: `src/pages/app/shared/ItemAnalysis.tsx` — `ItemAnalysis` (in `useEffect`)
- **HTTP Method**: `GET`
- **URL Path**: `/analytics/items/${summary.id}`
- **Expected Response**: `ItemDetail` (`Question & { flags: QualityFlag[], examHistory?: ItemSitting[], yearlyHistory?: ItemYear[] }`)
- **Field Access**: `setDetail(d)`

#### 46. `GET /analytics/papers/${paperId}`
- **File & Function**: `src/pages/app/workflow/PaperDetail.tsx` — `PaperDetail` (in `useEffect`)
- **HTTP Method**: `GET`
- **URL Path**: `/analytics/papers/${paperId}`
- **Expected Response**: `PaperAnalytics` (`{ paper: PaperMeta, stats: PaperStats | null, totalQuestions: number, totalAttempts: number, withData: number, calibrated: number, difficultyDistribution: [...], items: [...], needsAttention: [...] }`)
- **Field Access**: `setData(d)`

#### 47. `GET /papers/${paperId}/export?variant=${variant}` (Document Export Download)
- **File & Function**: `src/pages/app/workflow/PaperDetail.tsx` — `download()`
- **HTTP Method**: `GET`
- **URL Path**: `/papers/${paperId}/export?variant=${variant}`
- **Query Parameter**: `variant` (`'paper'`, `'key'`, or `'template'`)
- **Expected Response**: Binary Blob (`.docx` file)
- **Handling**: Download triggered via blob URL anchor click in `api.download()`. On error: `toast.error(err.message)`.

#### 48. `POST /papers/${paperId}/responses` (Upload Marked Sheet — Dry Run & Commit)
- **File & Function**: `src/pages/app/workflow/PaperDetail.tsx` — `inspect()` (dryRun=true), `commit()` (dryRun=false)
- **HTTP Method**: `POST` (Multipart FormData)
- **URL Path**: `/papers/${paperId}/responses?dryRun=${dryRun}`
- **Query Parameter**: `dryRun` (`true` or `false`)
- **FormData Key**: `file` (File)
- **Expected Response**: `ImportPreview` (`{ dryRun: boolean, committed: boolean, mode: 'option' | 'correct', candidates: number, questionsMatched: number, answers: number, matchedBy: [...], warnings: [...], responsesWritten?: number, ... }`)
- **Error Handling & Toast**: On dry-run success sets `preview`. On commit success: `toast.success('Imported ... responses from ... candidates.')`, triggers `refresh()`.

#### 49. `POST /tos/${tosId}/autofill?batch=${batch}`
- **Files & Functions**:
  - `src/pages/app/workflow/NewAdmissionTest.tsx` — `autoFill()`
  - `src/pages/app/workflow/PaperBuilder.tsx` — `autoGenerate()`
- **HTTP Method**: `POST`
- **URL Path**: `/tos/${tosId}/autofill?batch=${batch}`
- **Query Parameter**: `batch` (optional cohort identifier, formatting via `api.qs({ batch })`)
- **Expected Response**: `AutofillResult` (`{ questions: Question[], shortfalls: [...], programId: string | null, offProgrammeSkipped: number, repeatsForBatch: string[] }`)
- **Error Handling & Toast**: Shows `toast.warning()` for shortfalls/repeats, `toast.success()` on full fill, `toast.error()` on catch.

#### 50. `POST /mock/start`
- **File & Function**: `src/pages/app/student/Mock.tsx` — `start()`
- **HTTP Method**: `POST`
- **URL Path**: `/mock/start`
- **Request Body (camelCase)**: `{ count: number, subjectId?: string | null, topicId?: string | null, subtopicId?: string | null, difficulty?: Difficulty | null }`
- **Expected Response**: `MockPaper` (`{ paperId: string, questions: Question[] }`)
- **Error Handling & Toast**: On error: `toast.error(err.message)`.

#### 51. `POST /mock/${paper.paperId}/submit`
- **File & Function**: `src/pages/app/student/Mock.tsx` — `finish()`
- **HTTP Method**: `POST`
- **URL Path**: `/mock/${paper.paperId}/submit`
- **Request Body (camelCase)**: `{ answers: Record<string, number> }`
- **Expected Response**: `MockResult` (`{ paperId: string, total: number, answered: number, correct: number, score: number, results: AttemptResult[] }`)
- **Error Handling & Toast**: On success sets `outcome` and calls `refresh()`. On error: `toast.error(err.message)`.

#### 52. `POST /ai/critique`
- **File & Function**: `src/components/common/AiItemReview.tsx` — `run()`
- **HTTP Method**: `POST`
- **URL Path**: `/ai/critique`
- **Request Body (camelCase)**: `AiReviewTarget` (`{ questionId: string }` or `{ stem: string, options: string[], correct?: number, explanation?: string }`)
- **Expected Response**: `AiCritique` (`{ verdict: 'sound' | 'minor_revision' | 'major_revision', summary: string, strengths: string[], issues: [...], traps: [...], harder: string, easier: string, provider: string }`)
- **Error Handling**: Checks `err.status === 503` specifically to inform user that AI feature is disabled in backend config vs general error.

---

## 3. Backend Route Mapping & Cross-Reference Table

| # | Frontend Call Path | Method | Backend Router File & Line | Backend Handler Name | Status / Discrepancy |
|---|---|---|---|---|---|
| 1 | `/auth/me` | GET | `app/routers/auth.py:97` | `me()` | ✅ Match |
| 2 | `/auth/login` | POST | `app/routers/auth.py:80` | `login()` | ✅ Match |
| 3 | `/auth/register` | POST | `app/routers/auth.py:54` | `register()` | ✅ Match |
| 4 | `/auth/logout` | POST | `app/routers/auth.py:102` | `logout()` | ✅ Match |
| 5 | `/auth/password` | POST | `app/routers/auth.py:108` | `change_password()` | ✅ Match |
| 6 | `/auth/forgot-password` | POST | `app/routers/auth.py:121` | `forgot_password()` | ✅ Match |
| 7 | `/auth/reset-password` | POST | `app/routers/auth.py:134` | `reset_password()` | ✅ Match |
| 8 | `/auth/verify-email` | POST | **NONE** | **MISSING IN BACKEND** | ❌ **CRITICAL BUG**: Route does not exist in FastAPI backend |
| 9 | `/questions` | GET | `app/routers/questions.py:80` | `get_questions()` | ✅ Match |
| 10 | `/questions` | POST | `app/routers/questions.py:67` | `create_question()` | ✅ Match |
| 11 | `/questions/{id}` | PATCH | `app/routers/questions.py:100` | `update_question()` | ✅ Match |
| 12 | `/questions/{id}/submit` | POST | `app/routers/questions.py:142` | `submit_question()` | ✅ Match |
| 13 | `/questions/{id}/reviews` | POST | `app/routers/questions.py:160` | `review_question()` | ✅ Match |
| 14 | `/questions/submissions` | GET | `app/routers/questions.py:237` | `get_submissions()` | ⚠️ Casing mismatch (`snake_case` in response) |
| 15 | `/questions/submissions` | POST | `app/routers/questions.py:207` | `submit_pdf()` | ✅ Match (Multipart Form) |
| 16 | `/questions/submissions/{sub_id}/review` | POST | `app/routers/questions.py:263` | `review_submission()` | ✅ Match |
| 17 | `/requests` | GET | `app/routers/requests.py:38` | `get_requests()` | ✅ Match |
| 18 | `/requests` | POST | `app/routers/requests.py:13` | `create_request()` | ✅ Match |
| 19 | `/requests/{req_id}/assign` | POST | `app/routers/requests.py:53` | `assign_request()` | ✅ Match |
| 20 | `/papers` | GET | `app/routers/papers.py:136` | `list_papers()` | ✅ Match |
| 21 | `/papers` | POST | `app/routers/papers.py:145` | `create_paper()` | ✅ Match |
| 22 | `/papers/{paper_id}/status` | POST | `app/routers/papers.py:180` | `set_paper_status()` | ✅ Match |
| 23 | `/papers/{paper_id}/export` | GET | `app/routers/papers.py:198` | `export_paper()` | ✅ Match |
| 24 | `/papers/{paper_id}/responses` | POST | `app/routers/papers.py:224` | `import_responses()` | ✅ Match |
| 25 | `/notifications` | GET | `app/routers/engagement.py:15` | `list_notifications()` | ✅ Match |
| 26 | `/notifications/{notif_id}/read` | POST | `app/routers/engagement.py:30` | `mark_read()` | ✅ Match |
| 27 | `/notifications/read-all` | POST | `app/routers/engagement.py:44` | `mark_all_read()` | ✅ Match |
| 28 | `/bookmarks` | GET | `app/routers/engagement.py:56` | `list_bookmarks()` | ✅ Match |
| 29 | `/bookmarks` | POST | `app/routers/engagement.py:65` | `add_bookmark()` | ✅ Match |
| 30 | `/bookmarks/{question_id}` | DELETE | `app/routers/engagement.py:80` | `remove_bookmark()` | ✅ Match |
| 31 | `/progress/me` | GET | `app/routers/engagement.py:125` | `my_progress()` | ✅ Match |
| 32 | `/attempts` | POST | `app/routers/engagement.py:93` | `record_attempt()` | ✅ Match |
| 33 | `/taxonomy` | GET | `app/routers/taxonomy.py:12` | `get_taxonomy()` | ✅ Match |
| 34 | `/programs` | GET | `app/routers/papers.py:35` | `get_programs()` | ✅ Match |
| 35 | `/tos` | GET | `app/routers/papers.py:45` | `list_tos()` | ✅ Match |
| 36 | `/tos` | POST | `app/routers/papers.py:54` | `create_tos()` | ✅ Match |
| 37 | `/tos/{tos_id}/autofill` | POST | `app/routers/papers.py:84` | `autofill()` | ✅ Match |
| 38 | `/users` | GET | `app/routers/users.py:15` | `list_users()` | ✅ Match |
| 39 | `/users` | POST | `app/routers/users.py:27` | `create_user()` | ✅ Match |
| 40 | `/users/{user_id}` | PATCH | `app/routers/users.py:50` | `update_user()` | ✅ Match |
| 41 | `/users/{user_id}/roles` | POST | `app/routers/users.py:78` | `grant_role()` | ✅ Match |
| 42 | `/users/{user_id}/roles/admin` | DELETE | `app/routers/users.py:98` | `revoke_role()` | ✅ Match |
| 43 | `/users/{user_id}/reset-password` | POST | `app/routers/users.py:124` | `reset_password()` | ✅ Match |
| 44 | `/diagnostics` | GET | `app/routers/admin.py:11` | `diagnostics()` | ✅ Match |
| 45 | `/analytics/papers` | GET | `app/routers/analytics.py:12` | `paper_summaries_view()` | ✅ Match |
| 46 | `/analytics/papers/{paper_id}` | GET | `app/routers/analytics.py:20` | `paper_detail_view()` | ✅ Match |
| 47 | `/analytics/items/{question_id}` | GET | `app/routers/analytics.py:29` | `item_detail_view()` | ✅ Match |
| 48 | `/mock/start` | POST | `app/routers/mock.py:15` | `start_mock()` | ✅ Match |
| 49 | `/mock/{paper_id}/submit` | POST | `app/routers/mock.py:61` | `submit_mock()` | ✅ Match |
| 50 | `/ai/critique` | POST | `app/routers/ai.py:13` | `ai_critique()` | ✅ Match |

---

## 4. In-Depth Discrepancy & Inconsistency Analysis

### 4.1 Critical Discrepancy: Missing `/auth/verify-email` Route
- **Location**: `frontend/src/pages/public/VerifyEmail.tsx:33`
- **Call**: `api.post<{ ok: boolean; email?: string }>('/auth/verify-email', { token })`
- **Backend File**: `backend/app/routers/auth.py`
- **Details**: `VerifyEmail.tsx` handles verification link clicks from email. On mount, it sends a `POST` request to `/api/auth/verify-email`. However, `auth.py` only implements `/register`, `/login`, `/me`, `/logout`, `/password`, `/forgot-password`, and `/reset-password`. It does NOT have a route handler for `/verify-email`.
- **Impact**: Any user navigating to `/verify-email?token=...` will experience a failed request (404 Not Found), showing the error state "Could not confirm this address."

### 4.2 Architectural Casing Discrepancy: `PdfSubmission` Serializer
- **Backend File**: `backend/app/services/serializers.py:147` (`serialize_submission`)
- **Output Keys**: `id`, `request_id`, `faculty_id`, `pdf_path`, `references`, `status`, `created_at`
- **Comparison**:
  - `serialize_user`: `id`, `publicId`, `joiningDate`, `isActive`, `studentId` (`camelCase`)
  - `serialize_question`: `id`, `publicId`, `subjectId`, `subjectName`, `facultyDifficulty`, `createdAt`, etc. (`camelCase`)
  - `serialize_request`: `id`, `subtopicName`, `qType`, `assignedTo`, `createdAt`, etc. (`camelCase`)
  - `serialize_notification`: `id`, `recipientId`, `relatedQuestionId`, `isRead`, `createdAt` (`camelCase`)
- **Impact**: `PdfSubmission` is the only entity returning `snake_case` JSON keys. Frontend `types/index.ts` defined `PdfSubmission` using `snake_case` fields to compensate. While functional, this breaches API naming consistency guidelines.

### 4.3 Unlinked / Unused Backend Endpoints
1. `GET /api/questions/bank` (`backend/app/routers/questions.py:332`)
   - **Backend functionality**: Returns all questions with `status == "in_bank"`.
   - **Frontend usage**: Frontend `DataContext.tsx` loads all visible questions via `GET /api/questions` and computes `bankQuestions` via `questions.filter(q => q.status === 'in_bank')`. `GET /api/questions/bank` is never called.
2. `GET /api/questions/submissions/download/{sub_id}` (`backend/app/routers/questions.py:248`)
   - **Backend functionality**: Serves the PDF file stored on disk for a given submission.
   - **Frontend usage**: Frontend loads submission metadata in `DataContext.tsx`, but no component renders a link or button calling this download endpoint.

---

## 5. Error Handling & Notification Audit

1. **API Error Abstraction (`src/lib/api.ts`)**:
   - Parses FastAPI error response format (`payload.detail`). Handles string details and validation array details (`detail[0].msg`).
   - Automatically attaches `Authorization: Bearer <token>` header if `localStorage` contains `itemiq-token`.
2. **Component Error Feedback Strategy**:
   - **Form dialogs & pages** (`ChangePasswordDialog`, `CreateUserDialog`, `ResetPasswordDialog`, `Diagnostics`, `VerifyEmail`): Set local state `error` string and display styled alert boxes.
   - **Action triggers** (`Users`, `PaperBuilder`, `NewAdmissionTest`, `PaperDetail`, `Mock`): Use `sonner` toasts (`toast.success()`, `toast.error()`, `toast.warning()`).
   - **AI Review** (`AiItemReview`): Specifically checks `err.status === 503` to inform the user if the AI feature is toggled off or unavailable on the server vs a general failure.

---

## 6. Recommendations for Engineering Team

1. **Implement Missing Route**: Add `POST /api/auth/verify-email` endpoint to `backend/app/routers/auth.py` accepting `token: str` and returning `{ "ok": True, "email": user.email }`.
2. **Normalize Serializer Casing**: Update `serialize_submission` in `backend/app/services/serializers.py` to return `requestId`, `facultyId`, `pdfPath`, `createdAt` (and update frontend `PdfSubmission` interface in `src/types/index.ts`) for 100% camelCase API consistency.
3. **Connect PDF Download Endpoint**: Add a download button in the PDF submissions review table pointing to `/api/questions/submissions/download/{id}`.
