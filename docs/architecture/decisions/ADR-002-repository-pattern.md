# ADR-002: Use Repository Pattern for Data Access

## Status
✅ **Accepted** (2026-01-21)

## Context
We needed a way to abstract database access logic and make our code testable without direct database dependencies.

## Decision
Implement the **Repository Pattern** for all data access:

- Define repository interfaces in the domain layer
- Implement repositories in the infrastructure layer
- Use repositories in use cases instead of direct database calls

### Example
```typescript
// Domain layer
export interface IElectiveBucketRepository {
  findById(id: string): Promise<ElectiveBucket | null>;
  create(data: BucketData): Promise<ElectiveBucket>;
}

// Infrastructure layer
export class SupabaseElectiveBucketRepository implements IElectiveBucketRepository {
  // Supabase-specific implementation
}

// Application layer (Use Case)
export class GetBucketUseCase {
  constructor(private repository: IElectiveBucketRepository) {}
  
  async execute(id: string) {
    return await this.repository.findById(id);
  }
}
```

## Alternatives Considered

### 1. Direct Database Calls in Use Cases
- ❌ Tight coupling to database
- ❌ Difficult to test
- ✅ Simpler, less code

### 2. ORM (TypeORM, Prisma)
- ✅ Type-safe queries
- ❌ Additional dependency
- ❌ Complexity for simple queries
- ❌ Doesn't fit well with Supabase

### 3. Repository Pattern (Chosen)
- ✅ Testable with mocks
- ✅ Flexible data source
- ✅ Clean separation
- ⚠️ More boilerplate

## Consequences

### Positive
✅ **Testability** - Easy to mock repositories in tests
✅ **Flexibility** - Can swap database implementations
✅ **Maintainability** - Data access logic centralized
✅ **Type Safety** - Clear interfaces

### Negative
⚠️ **Boilerplate** - More files and interfaces
⚠️ **Learning Curve** - Developers need to understand pattern

## Implementation
- Created repository interfaces for all modules
- Implemented Supabase repositories
- Added mock repositories for testing

## Related ADRs
- ADR-001: Modular Monolithic Architecture
- ADR-004: Use Supabase as Database
