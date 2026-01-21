# ADR-003: Use Zod for DTO Validation

## Status
✅ **Accepted** (2026-01-21)

## Context
We needed runtime validation for API inputs to ensure type safety and prevent invalid data from entering the system.

## Decision
Use **Zod** for Data Transfer Object (DTO) validation:

- Define Zod schemas for all DTOs
- Validate inputs at API boundaries
- Use TypeScript type inference from schemas

### Example
```typescript
import { z } from 'zod';

export const CreateElectiveBucketDtoSchema = z.object({
  batch_id: z.string().uuid(),
  bucket_name: z.string().min(1),
  bucket_type: z.enum(['GENERAL', 'SKILL', 'MINOR', 'HONORS']),
  min_selection: z.number().int().min(1),
  max_selection: z.number().int().min(1),
});

export type CreateElectiveBucketDto = z.infer<typeof CreateElectiveBucketDtoSchema>;
```

## Alternatives Considered

### 1. No Runtime Validation
- ❌ Type safety only at compile time
- ❌ No protection against invalid API calls
- ✅ Simple, no dependencies

### 2. Class-validator
- ✅ Decorator-based validation
- ❌ Requires classes (not plain objects)
- ❌ Less TypeScript integration

### 3. Joi
- ✅ Mature validation library
- ❌ Separate type definitions
- ❌ No TypeScript inference

### 4. Zod (Chosen)
- ✅ TypeScript-first
- ✅ Type inference
- ✅ Composable schemas
- ✅ Clear error messages

## Consequences

### Positive
✅ **Type Safety** - Runtime + compile-time validation
✅ **DX** - Type inference reduces duplication
✅ **Error Messages** - Clear validation errors
✅ **Composability** - Reusable schema parts

### Negative
⚠️ **Bundle Size** - Adds to client bundle
⚠️ **Learning Curve** - Schema syntax to learn

## Implementation
- Created DTO schemas for all modules
- Validate at API route entry points
- Use TypeScript inference for types

## Related ADRs
- ADR-001: Modular Monolithic Architecture
