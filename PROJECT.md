# Project: ItemIQ Frontend-Backend Integration

## Architecture
- **Frontend**: React + TypeScript (Vite/Tailwind UI/Axios or fetch) located in `frontend/`
- **Backend**: FastAPI / Python backend located in `backend/`
- **Database / Services**: Database models, routers in `backend/app/`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | API Endpoint Audit | Full audit of frontend API calls vs backend routers | None | DONE |
| 2 | Endpoint & Serializer Alignment | Fix URL, method, query, body, snake/camel key mismatches | M1 | IN_PROGRESS |
| 3 | Role-Based Workflow Integration | Integration of Faculty, SME, QBM, HOD/Admin, Student workflows | M2 | PLANNED |
| 4 | Error Handling & Build Cleanliness | Fix TS compilation, backend startup, UI toast & fail-safes | M3 | PLANNED |
| 5 | Forensic Audit & E2E Acceptance | Independent verification, challenger checks, forensic audit | M4 | PLANNED |

## Interface Contracts
### Frontend ↔ Backend
- Auth: JWT token headers / Bearer auth
- Field Naming: Standardized JSON field naming conventions across routers and frontend API services
- Responses: Explicit error models and consistent HTTP status codes
