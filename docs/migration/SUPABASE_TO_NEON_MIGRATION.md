# Supabase → Neon PostgreSQL Migration

> **Status**: ✅ Complete  
> **Completed**: March 2026  
> **Next.js Version**: 15.5.4 (Turbopack)

---

## Overview

This document tracks all changes made when migrating the Academic Compass backend from **Supabase** (hosted PostgreSQL + BaaS) to **Neon** (serverless PostgreSQL). The application retains all existing data and schemas; only the database client, connection layer, and runtime configuration were changed.

---

## Database

| Property | Before | After |
|----------|--------|-------|
| Provider | Supabase (PostgreSQL 15) | Neon (PostgreSQL 17) |
| Region | — | Singapore (`ap-southeast-1`) |
| Host | `*.supabase.co` | `ep-fragrant-moon-a1mb9u32-pooler.ap-southeast-1.aws.neon.tech` |
| Database | `postgres` | `neondb` |
| Tables migrated | 55 | 55 |
| Rows migrated | ~2,500 | ~2,500 |
| SSL | Required | Required (`sslmode=require&channel_binding=require`) |

---

## Environment Variables

### `.env` — Variables Changed

```env
# ❌ REMOVED (commented out)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...

# ✅ ADDED
DATABASE_URL=postgresql://neondb_owner:<password>@ep-fragrant-moon-a1mb9u32-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

---

## NPM Package Changes

### Uninstalled
```
@supabase/supabase-js
@supabase/ssr
```

### Installed
```
@neondatabase/serverless
pg
@types/pg
```

---

## New / Rewritten Source Files

### `src/lib/neon-supabase-compat.ts` *(NEW)*
Drop-in shim that translates the Supabase fluent query API (`.from().select().eq()...`) into `pg.Pool` queries. This allowed all 170+ files that used `supabase.from(...)` to continue working without individual rewrites.

Key exports:
- `class NeonClient` — mimics `SupabaseClient` with `.from()`, `.rpc()`, `.storage`, `.auth`
- `createClient(url, key)` — factory matching Supabase's API signature
- `QueryBuilder` — chainable fluent builder translating to parameterized SQL

### `src/lib/db.ts` *(NEW)*
Central `pg.Pool` singleton with connection pooling configuration for Neon.

```typescript
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

### `src/shared/database/client.ts` *(REWRITTEN)*
Replaced Supabase imports with `NeonClient` instances:
- `db` — browser-safe client (uses anon key equivalent)
- `serviceDb` — server-side client (elevated permissions)
- `supabase` — re-exported alias for backward compatibility
- `supabaseAdmin` — re-exported alias for backward compatibility

### `src/shared/database/browser.ts` *(FIXED)*
Updated to use `NeonClient` instead of `createBrowserClient` from `@supabase/ssr`.

### `src/shared/database/server.ts` *(FIXED)*
Updated to use `NeonClient` instead of `createServerClient` from `@supabase/ssr`.

### `src/shared/database/repository.base.ts` *(FIXED)*
Updated base repository class to use `NeonClient` type instead of `SupabaseClient`.

---

## Realtime Hooks — Stubbed

Supabase Realtime is not available on Neon. The following hooks were stubbed with a `RealtimeChannel` type alias and their subscription logic removed. Components using them continue to compile and render; live updates fall back to manual refresh.

| File | Change |
|------|--------|
| `src/hooks/useRealtimeEvents.ts` | Subscription logic removed, type stub added |
| `src/hooks/useRealtimeNotifications.ts` | Subscription logic removed, type stub added |
| `src/hooks/useRealtimeStudentSelections.ts` | Subscription logic removed, type stub added |
| `src/hooks/useRealtimeTaskStatus.ts` | Subscription logic removed, type stub added |
| `src/hooks/useRealtimeTimetableChanges.ts` | Subscription logic removed, type stub added |

Type stub added at top of each file:
```typescript
// Neon does not support Realtime — type stub for compatibility
type RealtimeChannel = { unsubscribe: () => void };
```

---

## Bulk Import Updates (~170+ files)

All TypeScript files that imported from `@supabase/supabase-js` or `@supabase/ssr` were updated to use the Neon-compatible equivalents.

