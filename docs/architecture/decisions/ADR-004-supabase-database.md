# ADR-004: Use Supabase as Database

## Status
✅ **Accepted** (2025)

## Context
We needed a database solution that provides:
- PostgreSQL database
- Real-time subscriptions
- Authentication
- Row-level security
- Easy deployment

## Decision
Use **Supabase** as our database and backend-as-a-service platform.

## Alternatives Considered

### 1. Plain PostgreSQL
- ✅ Full control
- ❌ Need to build auth ourselves
- ❌ Complex deployment

### 2. Firebase
- ✅ Easy to use
- ❌ NoSQL (different data model)
- ❌ Less SQL flexibility

### 3. Supabase (Chosen)
- ✅ PostgreSQL database
- ✅ Built-in auth
- ✅ Real-time subscriptions
- ✅ Row-level security
- ✅ Easy deployment

## Consequences

### Positive
✅ **Productivity** - Fast development
✅ **Features** - Auth, real-time built-in
✅ **SQL** - Full PostgreSQL power
✅ **Scalability** - Managed scaling

### Negative
⚠️ **Vendor Lock-in** - Coupled to Supabase
⚠️ **Cost** - Can be expensive at scale

## Implementation
- Created shared database clients
- Used repository pattern to abstract Supabase
- Centralized in `@/shared/database/*`

## Related ADRs
- ADR-002: Repository Pattern
