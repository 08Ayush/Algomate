# Pagination Implementation Plan

> **Goal:** Implement standard pagination across all administrative list endpoints to improve performance and scalability.

## 1. Foundation
- [x] Create `PaginationUtils` shared utility
    - [x] `parsePaginationParams(request: Request)` helper
    - [x] `createPaginatedResponse(data, total, page, limit)` helper
    - [x] Define standard interfaces

## 2. API Updates
### Core Admin Endpoints
- [x] **Batches** (`/api/admin/batches`)
- [x] **Subjects** (`/api/admin/subjects`)
- [x] **Classrooms** (`/api/admin/classrooms`)
- [x] **Departments** (`/api/admin/departments`)
- [x] **Students** (`/api/admin/students`)
- [x] **Elective Buckets** (`/api/admin/buckets`)
- [x] **Courses** (`/api/admin/courses`)
- [x] **Audit Logs** (`/api/audit-logs`)
- [x] **Colleges** (`/api/admin/colleges`)
- [x] **Constraints** (`/api/admin/constraints`)

### Management & Faculty Endpoints
- [x] **Faculty (General)** (`/api/faculty`)
- [x] **Admin Faculty Management** (`/api/admin/faculty`)
- [x] **Timetables** (`/api/timetables`)
- [x] **Assignments** (`/api/assignments`)

## 3. Implementation Strategy: Hybrid Dual-Mode
- [x] Implemented logic to detect `page` parameter.
- [x] Mode A: `?page=X` -> Returns metadata + sliced data.
- [x] Mode B: No `page` -> Returns full list (with safety limit 500) for selectors/dropdowns.
- [x] Standardized `meta` object in responses.

## 4. Verification
- [x] Verified all endpoints return correct metadata.
- [x] Verified safety limits for "Fetch All" mode.
- [x] Verified backward compatibility with frontend resource keys.
