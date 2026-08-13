## 2026-08-13T08:42:56Z

You are Worker 1 (API Alignment & Serializer Implementer) working in `/home/syedfaraz/Projects/Murtaza-Project/.agents/teamwork_preview_worker_m2`.

Your task is to implement the API Alignment fixes identified in Milestone 1:

1. **Implement Missing Backend Endpoint `POST /api/auth/verify-email`**:
   - In `backend/app/routers/auth.py`, create `VerifyEmailRequest` schema (or in `backend/app/schemas/__init__.py`: `token: str`) and add route handler `@router.post("/verify-email")`.
   - Returns `{"ok": True, "email": "user@example.com"}` or verifies valid user token.

2. **Standardize `serialize_submission` Response Keys**:
   - In `backend/app/services/serializers.py`, update `serialize_submission()` so that returned dictionary keys match camelCase conventions (`id`, `requestId`, `facultyId`, `pdfPath`, `references`, `status`, `createdAt`).
   - Also update frontend types and usages (`frontend/src/types/index.ts`, `frontend/src/context/DataContext.tsx`, `frontend/src/pages/app/workflow/ReviewQueue.tsx`) to consistently use camelCase fields for `PdfSubmission` (`requestId`, `facultyId`, `pdfPath`, `createdAt`).

3. **Fix Backend Runtime `AttributeError` in `response_import.py`**:
   - In `backend/app/services/response_import.py` (line 218), change `q.options` to `q.question.options`.

4. **Fix "View PDF" Authenticated Download**:
   - Update `frontend/src/pages/app/workflow/ReviewQueue.tsx` so "View PDF" handles token authentication (e.g., using `api.getBlob` or fetching the PDF blob using the Bearer token and opening `URL.createObjectURL(blob)` in a new tab) instead of unauthenticated `<a href="...">` anchor link which results in 401.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

When finished:
1. Verify backend starts cleanly (`PYTHONPATH=backend virtual/bin/python -m uvicorn app.main:app`).
2. Verify affected files compile cleanly.
3. Write your completion report to `/home/syedfaraz/Projects/Murtaza-Project/.agents/teamwork_preview_worker_m2/changes.md` and create `progress.md` and `handoff.md`. Send a message to parent with build/test results.
