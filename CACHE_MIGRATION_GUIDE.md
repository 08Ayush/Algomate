# Redis Cache-Aside Implementation Guide

This document summarizes the complete caching infrastructure implemented for the Academic Compass project.

## 1. Core Architecture
The system uses a **Cache-Aside (Lazy Loading)** strategy:
1. **Read**: Check Redis. If HIT, return. If MISS, fetch from DB, save to Redis, then return.
2. **Write**: Perform DB operation, then immediately **Evict (Delete)** the relevant Redis keys to ensure consistency.

## 2. Infrastructure Files
- **Service**: `src/modules/shared/services/redis-cache.ts`
  - Handles singleton connection to Upstash Redis.
  - Implements "Soft-fail": If Redis is down, the app continues working via direct DB access.
  - Implements "Fast-fail": Prevents connection timeouts if credentials are missing in `.env`.
- **Utility**: `src/modules/shared/utils/cache-helper.ts`
  - `withCacheAside()`: A high-level wrapper used in API routes.
  - `invalidateCache()`: Helper to clear specific keys.

## 3. Integrated API Routes
The following endpoints now have full caching and auto-invalidation:
- `/api/admin/students` (GET: Cached, POST: Invalidates list)
- `/api/admin/departments` (GET: Cached, POST: Invalidates list)
- `/api/admin/faculty` (GET: Cached, POST: Invalidates both 'all' and department-specific lists)

## 4. Required Environment Variables
Add these to your `.env` file for any branch using this feature:
```env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

## 5. Testing & Verification
- **Quick Check**: `node scripts/verify-redis.js`
- **Performance Test**: `node scripts/test-cache.js`

## 6. Security & Stability
- Handlers now use a safe Base64 decoder that returns 401 instead of crashing (500) on invalid tokens.
- All API responses are standardized with a `success: boolean` flag for consistent type handling.
