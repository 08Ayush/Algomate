# ADR-001: Adopt Modular Monolithic Architecture

## Status
✅ **Accepted** (2026-01-21)

## Context
The Academic Campus application was growing complex with tightly coupled code, making it difficult to maintain and scale. We needed an architecture that would:
- Improve code organization and maintainability
- Enable independent module development
- Reduce dependencies between features
- Keep deployment simple (monolithic)
- Allow future migration to microservices if needed

## Decision
We decided to adopt a **modular monolithic architecture** with the following principles:

1. **Domain-Driven Design** - Organize code by business domains (modules)
2. **Clean Architecture** - Separate concerns into layers (domain, application, infrastructure)
3. **Repository Pattern** - Abstract data access
4. **Use Case Pattern** - Encapsulate business logic

### Module Structure
```
src/modules/{module}/
├── domain/           # Entities & Repository interfaces
├── application/      # DTOs & Use cases
├── infrastructure/   # Repository implementations
└── index.ts          # Module exports
```

## Alternatives Considered

### 1. Continue with Monolithic Architecture
- ❌ Would perpetuate tight coupling
- ❌ Difficult to test and maintain
- ✅ No migration effort required

### 2. Migrate to Microservices
- ✅ Maximum decoupling
- ❌ Complex deployment & infrastructure
- ❌ Network latency overhead
- ❌ Distributed system complexity

### 3. Modular Monolith (Chosen)
- ✅ Clean separation of concerns
- ✅ Easier to maintain and test
- ✅ Simple deployment (single app)
- ✅ Can extract to microservices later
- ⚠️ Requires initial migration effort

## Consequences

### Positive
✅ **Maintainability** - Clear boundaries, easier to understand
✅ **Testability** - Modules can be tested independently
✅ **Team Collaboration** - Teams can own specific modules
✅ **Flexibility** - Easy to refactor within module boundaries
✅ **Migration Path** - Can extract hot modules to services later

### Negative
⚠️ **Migration Effort** - Required refactoring 31 routes
⚠️ **Learning Curve** - Team needs to learn new patterns
⚠️ **Complexity** - More files and structure than simple monolith

### Neutral
- Still deployed as single application
- Runtime performance unchanged
- Database remains shared

## Implementation
- Created 4 new modules: Elective, Batch, Classroom, Course
- Enhanced TimetableModule with 7 workflow use cases
- Migrated 31 API routes to use cases
- Removed legacy code and centralized infrastructure

## Lessons Learned
- ✅ Clear module boundaries prevented scope creep
- ✅ Repository pattern made testing much easier
- ✅ Use cases made business logic explicit
- ⚠️ Initial setup took time but pays off long-term

## Related ADRs
- ADR-002: Use Repository Pattern
- ADR-003: Use Zod for DTO Validation
