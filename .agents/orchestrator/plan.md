# Execution Plan: ItemIQ Frontend-Backend Integration

## Overview
ItemIQ is a comprehensive assessment and question bank management system serving Faculty, SME, QBM, HOD/Admin, and Student roles. The objective is to achieve 100% frontend-backend alignment, seamless end-to-end data flow across all user roles, robust error handling, clean build/run states, and zero integrity violations.

## Milestone Breakdown

### Milestone 1: Exploration & API Endpoint Audit
- **Objective**: Perform a detailed static and dynamic audit of all frontend API services (`frontend/src/`) and backend FastAPI endpoints (`backend/app/routers/`).
- **Deliverable**: `M1_API_AUDIT_REPORT.md` documenting missing endpoints, path/method mismatches, payload & query param discrepancies, field key casing mismatches (snake_case vs camelCase), and schema mismatches.
- **Workers**: 3 Explorers in parallel.

### Milestone 2: API Alignment & Serialization Layer Standardization
- **Objective**: Fix endpoint URLs, HTTP methods, serializers, payload structures, and response shapes across frontend and backend.
- **Deliverable**: Verified matching contracts across API calls and backend route handlers.
- **Workers**: Implementer / Worker -> Reviewer -> Challenger -> Auditor.

### Milestone 3: End-to-End Workflow Integration by User Role
- **Objective**: Verify and fix full workflow pipelines for all roles:
  1. **Faculty**: Request viewing, PDF past paper upload, worksheet builder.
  2. **SME**: Departmental review queue, PDF review & approval/rejection.
  3. **QBM**: Question request creation, request assignment, final review, paper generation, question bank management.
  4. **HOD / Admin**: User management, role assignment, password resets, system metrics.
  5. **Student**: Mock exams, practice questions, progress analytics.
  6. **Ingestion Pipeline**: Upload PDF -> SME Review -> QBM Approval -> PDF Parser Extraction -> Bank Entry.
- **Deliverable**: Fully functional end-to-end workflows.

### Milestone 4: Frontend & Backend Robustness, Error Handling & Type Checking
- **Objective**: Fix all TypeScript compilation errors (`npx tsc` / `npm run build`), ensure backend startup with zero errors, add toast notifications and fail-safe data loading across UI components.
- **Deliverable**: 0 TS errors, clean build, clean runtime.

### Milestone 5: Verification, Testing & Forensic Audit
- **Objective**: Perform thorough verification (Reviewers & Challengers) and Forensic Integrity Audit.
- **Deliverable**: Clean audit verdict, all pass criteria satisfied.
