# Architecture Decision Records (ADRs)

## What are ADRs?

Architecture Decision Records (ADRs) document important architectural decisions along with their context and consequences.

---

## Index of ADRs

### Core Architecture
- [ADR-001: Adopt Modular Monolithic Architecture](./ADR-001-modular-monolithic-architecture.md) ✅
- [ADR-002: Use Repository Pattern for Data Access](./ADR-002-repository-pattern.md) ✅
- [ADR-003: Use Zod for DTO Validation](./ADR-003-zod-validation.md) ✅
- [ADR-004: Use Supabase as Database](./ADR-004-supabase-database.md) ✅

### Future ADRs (Template)

When making new architectural decisions, create a new ADR using this template:

```markdown
# ADR-XXX: [Decision Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[What is the issue we're trying to solve?]

## Decision
[What is the change we're proposing?]

## Alternatives Considered
[What other options did we consider?]

## Consequences
### Positive
[What are the benefits?]

### Negative
[What are the drawbacks?]

## Implementation
[How will we implement this?]

## Related ADRs
[Links to related decisions]
```

---

## How to Create a New ADR

1. **Identify the Decision**
   - Is this a significant architectural choice?
   - Will it affect multiple modules or the overall system?

2. **Copy the Template**
   - Create `ADR-XXX-short-title.md` in this directory
   - Use sequential numbering

3. **Document Thoroughly**
   - Explain the context and problem
   - List alternatives considered
   - Document consequences (good and bad)

4. **Get Review**
   - Share with team for feedback
   - Update based on discussion

5. **Mark Status**
   - Start as "Proposed"
   - Change to "Accepted" when implemented
   - Update to "Deprecated" if superseded

---

## ADR Guidelines

### When to Create an ADR
✅ **Do create ADRs for:**
- Technology choices (framework, database, libraries)
- Architectural patterns (repository, event-driven, etc.)
- Major refactorings
- Infrastructure decisions

❌ **Don't create ADRs for:**
- Implementation details
- Minor code changes
- Temporary workarounds
- Obvious choices

### Writing Good ADRs
- **Be concise** - Keep it focused
- **Be specific** - Include examples
- **Be honest** - Document trade-offs
- **Be complete** - Cover alternatives

---

## Benefits of ADRs

📚 **Knowledge Transfer** - New team members understand *why* decisions were made

🔍 **Context Preservation** - Remember reasoning even after years

🤔 **Better Decisions** - Forces thinking through alternatives

📖 **Documentation** - Living architecture documentation

---

## Related Documentation
- [Architecture Overview](../ARCHITECTURE.md)
- [Module Dependencies](../module-dependencies.md)
- [Module Interactions](../diagrams/module-interactions.md)
