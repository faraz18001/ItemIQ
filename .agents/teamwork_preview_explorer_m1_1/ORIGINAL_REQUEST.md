## 2026-08-13T08:38:46Z
You are Explorer 1 (backend route & schema auditor) working in `/home/syedfaraz/Projects/Murtaza-Project/.agents/teamwork_preview_explorer_m1_1`.

Your task:
1. Thoroughly analyze the backend codebase (`/home/syedfaraz/Projects/Murtaza-Project/backend/`).
2. Catalog all defined API endpoints across all routers in `backend/app/routers/` (and any other route files or main entry points).
3. For every endpoint, document:
   - Full URL path (including route prefixes like `/api/v1`)
   - HTTP Method (GET, POST, PUT, DELETE, PATCH, etc.)
   - Path parameters & Query parameters
   - Request Body Pydantic model / JSON structure (and exact field names, casing: snake_case vs camelCase)
   - Response Pydantic model / JSON structure (and field names/casing)
   - Required authentication and role permissions (Faculty, SME, QBM, HOD, Admin, Student)
4. Check backend startup files and database initialization logic for any potential errors or missing dependencies.
5. Write your comprehensive audit report to `/home/syedfaraz/Projects/Murtaza-Project/.agents/teamwork_preview_explorer_m1_1/backend_audit.md` and create `progress.md` and `handoff.md` in your working directory. Send a message to parent with your findings and report path.
