# Handoff Report — Frontend API Call Audit

**Agent**: Explorer 2 (Frontend API Call Auditor)  
**Working Directory**: `/home/syedfaraz/Projects/Murtaza-Project/.agents/teamwork_preview_explorer_m1_2`  
**Date**: 2026-08-13  
**Handoff Type**: Hard (Task Complete)

---

## 1. Observation

1. **Frontend Request Engine**:
   - Location: `/home/syedfaraz/Projects/Murtaza-Project/frontend/src/lib/api.ts` (lines 9, 38-64)
   - Code:
     ```ts
     const BASE = import.meta.env.VITE_API_URL ?? '/api';
     async function request<T>(method: Method, path: string, body?: unknown): Promise<T>
     ```
   - All frontend HTTP interactions route through `api.get`, `api.post`, `api.patch`, `api.del`, `api.upload`, `api.download`.

2. **Missing Endpoint Invocation**:
   - Location: `/home/syedfaraz/Projects/Murtaza-Project/frontend/src/pages/public/VerifyEmail.tsx` (lines 32-34)
   - Code:
     ```ts
     api
       .post<{ ok: boolean; email?: string }>('/auth/verify-email', { token })
       .then((res) => setState({ status: 'done', email: res.email }))
     ```
   - Target backend route definitions: `/home/syedfaraz/Projects/Murtaza-Project/backend/app/routers/auth.py` contains:
     - Line 54: `@router.post("/register")`
     - Line 80: `@router.post("/login")`
     - Line 97: `@router.get("/me")`
     - Line 102: `@router.post("/logout")`
     - Line 108: `@router.post("/password")`
     - Line 121: `@router.post("/forgot-password")`
     - Line 134: `@router.post("/reset-password")`
   - Observation: There is no `@router.post("/verify-email")` defined in `auth.py` or any backend file.

3. **Field Casing Inconsistency (`PdfSubmission`)**:
   - Location: `/home/syedfaraz/Projects/Murtaza-Project/backend/app/services/serializers.py` (lines 147-157)
   - Code:
     ```python
     def serialize_submission(sub: PdfSubmission) -> dict:
         return {
             "id": str(sub.id),
             "request_id": str(sub.request_id) if sub.request_id else None,
             "faculty_id": str(sub.faculty_id),
             "pdf_path": sub.pdf_path,
             "references": sub.references,
             "status": sub.status,
             "created_at": _iso(sub.created_at),
         }
     ```
   - Location: `/home/syedfaraz/Projects/Murtaza-Project/frontend/src/types/index.ts` (lines 479-487)
   - Code:
     ```ts
     export interface PdfSubmission {
       id: string;
       request_id: string | null;
       faculty_id: string;
       pdf_path: string;
       references: string | null;
       status: string;
       created_at: string;
     }
     ```
   - Observation: All other entity serializers (`serialize_user`, `serialize_question`, `serialize_request`, `serialize_notification`, `serialize_tos`, `serialize_paper`) use `camelCase` keys (`publicId`, `joiningDate`, `subtopicName`, `recipientId`, etc.), whereas `serialize_submission` uses `snake_case`.

4. **Unlinked / Unused Backend Endpoints**:
   - Location: `/home/syedfaraz/Projects/Murtaza-Project/backend/app/routers/questions.py` (line 332: `GET /bank`) and (line 248: `GET /submissions/download/{sub_id}`).
   - Observation: Neither endpoint is referenced in any `.ts` or `.tsx` file under `frontend/src/`.

---

## 2. Logic Chain

1. **Step 1**: By searching all occurrences of `api.` imports and HTTP calls across `frontend/src/`, 51 call sites across 15 files were cataloged.
2. **Step 2**: By comparing each cataloged call against route definitions in `backend/app/routers/*.py` mounted with prefix `/api` in `backend/app/main.py`, 50 out of 51 calls matched existing FastAPI route paths and HTTP methods.
3. **Step 3**: `VerifyEmail.tsx:33` posts to `/auth/verify-email`. Since `backend/app/routers/auth.py` does not contain a handler for `/verify-email`, invoking this frontend flow will always produce an HTTP 404 response.
4. **Step 4**: Comparing serializer responses in `backend/app/services/serializers.py` against TypeScript type definitions in `frontend/src/types/index.ts` revealed that while all main domain models return `camelCase` keys, `serialize_submission` returns `snake_case` keys, requiring `PdfSubmission` in `types/index.ts` to be defined with `snake_case` properties.
5. **Step 5**: Comprehensive analysis was synthesized into `/home/syedfaraz/Projects/Murtaza-Project/.agents/teamwork_preview_explorer_m1_2/frontend_audit.md`.

---

## 3. Caveats

- **Runtime Execution**: Analysis was conducted via static code inspection of all frontend components, types, and backend router source files.
- **Third-Party Providers**: `/ai/critique` calls depend on backend LLM provider configuration. Frontend handles 503 Service Unavailable gracefully.

---

## 4. Conclusion

The frontend API surface is highly consistent with the backend API, sharing clear `camelCase` JSON payload standards and unified error handling via `ApiError`. However, **one critical broken feature** exists: email verification via `POST /api/auth/verify-email` is missing on the backend. Furthermore, `PdfSubmission` formatting presents a minor schema casing anomaly (`snake_case` instead of `camelCase`).

---

## 5. Verification Method

To verify these findings independently:
1. **Verify Missing Endpoint**:
   - Inspect `frontend/src/pages/public/VerifyEmail.tsx:33`.
   - Inspect `backend/app/routers/auth.py` — verify there is no `@router.post("/verify-email")`.
2. **Verify Submission Casing**:
   - Inspect `backend/app/services/serializers.py:147` (`serialize_submission`) and compare with `serialize_user` (line 39) or `serialize_request` (line 113).
3. **Inspect Detailed Audit Report**:
   - Read `/home/syedfaraz/Projects/Murtaza-Project/.agents/teamwork_preview_explorer_m1_2/frontend_audit.md`.
