# Performance Optimization Strategy

## 1. Current State Analysis
The application was suffering from severe performance bottlenecks primarily due to the **N+1 Query Problem**.
- **Issue:** The API would fetch a list of items (e.g., Timetables) and then loop through each one to fetch related data (Creator, Batch, Tasks) individually.
- **Impact:** For 50 items, this resulted in ~151 separate database requests.
- **Latency:** With 50ms latency per request, this added ~2.5 seconds purely in network delays.

## 2. Implemented Optimizations (Immediate Fixes)

### A. Eager Loading (Joins)
We have refactored the critical `GET /api/timetables` route to use **Supabase Embedded Resources**.
- **Before:** 1 Query (List) + N Queries (Batch) + N Queries (User) + N Queries (Task)
- **After:** 1 Query (List + Batch + User + Task joined)
- **Result:** Constant O(1) database round-trips regardless of dataset size.

### B. Database Indexing
We have generated a SQL script (`database/01_performance_indexes.sql`) to add indexes to foreign keys.
- **Action:** Run this script in your Supabase SQL Editor.
- **Benefit:** Transforms $O(N)$ table scans into $O(\log N)$ index lookups for filtering by `department_id`, `batch_id`, etc.

## 3. Recommended Future Optimizations

### A. Pagination (Critical)
Currently, APIs fetch *all* matching records. As data grows, this will crash the browser.
- **Strategy:** Implement cursor-based or offset-based pagination.
- **Code Change:**
  ```typescript
  const page = searchParams.get('page') || 1;
  const limit = 20;
  query = query.range((page - 1) * limit, page * limit - 1);
  ```

### B. Payload Minimization
- **Strategy:** Only select necessary fields. Avoid `select('*')` if only 3 columns are needed.
- **Action:** audit `src/app/api` routes and replace `*` with specific columns where possible.

### C. Client-Side Caching
- **Strategy:** Use React Query or SWR on the frontend.
- **Benefit:** Prevents re-fetching data when navigating back to a page.

### D. Edge Functions
- **Strategy:** Move heavy computation (like auto-scheduling logic) to Supabase Edge Functions to run closer to the data.

## 4. Maintenance
- **Regular `ANALYZE`:** Run `ANALYZE` on your Postgres tables weekly to update query planner statistics.
- **Monitoring:** Use Supabase Database Health dashboard to watch for "Full Table Scans".
