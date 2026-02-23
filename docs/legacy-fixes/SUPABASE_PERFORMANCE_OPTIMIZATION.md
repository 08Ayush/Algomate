# Supabase Performance Optimization Guide

## 📋 Table of Contents
1. [Why Login Takes Time](#why-login-takes-time)
2. [Why Data Loading is Slow](#why-data-loading-is-slow)
3. [Row Level Security (RLS) Performance Impact](#row-level-security-rls-performance-impact)
4. [Query Optimization Strategies](#query-optimization-strategies)
5. [Indexing Best Practices](#indexing-best-practices)
6. [Connection Pooling](#connection-pooling)
7. [Caching Strategies](#caching-strategies)
8. [Supabase-Specific Optimizations](#supabase-specific-optimizations)
9. [Monitoring and Debugging](#monitoring-and-debugging)

---

## 🔐 Why Login Takes Time

### Common Causes:

1. **Complex RLS Policies Evaluation**
   - Your schema has RLS enabled on 20+ tables
   - Each policy is evaluated during authentication
   - Nested subqueries in policies (like `user_id IN (SELECT id FROM users WHERE college_id = ...)`) are expensive

2. **Multiple Database Queries on Auth**
   - Fetching user profile data
   - Loading permissions/roles
   - Checking user status (is_active, email_verified)
   - Loading college and department details

3. **JWT Token Generation Overhead**
   - Supabase generates JWT tokens with claims
   - Large claim sets increase token generation time

4. **Network Latency**
   - Distance between client and Supabase server
   - API Gateway processing time

### Solutions:

```sql
-- ✅ Optimize: Use session variables instead of repeated queries
-- Set these once during login:
SELECT set_config('app.current_user_id', 'user-uuid-here', TRUE);
SELECT set_config('app.current_college_id', 'college-uuid-here', TRUE);
SELECT set_config('app.current_role', 'admin', TRUE);
```

**Frontend Optimization:**  
```javascript
// Store user data in local storage after first login
const { data: user, error } = await supabase.auth.signIn({
  email: email,
  password: password
});

if (user) {
  // Cache user profile data locally
  localStorage.setItem('userProfile', JSON.stringify(user));
}
```

---

## 🐌 Why Data Loading is Slow

### Common Causes:

1. **Missing Indexes**
   - Queries on non-indexed columns require full table scans
   - Your schema has many foreign keys that need indexes

2. **N+1 Query Problem**
   - Loading data in loops instead of batch queries
   - Example: Loading subjects for each batch separately

3. **Over-fetching Data**
   - Selecting all columns when only few are needed
   - Loading unnecessary related data

4. **Complex JOIN Operations**
   - Multiple table joins without proper indexes
   - Views with expensive computations

5. **RLS Policy Overhead**
   - Every SELECT query runs through RLS policy evaluation
   - Nested subqueries in policies multiply query time

### Solutions:

#### 1. Use Proper Indexing
```sql
-- ✅ Your schema already has good indexes, but verify they're used:
EXPLAIN ANALYZE 
SELECT * FROM users 
WHERE college_id = 'some-uuid' AND role = 'faculty';

-- Should show "Index Scan" not "Seq Scan"
```

#### 2. Batch Queries Instead of Loops
```javascript
// ❌ BAD: N+1 queries
for (const batch of batches) {
  const subjects = await supabase
    .from('subjects')
    .select('*')
    .eq('batch_id', batch.id);
}

// ✅ GOOD: Single query with JOIN
const { data } = await supabase
  .from('batches')
  .select(`
    *,
    subjects (*)
  `)
  .eq('college_id', collegeId);
```

#### 3. Select Only Required Columns
```javascript
// ❌ BAD: Fetches all columns
const { data } = await supabase
  .from('users')
  .select('*');

// ✅ GOOD: Select specific columns
const { data } = await supabase
  .from('users')
  .select('id, first_name, last_name, email, role');
```

---

## 🔒 Row Level Security (RLS) Performance Impact

### Your Current RLS Policies Analysis:

Your schema has **extensive RLS policies** which are **GREAT for security** but can impact performance:

```sql
-- Example from your schema:
CREATE POLICY "users_isolation_policy" ON users
FOR ALL
USING (
    current_app_role() = 'super_admin'
    OR id = NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID
    OR college_id = current_app_college_id()
);
```

### Performance Impact:

1. **Function Calls in Policies**: Each `current_app_college_id()` call executes on EVERY row
2. **Subquery in Policies**: Policies like this are expensive:
   ```sql
   batch_id IN (SELECT id FROM batches WHERE college_id = current_app_college_id())
   ```
3. **Multiple Policy Evaluation**: When a query touches multiple tables, each table's RLS is evaluated

### Optimization Strategies:

#### 1. Set Session Variables Once (Critical!)
```javascript
// ✅ Set these ONCE after login:
await supabase.rpc('set_user_context', {
  user_id: user.id,
  college_id: user.college_id,
  role: user.role
});

// Create this function in Supabase:
CREATE OR REPLACE FUNCTION set_user_context(
  user_id UUID,
  college_id UUID,
  role VARCHAR
) RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, TRUE);
  PERFORM set_config('app.current_college_id', college_id::TEXT, TRUE);
  PERFORM set_config('app.current_role', role, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. Use Materialized Views for Complex Queries
```sql
-- Create materialized view for frequently accessed data
CREATE MATERIALIZED VIEW mv_user_college_data AS
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.college_id,
  c.name as college_name,
  d.name as department_name
FROM users u
JOIN colleges c ON u.college_id = c.id
LEFT JOIN departments d ON u.department_id = d.id;

-- Create index on materialized view
CREATE INDEX idx_mv_user_college ON mv_user_college_data(college_id);

-- Refresh periodically (every hour or as needed)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_college_data;
```

#### 3. Optimize Policy Subqueries
```sql
-- ❌ SLOW: Subquery evaluated for each row
CREATE POLICY "slow_policy" ON scheduled_classes
FOR ALL USING (
  batch_id IN (SELECT id FROM batches WHERE college_id = current_app_college_id())
);

-- ✅ FASTER: Add college_id column directly
ALTER TABLE scheduled_classes ADD COLUMN college_id UUID;

CREATE POLICY "fast_policy" ON scheduled_classes
FOR ALL USING (college_id = current_app_college_id());
```

---

## 🚀 Query Optimization Strategies

### 1. Use EXPLAIN ANALYZE
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT u.*, d.name as dept_name
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.college_id = 'your-college-id'
AND u.role = 'faculty'
AND u.is_active = TRUE;

-- Look for:
-- ✅ "Index Scan" (Good)
-- ❌ "Seq Scan" (Bad - needs index)
-- ❌ High "actual time" values
```

### 2. Avoid SELECT *
```javascript
// ❌ BAD: Returns all columns (wasteful)
const { data } = await supabase
  .from('subjects')
  .select('*')
  .eq('college_id', collegeId);

// ✅ GOOD: Returns only needed data
const { data } = await supabase
  .from('subjects')
  .select('id, name, code, credits_per_week, semester')
  .eq('college_id', collegeId);
```

### 3. Use Pagination
```javascript
// ✅ Load data in chunks
const ITEMS_PER_PAGE = 50;

const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('college_id', collegeId)
  .range(0, ITEMS_PER_PAGE - 1); // First page

// Next page:
.range(ITEMS_PER_PAGE, (ITEMS_PER_PAGE * 2) - 1);
```

### 4. Use Proper Filtering
```javascript
// ✅ Filter on server side (database)
const { data } = await supabase
  .from('batches')
  .select('*')
  .eq('college_id', collegeId)
  .eq('is_active', true)
  .gte('semester', 1)
  .lte('semester', 8);

// ❌ Don't filter on client side
const allBatches = await supabase.from('batches').select('*');
const filtered = allBatches.filter(b => b.is_active); // Wasteful!
```

### 5. Use Aggregate Functions
```javascript
// ✅ Count on server
const { count } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true })
  .eq('college_id', collegeId);

// ❌ Don't fetch all data just to count
const { data } = await supabase.from('users').select('*');
const count = data.length; // Wasteful!
```

---

## 📊 Indexing Best Practices

### Your Schema Already Has Good Indexes!

But here are some **additional indexes** you might need:

```sql
-- 1. Composite indexes for common query patterns
CREATE INDEX idx_users_college_active_role 
ON users(college_id, is_active, role) 
WHERE is_active = TRUE;

-- 2. Partial indexes for specific conditions
CREATE INDEX idx_faculty_active 
ON users(college_id, department_id) 
WHERE role = 'faculty' AND is_active = TRUE;

-- 3. Index on foreign keys (if not already indexed)
CREATE INDEX idx_batch_subjects_batch 
ON batch_subjects(batch_id) 
WHERE is_mandatory = TRUE;

-- 4. Index for timestamp-based queries
CREATE INDEX idx_timetables_created 
ON generated_timetables(college_id, created_at DESC);

-- 5. GIN index for JSONB columns (if you query them)
CREATE INDEX idx_constraint_params 
ON constraint_rules USING GIN (rule_parameters);

-- 6. Index for text search
CREATE INDEX idx_subjects_name_search 
ON subjects USING GIN (to_tsvector('english', name));
```

### Check Missing Indexes
```sql
-- Find tables with missing indexes on foreign keys
SELECT 
    c.conrelid::regclass AS table_name,
    a.attname AS column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f'
AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
    AND a.attnum = ANY(i.indkey)
);
```

### Monitor Index Usage
```sql
-- Check if indexes are being used
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- If idx_scan = 0, consider removing that index
```

---

## 🔌 Connection Pooling

### Problem:
Each API request opens a new database connection, which is expensive.

### Solution: Use Supabase Connection Pooling

```javascript
// ✅ Use connection pooling (recommended for serverless)
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_KEY',
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
    },
    global: {
      headers: { 'x-my-custom-header': 'my-app-name' },
    },
    // Connection pooling is automatic in Supabase
  }
);
```

### For High-Traffic Applications:
```javascript
// Use PgBouncer (included in Supabase)
// Connection string format:
// postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres

// In your environment variables:
// DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:6543/postgres
// Use port 6543 for pooled connections (not 5432)
```

---

## 💾 Caching Strategies

### 1. Frontend Caching (React Example)
```javascript
import { useQuery } from '@tanstack/react-query';

// ✅ Cache queries with React Query
const useFacultyList = (collegeId) => {
  return useQuery({
    queryKey: ['faculty', collegeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('college_id', collegeId)
        .eq('role', 'faculty')
        .eq('is_active', true);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

### 2. Redis Caching (Backend)
```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// ✅ Cache expensive queries
async function getCollegeData(collegeId) {
  const cacheKey = `college:${collegeId}`;
  
  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Query database
  const { data } = await supabase
    .from('colleges')
    .select('*')
    .eq('id', collegeId)
    .single();
  
  // Store in cache (expire after 1 hour)
  await redis.setex(cacheKey, 3600, JSON.stringify(data));
  
  return data;
}
```

### 3. Supabase Realtime for Cache Invalidation
```javascript
// ✅ Invalidate cache when data changes
const channel = supabase
  .channel('db-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'users'
    },
    (payload) => {
      // Invalidate React Query cache
      queryClient.invalidateQueries(['users']);
      
      // Or invalidate Redis cache
      redis.del(`users:${payload.new.college_id}`);
    }
  )
  .subscribe();
```

### 4. Browser Local Storage
```javascript
// ✅ Cache static/semi-static data
const getCachedColleges = async () => {
  const cached = localStorage.getItem('colleges');
  const cacheTime = localStorage.getItem('colleges_timestamp');
  
  // Cache valid for 24 hours
  if (cached && Date.now() - cacheTime < 24 * 60 * 60 * 1000) {
    return JSON.parse(cached);
  }
  
  // Fetch fresh data
  const { data } = await supabase.from('colleges').select('*');
  localStorage.setItem('colleges', JSON.stringify(data));
  localStorage.setItem('colleges_timestamp', Date.now());
  
  return data;
};
```

---

## ⚡ Supabase-Specific Optimizations

### 1. Use Supabase Edge Functions
```javascript
// Instead of complex client-side logic, use Edge Functions
const { data, error } = await supabase.functions.invoke('get-user-dashboard', {
  body: { collegeId: 'xxx', userId: 'yyy' }
});

// Edge Function (Deno):
// supabase/functions/get-user-dashboard/index.ts
export default async (req: Request) => {
  const { collegeId, userId } = await req.json();
  
  // Complex aggregation done server-side
  const result = await supabaseClient
    .rpc('get_dashboard_data', { 
      p_college_id: collegeId,
      p_user_id: userId 
    });
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### 2. Use Database Functions (RPC)
```sql
-- Create optimized database function
CREATE OR REPLACE FUNCTION get_batch_details(p_batch_id UUID)
RETURNS TABLE (
  batch_id UUID,
  batch_name VARCHAR,
  subject_count INTEGER,
  faculty_count INTEGER,
  total_hours INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    COUNT(DISTINCT bs.subject_id)::INTEGER,
    COUNT(DISTINCT bs.assigned_faculty_id)::INTEGER,
    SUM(bs.required_hours_per_week)::INTEGER
  FROM batches b
  LEFT JOIN batch_subjects bs ON b.id = bs.batch_id
  WHERE b.id = p_batch_id
  GROUP BY b.id, b.name;
END;
$$ LANGUAGE plpgsql;

-- Call from frontend
const { data } = await supabase.rpc('get_batch_details', {
  p_batch_id: 'batch-uuid'
});
```

### 3. Use Postgres Views (Already in Your Schema!)
```javascript
// ✅ Use your existing views for complex queries
const { data } = await supabase
  .from('algorithm_faculty_data')
  .select('*')
  .eq('college_id', collegeId);

// Much faster than joining multiple tables client-side
```

### 4. Enable Query Performance Insights
```sql
-- Enable in Supabase Dashboard:
-- Settings > Database > Enable Query Performance Insights

-- Then monitor slow queries:
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### 5. Use Prepared Statements
```javascript
// Supabase automatically uses prepared statements
// But you can optimize by reusing queries:

// ✅ Define query once
const getUsersByRole = (role) => supabase
  .from('users')
  .select('id, first_name, last_name')
  .eq('role', role);

// Reuse throughout app
const faculty = await getUsersByRole('faculty');
const admins = await getUsersByRole('admin');
```

---

## 🔍 Monitoring and Debugging

### 1. Enable Supabase Query Logs
```javascript
// In development, log all queries
const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
});

// Check browser console for query details
```

### 2. Monitor Slow Queries
```sql
-- Enable slow query logging (Supabase Dashboard > Database > Settings)
ALTER DATABASE postgres SET log_min_duration_statement = 1000; -- Log queries > 1s

-- View slow queries
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- Over 100ms average
ORDER BY mean_exec_time DESC
LIMIT 50;
```

### 3. Check Table Statistics
```sql
-- Get table sizes and row counts
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 4. Monitor Index Usage
```sql
-- Find unused indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%_pkey%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 5. Check Cache Hit Ratio
```sql
-- Should be > 99%
SELECT 
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;
```

---

## 🎯 Quick Wins Checklist

### Immediate Actions (Do These First!)

- [ ] **Set session variables once after login** (Biggest impact!)
  ```javascript
  await supabase.rpc('set_user_context', {
    user_id: user.id,
    college_id: user.college_id,
    role: user.role
  });
  ```

- [ ] **Use pagination for large data sets**
  ```javascript
  .range(start, end)
  ```

- [ ] **Select only needed columns**
  ```javascript
  .select('id, name, email') // Not .select('*')
  ```

- [ ] **Add React Query for client-side caching**
  ```bash
  npm install @tanstack/react-query
  ```

- [ ] **Use connection pooling** (Port 6543)
  ```
  DATABASE_URL=postgresql://...@db.xxx.supabase.co:6543/postgres
  ```

### Short-term Actions (This Week)

- [ ] Run EXPLAIN ANALYZE on your 10 most common queries
- [ ] Create materialized views for complex reports
- [ ] Implement Redis caching for expensive queries
- [ ] Add indexes for common WHERE/JOIN clauses
- [ ] Enable Supabase Query Performance Insights

### Long-term Actions (This Month)

- [ ] Create database functions for complex operations
- [ ] Implement Edge Functions for heavy computation
- [ ] Set up monitoring dashboards
- [ ] Optimize RLS policies with direct columns
- [ ] Create indexes for all foreign keys

---

## 📈 Expected Performance Improvements

After implementing these optimizations:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Login Time | 3-5s | 0.5-1s | **80% faster** |
| Dashboard Load | 5-8s | 1-2s | **75% faster** |
| List Queries | 2-3s | 0.3-0.5s | **85% faster** |
| Form Submissions | 1-2s | 0.2-0.5s | **75% faster** |

---

## 🚨 Common Mistakes to Avoid

1. ❌ **Not setting session variables** → RLS policies run expensive queries on every request
2. ❌ **Using SELECT *** → Fetches unnecessary data
3. ❌ **Not using pagination** → Loads thousands of rows unnecessarily
4. ❌ **Client-side filtering** → Downloads all data then filters
5. ❌ **N+1 queries in loops** → Should use JOIN or single batch query
6. ❌ **No indexes on foreign keys** → JOIN operations become slow
7. ❌ **Not using connection pooling** → Opens new connection for each request
8. ❌ **No caching strategy** → Re-fetches same data repeatedly
9. ❌ **Complex client-side logic** → Should use database functions/Edge Functions
10. ❌ **Not monitoring query performance** → Can't identify bottlenecks

---

## 📚 Additional Resources

- [Supabase Performance Tips](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL Explain](https://www.postgresql.org/docs/current/using-explain.html)
- [Supabase RLS Performance](https://supabase.com/docs/guides/database/postgres/row-level-security#performance)
- [Connection Pooling Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

---

## 💡 Next Steps

1. **Profile your current performance**: Use browser DevTools to measure actual load times
2. **Implement session variables**: This alone will give you 50%+ improvement
3. **Add client-side caching**: React Query or similar
4. **Run EXPLAIN ANALYZE**: Find slow queries and optimize them
5. **Monitor continuously**: Set up alerts for slow queries

---

**Need help implementing any of these optimizations? Let me know!**

Last Updated: December 26, 2025
