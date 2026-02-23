# Rate Limiting Implementation Plan 🛡️

## 🎯 Objective
Implement a robust rate limiting system using **Next.js Middleware** and **Redis** to protect the application from abuse, brute-force attacks, and resource exhaustion.

---

## 🔍 Critical API Analysis & Limits

Based on the project structure, here are the identified critical APIs and their recommended limits:

### 1. 🚨 High Risk (Authentication & Security)
*Protect against brute-force attacks and spam.*

| API Route | Risk | Recommended Limit | Window |
|-----------|------|-------------------|--------|
| **`/api/auth/login`** | Brute Force | **5 attempts** | 1 minute |
| **`/api/admin/login`** | Admin Compromise | **5 attempts** | 1 minute |
| **`/api/auth/register`** | Spam Accounts | **3 accounts** | 1 hour |
| **`/api/auth/forgot-password`** | Email Bombing | **3 requests** | 1 hour |
| **`/api/college/register`** | Fake Registrations | **2 requests** | 24 hours |

### 2. 🤖 High Cost (AI & Compute)
*Protect expensive resources and database load.*

| API Route | Cost Factor | Recommended Limit | Window |
|-----------|-------------|-------------------|--------|
| **`/api/ai-timetable/generate`** | AI/LLM Cost | **5 generations** | 1 hour |
| **`/api/admin/subject-allotment/run`** | Heavy Calculation | **3 runs** | 1 hour |

### 3. 🌐 Standard APIs (General Usage)
*Prevent scraping and general abuse.*

| API Route | Recommended Limit | Window |
|-----------|-------------------|--------|
| **`/api/nep/*`** (Student actions) | **100 requests** | 1 minute |
| **`/api/admin/*`** (Authenticated) | **300 requests** | 1 minute |
| **Global Fallback** | **120 requests** | 1 minute |

---

## 📝 Implementation TODOs

### Phase 1: Infrastructure Setup
- [ ] **Create RateLimit Service** (`src/shared/rate-limit/RateLimitService.ts`)
    - [ ] Implement `check(key, limit, window)` function using Redis `INCR` and `EXPIRE`.
    - [ ] Add fallback to in-memory store if Redis is unavailable.
    - [ ] Helper method `getIp(request)` to reliably extract user IP.

### Phase 2: Middleware Logic (`src/middleware.ts`)
- [ ] **Initialize Middleware**
    - [ ] Import `RateLimitService`.
    - [ ] Match all `/api/*` routes.
- [ ] **Implement Route Matching**
    - [ ] Create a configuration object mapping paths to limits.
    - [ ] Example:
      ```typescript
      const RATELIMIT_RULES = {
        '/api/auth/login': { limit: 5, window: 60 },
        '/api/ai-timetable/generate': { limit: 5, window: 3600 },
        // ...
      };
      ```
- [ ] **Apply Logic**
    - [ ] Extract path and IP/User ID.
    - [ ] Check against rules.
    - [ ] Return `429 Too Many Requests` response if limit exceeded.
    - [ ] Return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers.

### Phase 3: Client Handling
- [ ] **Update Frontend Clients**
    - [ ] Handle `429` status in API wrappers (`axios` / `fetch`).
    - [ ] specific handling for Login page: Show "Too many attempts, please try again in X minutes".

### Phase 4: Testing & Verification
- [ ] **Unit Tests**: Test `RateLimitService` logic (mock Redis).
- [ ] **Integration Tests**: Hit `/api/auth/login` 6 times and verify 6th request fails.
- [ ] **Verify Fallback**: Ensure app still works (open mode) if Redis goes down.

---

## 💡 Key Design Decisions

1.  **Identification Strategy**:
    *   **Unauthenticated Routes** (Login/Register): Use **IP Address**.
    *   **Authenticated Routes**: Use **User ID** (from JWT/Session) to prevent one user from blocking an entire office IP.

2.  **Storage**:
    *   **Redis** (Primary): Uses atomic increments.
    *   **Memory** (Fallback): Uses `Map<IP, { count, expires }>` for resilience.

3.  **Bypass**:
    *   Allow bypass for specific internal IPs or "Super Admin" tokens if necessary (use with caution).
