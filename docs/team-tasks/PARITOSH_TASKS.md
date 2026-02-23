# 🔁 Paritosh - Backend + Database Integration Specialist

## 🎯 Role: Integration Specialist (Infrastructure Glue & Async Systems)

### Primary Ownership
**Infrastructure Glue & Asynchronous Systems**

---

## ✅ Phase 1-2 Critical Components

### 1. Rate Limiting & Throttling
**Priority: CRITICAL | Timeline: Week 1** ✅ COMPLETED

- [x] **Redis-Based Rate Limiter**
  - [x] Implemented in-memory rate limiting (development)
  - [ ] Add Redis adapter for production scale
  - [ ] Implement sliding window algorithm
  - [ ] Add distributed rate limiting

- [ ] **IP + User-Based Throttling**
  - [ ] Implement IP-based limits
  - [ ] Add authenticated user limits
  - [ ] Create admin bypass mechanism
  - [ ] Add rate limit headers to responses

- [ ] **Configuration & Rules**
  - [ ] Externalize rate limit config
  - [ ] Add per-endpoint customization
  - [ ] Implement burst allowance
  - [ ] Create rate limit dashboard API

**Files:**
- ✅ `src/shared/rate-limit/RateLimitService.ts`
- ✅ `src/shared/rate-limit/middleware.ts`
- [ ] `src/shared/rate-limit/redis-adapter.ts` (TODO)

---

### 2. Caching Layer
**Priority: HIGH | Timeline: Week 1-2**

- [ ] **Redis Query Caching**
  - [ ] Set up Redis connection
  - [ ] Implement cache-aside pattern
  - [ ] Add TTL configuration
  - [ ] Create cache invalidation strategies

- [ ] **Response Caching**
  - [ ] Identify heavy endpoints for caching
  - [ ] Implement HTTP cache headers
  - [ ] Add ETag support
  - [ ] Create cache warming scripts

- [ ] **Cache Management**
  - [ ] Build cache key generator
  - [ ] Implement cache statistics
  - [ ] Add manual cache clear API
  - [ ] Monitor cache hit/miss rates

**Files to Create:**
- [ ] `src/shared/cache/RedisCache.ts`
- [ ] `src/shared/cache/CacheManager.ts`
- [ ] `src/shared/cache/decorators.ts`
- [ ] `src/middleware/cache-response.ts`

---

### 3. Background Job Queue
**Priority: HIGH | Timeline: Week 2-3**

- [ ] **Bull/BullMQ Setup**
  - [ ] Install and configure BullMQ
  - [ ] Set up Redis for queue backend
  - [ ] Create queue connection manager
  - [ ] Implement queue monitoring

- [ ] **Email/SMS Async Workers**
  - [ ] Create email job processor
  - [ ] Implement SMS job processor
  - [ ] Add notification batching
  - [ ] Set up job scheduling

- [ ] **Retry + Dead Letter Queues**
  - [ ] Configure retry strategies
  - [ ] Implement exponential backoff
  - [ ] Set up dead letter queue
  - [ ] Create manual retry interface

**Files to Create:**
- [ ] `src/jobs/queue.ts`
- [ ] `src/jobs/workers/email-worker.ts`
- [ ] `src/jobs/workers/sms-worker.ts`
- [ ] `src/jobs/processors/index.ts`

---

## 📋 Medium-Term Features

### 4. Scheduled Tasks / Cron Jobs
**Priority: MEDIUM | Timeline: Week 3**

- [ ] Implement cron job scheduler
- [ ] Create daily report generation
- [ ] Add cleanup jobs (old logs, temp files)
- [ ] Build health check for scheduled tasks

### 5. Search Infrastructure Integration
**Priority: MEDIUM | Timeline: Week 4**

- [ ] Evaluate Meilisearch vs Elasticsearch
- [ ] Set up search index sync
- [ ] Implement full-text search API
- [ ] Create search result ranking

### 6. WebSocket Infrastructure Support
**Priority: LOW | Timeline: Week 4**

- [ ] Design WebSocket architecture
- [ ] Implement Socket.io server
- [ ] Create connection pooling
- [ ] Add real-time event broadcasting

---

## 📦 Deliverables

### Infrastructure
- [ ] `infra/redis.ts` - Redis client and utilities
- [ ] `infra/queue-config.ts` - Queue configuration
- [ ] `infra/cache-config.ts` - Cache policies

### Job System
- [ ] `jobs/queue.ts` - Queue manager
- [ ] `jobs/workers/*` - All worker implementations
- [ ] `jobs/index.ts` - Job registration

### Middleware
- [ ] Caching middleware
- [ ] Rate limiting (Redis-backed)
- [ ] Request queuing middleware

### Documentation
- [ ] `docs/infra/redis-setup.md`
- [ ] `docs/infra/job-queue-guide.md`
- [ ] `docs/infra/caching-strategy.md`

---

## 🔗 Dependencies & Collaboration

### Works Closely With:
- **Ayush**: Query caching strategies, Redis performance
- **Mayur**: Middleware integration, monitoring hooks

### Needs Approval From:
- **Mayur**: Infrastructure decisions, new dependencies

### Blocks:
- **Gargi/Radhika**: Real-time features depend on WebSocket setup

---

## 📊 Success Metrics

- [ ] Redis uptime > 99.9%
- [ ] 80%+ cache hit rate on heavy endpoints
- [ ] All background jobs processed within SLA
- [ ] Zero job lost in queue
- [ ] Rate limiting prevents abuse (< 1% false positives)

---

## 🛠️ Tools & Resources

### Required Packages
```bash
npm install ioredis bullmq @socket.io/redis-adapter
npm install -D @types/ioredis
```

### Services to Configure
- **Redis** (Upstash or self-hosted)
- **BullMQ Dashboard** (for job monitoring)

---

## ⚠️ Critical Rules

1. ✅ **Always use connection pooling** for Redis
2. ✅ **Set TTL on all cached data**
3. ✅ **Monitor queue depths** (alert if > 1000)
4. ❌ **Never block main thread** with sync operations
5. ✅ **Log all job failures** for debugging

---

## 🚀 Quick Start Commands

### Start Redis Locally
```bash
docker run -d -p 6379:6379 redis:alpine
```

### Create First Job
```typescript
// Example structure
import { Queue } from 'bullmq';

export const emailQueue = new Queue('emails', {
  connection: redisConnection
});
```

### Test Rate Limiting
```bash
# Should get 429 after 5 requests
for i in {1..10}; do curl http://localhost:3000/api/auth/login; done
```
