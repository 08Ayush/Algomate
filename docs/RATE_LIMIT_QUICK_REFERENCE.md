# Rate Limit Quick Reference

## Endpoints Needing Custom Rate Limits

### 🔴 Critical (Resource Intensive)
| Endpoint | Current | Recommended | Reason |
|----------|---------|-------------|--------|
| `/api/scheduler/generate` | 300/min | **3/hour** | Spawns Python, runs CP-SAT + GA |
| `/api/ai-timetable/generate` | ✅ 5/hour | 5/hour | Already configured |
| `/api/nep-scheduler` | 300/min | **5/hour** | Complex NEP scheduling |
| `/api/hybrid-timetable/generate` | 300/min | **5/hour** | Multi-algorithm generation |

### 🟡 High Priority (Security)
| Endpoint | Current | Recommended | Reason |
|----------|---------|-------------|--------|
| `/api/auth/login` | ✅ 5/min | 5/min | Already configured |
| `/api/auth/register` | ✅ 5/min | 5/min | Already configured |
| `/api/auth/forgot-password` | 300/min | **3/hour** | Prevent email spam |
| `/api/admin/login` | 300/min | **5/5min** | Admin account protection |
| `/api/college/register` | 300/min | **3/hour** | Prevent spam registrations |
| `/api/college/send-credentials` | 300/min | **5/hour** | Email sending |
| `/api/email/*` | 300/min | **10/hour** | Email operations |

### 🟢 Medium Priority (Bulk Ops)
| Endpoint | Current | Recommended | Reason |
|----------|---------|-------------|--------|
| `/api/admin/students/batch-enrollment` | 300/min | **20/min** | Bulk student processing |
| `/api/admin/subject-allotment/*` | 300/min | **20/min** | Bulk DB operations |
| `/api/admin/allotment/(complete\|convert)` | 300/min | **10/min** | Complex transactions |

### 🔵 Low Priority (High-Frequency Reads)
| Endpoint | Current | Recommended | Reason |
|----------|---------|-------------|--------|
| `/api/scheduler/status/*` | 300/min | **120/min** | Status polling (2/sec) |
| `/api/notifications` | 300/min | **150/min** | Frequent checks |
| `/api/dashboard/*` | 300/min | **100/min** | Dashboard refresh |
| `/api/admin/stats` | 300/min | **100/min** | Stats refresh |

---

## Summary

- **Total Endpoints Analyzed:** 125+
- **Already Protected:** 100% (global default: 300/min)
- **Need Custom Limits:** 14 endpoint patterns
- **Already Configured:** 3 (login, register, ai-timetable)
- **Need Configuration:** 11 endpoint patterns

## Quick Implementation

Add these rules to `src/shared/rate-limit/middleware.ts` in the `RATELIMIT_RULES` array (before the default `/^\/api\//` rule):

```typescript
// Critical - Resource Intensive
{ pattern: /^\/api\/scheduler\/generate/, limit: 3, window: 3600 },
{ pattern: /^\/api\/nep-scheduler/, limit: 5, window: 3600 },
{ pattern: /^\/api\/hybrid-timetable\/generate/, limit: 5, window: 3600 },

// Security Sensitive
{ pattern: /^\/api\/auth\/forgot-password/, limit: 3, window: 3600 },
{ pattern: /^\/api\/admin\/login/, limit: 5, window: 300 },
{ pattern: /^\/api\/college\/register/, limit: 3, window: 3600 },
{ pattern: /^\/api\/college\/send-credentials/, limit: 5, window: 3600 },
{ pattern: /^\/api\/email/, limit: 10, window: 3600 },

// Bulk Operations
{ pattern: /^\/api\/admin\/students\/batch-enrollment/, limit: 20, window: 60 },
{ pattern: /^\/api\/admin\/subject-allotment/, limit: 20, window: 60 },
{ pattern: /^\/api\/admin\/allotment\/(complete|convert)/, limit: 10, window: 60 },

// High-Frequency Reads
{ pattern: /^\/api\/scheduler\/status/, limit: 120, window: 60 },
{ pattern: /^\/api\/notifications/, limit: 150, window: 60 },
{ pattern: /^\/api\/dashboard/, limit: 100, window: 60 },
{ pattern: /^\/api\/admin\/stats/, limit: 100, window: 60 },
```

**Note:** Order matters! Place these BEFORE the default `/^\/api\//` rule.
