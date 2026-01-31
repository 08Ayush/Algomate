# Enhanced Rate Limiting Configuration

> **Project:** Academic Compass - API Rate Limiting Enhancement  
> **Version:** 1.0.0  
> **Created:** January 28, 2026  
> **Estimated Timeline:** 1-2 Hours  
> **Priority:** Medium  
> **Status:** Pending

---

## Table of Contents

1. [Overview](#overview)
2. [Current Status](#current-status)
3. [Objectives](#objectives)
4. [Endpoints Requiring Custom Limits](#endpoints-requiring-custom-limits)
5. [Implementation Steps](#implementation-steps)
6. [Testing Checklist](#testing-checklist)
7. [Documentation Updates](#documentation-updates)
8. [Acceptance Criteria](#acceptance-criteria)

---

## Overview

Rate limiting is **already implemented globally** for all 125+ API endpoints through centralized middleware. However, certain endpoints require **custom rate limit configurations** based on:

- **Resource Intensity** - Computational/memory usage
- **Security Sensitivity** - Authentication, registration, password reset
- **Operational Impact** - Bulk operations, email sending
- **Usage Patterns** - High-frequency polling vs. occasional requests

### Current Architecture

```
┌─────────────────┐
│  Next.js API    │
│   Request       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   Middleware (src/middleware.ts)    │
│   ├─ Rate Limit Check (FIRST)       │
│   └─ Auth Check (if rate OK)        │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Rate Limit Middleware              │
│  (src/shared/rate-limit/middleware) │
│  ├─ Pattern Matching                │
│  ├─ IP-based Tracking               │
│  └─ Sliding Window Algorithm        │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Rate Limit Service                 │
│  (In-Memory Storage)                │
│  └─ Timestamp-based Counting        │
└─────────────────────────────────────┘
```

---

## Current Status

### ✅ Already Implemented

| Endpoint Pattern | Limit | Window | Status |
|-----------------|-------|--------|--------|
| `/api/auth/login` | 5 req | 60s | ✅ Active |
| `/api/auth/register` | 5 req | 60s | ✅ Active |
| `/api/ai-timetable/generate` | 5 req | 3600s | ✅ Active |
| `/api/**` (default) | 300 req | 60s | ✅ Active |

### 📊 Coverage Statistics

- **Total API Endpoints:** 125+
- **Protected Endpoints:** 125+ (100%)
- **Custom Configurations:** 3
- **Pending Custom Configs:** 11

---

## Objectives

1. ✅ Add custom rate limits for resource-intensive operations
2. ✅ Enhance security for authentication endpoints
3. ✅ Optimize limits for bulk operations
4. ✅ Allow higher limits for polling endpoints
5. ✅ Add descriptive logging for better monitoring
6. ✅ Document rate limits for API consumers

---

## Endpoints Requiring Custom Limits

### 🔴 Critical Priority - Resource Intensive

**Impact:** High CPU/Memory usage, spawns processes, runs complex algorithms

| Endpoint | Current | Recommended | Reason |
|----------|---------|-------------|--------|
| `/api/scheduler/generate` | 300/min | **3/hour** | Spawns Python process, runs CP-SAT + GA algorithms |
| `/api/ai-timetable/generate` | ✅ 5/hour | 5/hour | Already configured correctly |
| `/api/nep-scheduler` | 300/min | **5/hour** | Complex NEP 2020 scheduling algorithm |
| `/api/hybrid-timetable/generate` | 300/min | **5/hour** | Multi-algorithm hybrid generation |

**Files:**
- `src/app/api/scheduler/generate/route.ts`
- `src/app/api/ai-timetable/generate/route.ts`
- `src/app/api/nep-scheduler/route.ts`
- `src/app/api/hybrid-timetable/*/route.ts`

---

### 🟡 High Priority - Security Sensitive

**Impact:** Prevent brute force attacks, email spam, unauthorized access

| Endpoint | Current | Recommended | Reason |
|----------|---------|-------------|--------|
| `/api/auth/login` | ✅ 5/min | 5/min | Already configured |
| `/api/auth/register` | ✅ 5/min | 5/min | Already configured |
| `/api/auth/forgot-password` | 300/min | **3/hour** | Prevent password reset spam |
| `/api/admin/login` | 300/min | **5/5min** | Admin accounts need stricter protection |
| `/api/college/register` | 300/min | **3/hour** | Prevent spam college registrations |
| `/api/college/send-credentials` | 300/min | **5/hour** | Email sending operation |
| `/api/email/*` | 300/min | **10/hour** | All email operations |

**Files:**
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/admin/login/route.ts`
- `src/app/api/college/register/route.ts`
- `src/app/api/college/send-credentials/route.ts`
- `src/app/api/email/*/route.ts`

---

### 🟢 Medium Priority - Bulk Operations

**Impact:** Database-intensive operations processing multiple records

| Endpoint | Current | Recommended | Reason |
|----------|---------|-------------|--------|
| `/api/admin/students/batch-enrollment` | 300/min | **20/min** | Loops through multiple students |
| `/api/admin/subject-allotment/*` | 300/min | **20/min** | Bulk subject assignments |
| `/api/admin/allotment/(complete\|convert)` | 300/min | **10/min** | Complex database transactions |

**Files:**
- `src/app/api/admin/students/batch-enrollment/route.ts`
- `src/app/api/admin/subject-allotment/*/route.ts`
- `src/app/api/admin/allotment/complete/route.ts`
- `src/app/api/admin/allotment/convert/route.ts`

---

### 🔵 Low Priority - High-Frequency Reads

**Impact:** Frequently polled by frontend, need permissive limits

| Endpoint | Current | Recommended | Reason |
|----------|---------|-------------|--------|
| `/api/scheduler/status/*` | 300/min | **120/min** | Polled every 500ms during generation (2 req/sec) |
| `/api/notifications` | 300/min | **150/min** | Checked frequently by users |
| `/api/dashboard/*` | 300/min | **100/min** | Dashboard auto-refresh |
| `/api/admin/stats` | 300/min | **100/min** | Stats page refresh |

**Files:**
- `src/app/api/scheduler/status/[taskId]/route.ts`
- `src/app/api/notifications/*/route.ts`
- `src/app/api/dashboard/*/route.ts`
- `src/app/api/admin/stats/route.ts`

---

## Implementation Steps

### Step 1: Update Rate Limit Configuration

**File:** `src/shared/rate-limit/middleware.ts`

**Action:** Replace the `RATELIMIT_RULES` array with the enhanced configuration below.

**⚠️ Important:** Rules are matched in order from top to bottom. Most specific patterns must come first!

```typescript
// Rate Limit Configuration Rules
const RATELIMIT_RULES = [
  // ========================================
  // 🔴 CRITICAL - Resource Intensive
  // ========================================
  {
    pattern: /^\/api\/scheduler\/generate/,
    limit: 3,
    window: 3600, // 3 requests per hour
    description: 'Timetable generation (CP-SAT + GA)'
  },
  {
    pattern: /^\/api\/ai-timetable\/generate/,
    limit: 5,
    window: 3600, // 5 requests per hour
    description: 'AI timetable generation'
  },
  {
    pattern: /^\/api\/nep-scheduler/,
    limit: 5,
    window: 3600, // 5 requests per hour
    description: 'NEP 2020 scheduler'
  },
  {
    pattern: /^\/api\/hybrid-timetable\/generate/,
    limit: 5,
    window: 3600, // 5 requests per hour
    description: 'Hybrid timetable generation'
  },

  // ========================================
  // 🟡 HIGH - Security Sensitive
  // ========================================
  {
    pattern: /^\/api\/auth\/forgot-password/,
    limit: 3,
    window: 3600, // 3 requests per hour
    description: 'Password reset (prevent spam)'
  },
  {
    pattern: /^\/api\/admin\/login/,
    limit: 5,
    window: 300, // 5 requests per 5 minutes
    description: 'Admin login (stricter than regular)'
  },
  {
    pattern: /^\/api\/auth\/login/,
    limit: 5,
    window: 60, // 5 requests per minute
    description: 'User login'
  },
  {
    pattern: /^\/api\/auth\/register/,
    limit: 5,
    window: 60, // 5 requests per minute
    description: 'User registration'
  },
  {
    pattern: /^\/api\/college\/register/,
    limit: 3,
    window: 3600, // 3 requests per hour
    description: 'College registration'
  },
  {
    pattern: /^\/api\/college\/send-credentials/,
    limit: 5,
    window: 3600, // 5 requests per hour
    description: 'Send credentials email'
  },
  {
    pattern: /^\/api\/email/,
    limit: 10,
    window: 3600, // 10 requests per hour
    description: 'Email sending operations'
  },

  // ========================================
  // 🟢 MEDIUM - Bulk Operations
  // ========================================
  {
    pattern: /^\/api\/admin\/students\/batch-enrollment/,
    limit: 20,
    window: 60, // 20 requests per minute
    description: 'Bulk student enrollment'
  },
  {
    pattern: /^\/api\/admin\/subject-allotment/,
    limit: 20,
    window: 60, // 20 requests per minute
    description: 'Subject allotment operations'
  },
  {
    pattern: /^\/api\/admin\/allotment\/(complete|convert)/,
    limit: 10,
    window: 60, // 10 requests per minute
    description: 'Allotment finalization'
  },

  // ========================================
  // 🔵 LOW - High-Frequency Reads
  // ========================================
  {
    pattern: /^\/api\/scheduler\/status/,
    limit: 120,
    window: 60, // 120 requests per minute (2/sec)
    description: 'Scheduler status polling'
  },
  {
    pattern: /^\/api\/notifications/,
    limit: 150,
    window: 60, // 150 requests per minute
    description: 'Notifications polling'
  },
  {
    pattern: /^\/api\/dashboard/,
    limit: 100,
    window: 60, // 100 requests per minute
    description: 'Dashboard data refresh'
  },
  {
    pattern: /^\/api\/admin\/stats/,
    limit: 100,
    window: 60, // 100 requests per minute
    description: 'Admin statistics'
  },

  // ========================================
  // DEFAULT - All Other APIs
  // ========================================
  {
    pattern: /^\/api\//,
    limit: 300,
    window: 60, // 300 requests per minute
    description: 'Default API limit'
  }
];
```

---

### Step 2: Enhanced Logging (Optional but Recommended)

**File:** `src/shared/rate-limit/middleware.ts`

**Action:** Update the rate limit violation logging to include the rule description.

**Find this section (around line 48-64):**

```typescript
if (!result.allowed) {
    return new NextResponse(
        JSON.stringify({
            error: 'Too Many Requests',
            message: `Please try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': rule.limit.toString(),
                'X-RateLimit-Remaining': '0',
                'Retry-After': Math.ceil(result.msBeforeNext / 1000).toString()
            }
        }
    );
}
```

**Replace with:**

```typescript
if (!result.allowed) {
    // Enhanced logging
    console.warn(`⚠️ Rate limit exceeded`, {
        ip,
        path,
        rule: rule.description || 'Unknown',
        limit: rule.limit,
        window: rule.window,
        retryAfter: Math.ceil(result.msBeforeNext / 1000)
    });

    return new NextResponse(
        JSON.stringify({
            error: 'Too Many Requests',
            message: `Please try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`,
            limit: rule.limit,
            window: rule.window
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': rule.limit.toString(),
                'X-RateLimit-Remaining': '0',
                'Retry-After': Math.ceil(result.msBeforeNext / 1000).toString()
            }
        }
    );
}
```

---

## Testing Checklist

### Manual Testing

Test each category to ensure rate limits are working correctly:

#### 🔴 Critical - Resource Intensive

- [ ] **Scheduler Generation**
  ```bash
  # Should block after 3 requests in 1 hour
  curl -X POST http://localhost:3000/api/scheduler/generate \
    -H "Content-Type: application/json" \
    -d '{"batchId":"test","collegeId":"test"}' \
    -i
  # Repeat 4 times, 4th should return 429
  ```

- [ ] **NEP Scheduler**
  ```bash
  # Should block after 5 requests in 1 hour
  # Test similarly to above
  ```

#### 🟡 High - Security Sensitive

- [ ] **Forgot Password**
  ```bash
  # Should block after 3 requests in 1 hour
  for i in {1..4}; do
    curl -X POST http://localhost:3000/api/auth/forgot-password \
      -H "Content-Type: application/json" \
      -d '{"email":"test@test.com"}' \
      -i
    sleep 1
  done
  # 4th request should return 429
  ```

- [ ] **Admin Login**
  ```bash
  # Should block after 5 requests in 5 minutes
  for i in {1..6}; do
    curl -X POST http://localhost:3000/api/admin/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@test.com","password":"test"}' \
      -i
    sleep 1
  done
  # 6th request should return 429
  ```

#### 🟢 Medium - Bulk Operations

- [ ] **Batch Enrollment**
  ```bash
  # Should block after 20 requests in 1 minute
  # Test with rapid requests
  ```

#### 🔵 Low - High-Frequency Reads

- [ ] **Scheduler Status**
  ```bash
  # Should allow 120 requests in 1 minute (2/sec)
  for i in {1..125}; do
    curl http://localhost:3000/api/scheduler/status/test-id -i
    sleep 0.5
  done
  # Should succeed for first 120, then 429
  ```

### Verify Response Headers

For any rate-limited request, verify these headers are present:

- [ ] `X-RateLimit-Limit` - Shows the limit
- [ ] `X-RateLimit-Remaining` - Shows remaining requests
- [ ] `Retry-After` - Shows seconds to wait (on 429)

### Production Testing

⚠️ **Important:** Rate limiting is **disabled in development mode**. To test:

1. Temporarily comment out the dev check in `src/middleware.ts`:
   ```typescript
   // if (process.env.NODE_ENV === 'development') {
   //     return NextResponse.next();
   // }
   ```

2. Run tests

3. **Restore the dev check** before committing

---

## Documentation Updates

### Update API Documentation

Add a new section to your API documentation (README.md or API_DOCS.md):

```markdown
## Rate Limits

All API endpoints are rate-limited to prevent abuse and ensure fair usage. Rate limits vary by endpoint based on resource intensity and security requirements.

### Rate Limit Categories

| Category | Limit | Window | Examples |
|----------|-------|--------|----------|
| **Timetable Generation** | 3-5 requests | 1 hour | Scheduler, AI generation |
| **Authentication** | 5 requests | 1 minute | Login, register |
| **Password Reset** | 3 requests | 1 hour | Forgot password |
| **Email Operations** | 5-10 requests | 1 hour | Send credentials, notifications |
| **Bulk Operations** | 10-20 requests | 1 minute | Batch enrollment, allotment |
| **Status Polling** | 120 requests | 1 minute | Scheduler status (2/sec) |
| **Dashboard/Stats** | 100-150 requests | 1 minute | Dashboard, notifications |
| **General API** | 300 requests | 1 minute | All other endpoints |

### Response Headers

All API responses include rate limit information:

- `X-RateLimit-Limit`: Maximum requests allowed in the current window
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `Retry-After`: Seconds to wait before retry (only on 429 responses)

### Rate Limit Exceeded (429)

When you exceed the rate limit, you'll receive:

```json
{
  "error": "Too Many Requests",
  "message": "Please try again in 45 seconds.",
  "limit": 5,
  "window": 60
}
```

**HTTP Status:** 429 Too Many Requests  
**Retry-After Header:** Number of seconds to wait

### Best Practices

1. **Respect the limits** - Check `X-RateLimit-Remaining` header
2. **Implement exponential backoff** - Don't retry immediately on 429
3. **Cache responses** - Reduce unnecessary API calls
4. **Use webhooks** - Instead of polling when possible
```

---

## Acceptance Criteria

- [ ] All 14 endpoint patterns have custom rate limits configured
- [ ] Rules are ordered by specificity (most specific first)
- [ ] Enhanced logging shows which rule triggered the limit
- [ ] All manual tests pass successfully
- [ ] Response headers include rate limit information
- [ ] API documentation updated with rate limit information
- [ ] No performance degradation observed
- [ ] Development mode bypass still works
- [ ] Code committed and pushed to repository

---

## Notes & Considerations

### Development vs Production

- **Development Mode:** Rate limiting is **completely disabled** when `NODE_ENV=development`
- **Production Mode:** All rate limits are **fully active**
- **Testing:** Temporarily disable the dev check to test locally

### Storage Limitations

- **Current:** In-memory storage (Map-based)
- **Limitation:** Doesn't work across multiple server instances
- **Future:** Consider Redis for production scaling

### Monitoring Recommendations

1. **Add metrics tracking** - Count rate limit violations
2. **Alert on patterns** - Detect potential abuse
3. **Dashboard** - Visualize rate limit usage
4. **Logs** - Enhanced logging already included in Step 2

### User Experience

Ensure frontend handles rate limits gracefully:

```typescript
// Example frontend handling
async function apiCall() {
  try {
    const response = await fetch('/api/endpoint');
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const data = await response.json();
      
      // Show user-friendly message
      toast.error(`Too many requests. Please wait ${retryAfter} seconds.`);
      
      // Optionally retry after delay
      setTimeout(() => apiCall(), retryAfter * 1000);
    }
  } catch (error) {
    // Handle error
  }
}
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Main Next.js middleware (calls rate limit middleware) |
| `src/shared/rate-limit/middleware.ts` | Rate limit configuration and logic |
| `src/shared/rate-limit/RateLimitService.ts` | In-memory rate limit tracking service |
| `RATE_LIMIT_AUDIT_REPORT.md` | Comprehensive audit report |
| `RATE_LIMIT_QUICK_REFERENCE.md` | Quick reference guide |

---

## Future Enhancements (Out of Scope)

These improvements can be considered for future iterations:

1. **User-Based Rate Limiting**
   - Different limits for students, faculty, admins
   - Authenticated users get higher limits

2. **Redis Integration**
   - Shared state across multiple servers
   - Better for production scaling

3. **Dynamic Rate Limiting**
   - Adjust limits based on server load
   - Burst allowance for short spikes

4. **Analytics Dashboard**
   - Track which endpoints hit limits most
   - Identify abuse patterns

5. **IP Whitelist/Blacklist**
   - Whitelist monitoring services
   - Auto-blacklist abusive IPs

---

**End of Task Document**
