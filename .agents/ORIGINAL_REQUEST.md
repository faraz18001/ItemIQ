# Original User Request

## Initial Request — 2026-08-13T08:37:17Z

Audit and resolve all frontend-backend integration issues in ItemIQ so that all user workflows (Faculty, SME, HOD, QBM, Admin, Student) operate seamlessly.

Working directory: /home/syedfaraz/Projects/Murtaza-Project
Integrity mode: development

## Requirements

### R1. API Endpoint & Payload Alignment
Audit all API calls across `frontend/src/` against `backend/app/routers/` to ensure endpoint URLs, HTTP methods, request bodies, query params, and response field key names (snake_case vs camelCase) match 100%.

### R2. End-to-End Workflow Functional Integrity
Verify and fix end-to-end data flow for all user roles:
- **Faculty**: Request viewing, PDF past paper upload, worksheet builder.
- **SME**: Departmental review queue, PDF review & approval/rejection.
- **QBM**: Question request creation, request assignment, final review, paper generation, question bank management.
- **HOD / Admin**: User management, role assignment, password resets, system metrics.
- **Student**: Mock exams, practice questions, progress analytics.

### R3. Error Handling & Verification
Ensure proper error boundaries, clear toast notifications, and fail-safe data loading across the application.

## Acceptance Criteria

### API & Data Flow
- [ ] All frontend API calls map accurately to backend routes with 0 missing endpoints or 404/405 errors.
- [ ] Serializer field mappings (snake_case vs camelCase) match without `undefined` runtime crashes.
- [ ] Full question ingestion pipeline (Upload PDF -> SME Review -> QBM Approval -> PDF Parser Extraction -> Bank Entry) works end-to-end.

### Build & Verification
- [ ] Frontend builds cleanly with zero TypeScript errors (`npm run build` or `npx tsc`).
- [ ] Backend runs with zero startup or runtime errors.
