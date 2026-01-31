# Pagination Strategy & Status

> **Strategy:** Hybrid Dual-Mode (Table Grid vs. Dropdown Selection)
> **Status:** ✅ Fully Implemented across all major administrative and general list endpoints.

## 1. Current Status (As of Jan 29, 2026)

All critical list endpoints have been upgraded to support the platform standard **Dual-Mode** strategy.

### Administrative Endpoints
| Endpoint | Status | Supports `?page=`? | Supports Fetch All? |
| :--- | :--- | :--- | :--- |
| **Batches** (`/api/admin/batches`) | ✅ Done | Yes | Yes |
| **Subjects** (`/api/admin/subjects`) | ✅ Done | Yes | Yes |
| **Classrooms** (`/api/admin/classrooms`) | ✅ Done | Yes | Yes |
| **Departments** (`/api/admin/departments`) | ✅ Done | Yes | Yes |
| **Students** (`/api/admin/students`) | ✅ Done | Yes | Yes (Cap: 500) |
| **Admin Faculty** (`/api/admin/faculty`) | ✅ Done | Yes | Yes (Cap: 500) |
| **Elective Buckets** (`/api/admin/buckets`) | ✅ Done | Yes | Yes (Cap: 500) |
| **Courses** (`/api/admin/courses`) | ✅ Done | Yes | Yes |
| **Colleges** (`/api/admin/colleges`) | ✅ Done | Yes | Yes |
| **Constraints** (`/api/admin/constraints`) | ✅ Done | Yes | Yes (Cap: 500) |

### General / Faculty Endpoints
| Endpoint | Status | Supports `?page=`? | Supports Fetch All? |
| :--- | :--- | :--- | :--- |
| **General Batches** (`/api/batches`) | ✅ Done | Yes | Yes |
| **General Subjects** (`/api/subjects`) | ✅ Done | Yes | Yes |
| **General Classrooms** (`/api/classrooms`) | ✅ Done | Yes | Yes |
| **General Departments** (`/api/departments`) | ✅ Done | Yes | Yes |
| **General Faculty** (`/api/faculty`) | ✅ Done | Yes | Yes (Cap: 500) |
| **Timetables** (`/api/timetables`) | ✅ Done | Yes | Yes (Cap: 500) |
| **Assignments** (`/api/assignments`) | ✅ Done | Yes | Yes (Cap: 500) |
| **Audit Logs** (`/api/audit-logs`) | ✅ Done | Yes | Yes |

---

## 2. The Strategy: Hybrid Dual-Mode

**Philosophy:** A single API endpoint adapts its behavior based on user intent.

### Mode A: Table View (Paginated)
*   **Trigger:** Client sends `?page=1&limit=20`
*   **Behavior:** Returns a slice of data with full metadata (`total`, `pages`, etc.).
*   **Use Case:** Admin Data Grids, Table views.

### Mode B: Selection View (Fetch All)
*   **Trigger:** Client sends **no** pagination parameters.
*   **Behavior:** Returns **ALL** matching records (up to a safety cap, usually 500).
*   **Use Case:** Dropdowns (`<select>`), Autocomplete, Printing, Exports.

## 3. Implementation Guide

To implement this in a new endpoint, follow this pattern:

### Step 1: Use the Shared Utility
```typescript
import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';

// In your GET handler:
const { page, limit, isPaginated } = getPaginationParams(request);
```

### Step 2: Conditional Logic
```typescript
let query = supabase.from('...').select('*', { count: 'exact' });

// Apply Pagination only if requested
if (isPaginated && page && limit) {
  const { from, to } = getPaginationRange(page, limit);
  query = query.range(from, to);
} else {
  // Optional: Safety Cap for big tables
  query = query.limit(500); 
}
```

### Step 3: Hybrid Response
```typescript
const { data, count } = await query;

if (isPaginated && page && limit) {
  // Mode A: Detailed Response
  const paginated = createPaginatedResponse(data, count, page, limit);
  return NextResponse.json({
    data: paginated.data, // Standard Resource Key maintained for backward compatibility
    meta: paginated.meta
  });
} else {
  // Mode B: Simple Response
  return NextResponse.json({
    data: data || [], 
    meta: { total: count || 0 }
  });
}
```