### Import Pattern Changes

| Before | After |
|--------|-------|
| `import { createClient } from '@supabase/supabase-js'` | `import { createClient } from '@/lib/neon-supabase-compat'` |
| `import { createBrowserClient } from '@supabase/ssr'` | `import { supabaseBrowser } from '@/shared/database/browser'` |
| `import { createServerClient } from '@supabase/ssr'` | `import { supabaseServer } from '@/shared/database/server'` |
| `import type { SupabaseClient } from '@supabase/supabase-js'` | `import type { NeonClient } from '@/lib/neon-supabase-compat'` |
| `import type { Database } from '@/types/supabase'` | Type removed / replaced with inline types |

### Affected Directories
- `src/app/api/**` — All API route handlers
- `src/lib/**` — Auth, notification service, utility libraries
- `src/shared/**` — Database layer, rate limiting, logging
- `src/hooks/**` — React query hooks
- `src/components/**` — Components with direct DB access
- `src/services/**` — Service layer files

---

## Middleware Runtime Fix

### Problem
Next.js middleware runs in **Edge Runtime** by default. The middleware import chain reached the `pg` package, which uses Node.js's `crypto` built-in — unavailable in Edge Runtime.

```
src/middleware.ts
  → @/lib/auth
    → @/shared/database
      → @/lib/neon-supabase-compat
        → pg
          → Node.js 'crypto'   ← ❌ Edge Runtime error
```

**Error message**: `The edge runtime does not support Node.js 'crypto' module`

### Fix — `src/middleware.ts`

Added `export const runtime = 'nodejs'` to opt the middleware into Node.js runtime:

```typescript
// Use Node.js runtime so middleware can access pg/neon database clients
// (Edge Runtime does not support Node.js built-ins like 'crypto' used by the pg package)
export const runtime = 'nodejs';

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

> Supported natively in Next.js 15.1+ — no extra `next.config.ts` flags needed.

---

## Files with Node.js `crypto` Imports

These files import from the Node.js `crypto` module and are **server-only** (safe — all run in Node.js runtime):

| File | Usage |
|------|-------|
| `src/shared/utils/crypto.ts` | `randomBytes`, `createHash`, `createHmac`, `timingSafeEqual`, `createCipheriv/Decipheriv` |
| `src/shared/logging/CorrelationId.ts` | `randomUUID` |
| `src/lib/notificationService.ts` | `randomUUID` |
| `src/app/api/notifications/send/route.ts` | `randomUUID` |
| `src/app/api/college/validate-token/route.ts` | `randomBytes` |
| `src/app/api/college/register/route.ts` | `randomUUID` |

> `src/middleware/request-id.ts` uses `globalThis.crypto.randomUUID()` (Web Crypto API) — safe in Edge Runtime and unchanged.

---

## Validation

| Check | Result |
|-------|--------|
| `tsc --noEmit` (Supabase-related errors) | ✅ 0 errors |
| Dev server startup | ✅ No runtime errors |
| Middleware compilation | ✅ Compiled in ~600ms |
| API routes functional | ✅ Verified |
| Database connectivity | ✅ Neon pool connected |

---

## Known Limitations After Migration

1. **No Realtime subscriptions** — Neon does not support WebSocket-based row-level realtime events. The 5 realtime hooks are stubbed; features relying on live updates now require manual refresh or polling.  
2. **No Supabase Storage** — File uploads that used Supabase Storage buckets need to be redirected to an alternative (e.g., Cloudflare R2, AWS S3, or Supabase Storage via REST if still accessible).  
3. **No Supabase Auth** — Authentication is now handled entirely by the custom JWT middleware (`JWT_SECRET`) that was already in place. Supabase Auth endpoints are no longer called.

---

## Rollback Plan

To roll back to Supabase:
1. Reinstall packages: `npm install @supabase/supabase-js @supabase/ssr`
2. Restore `.env` Supabase variables (commented-out block)
3. Revert `src/shared/database/client.ts` to use `createClient` from `@supabase/supabase-js`
4. Revert `src/middleware.ts` — remove `export const runtime = 'nodejs'`
5. Re-enable realtime hooks
