---
name: backend-task-decomposition-core
description: |
  Shared backend task decomposition process for Beetween services. Provides a stack-agnostic workflow to analyze features and produce implementation-ready ordered tasks with dependencies, acceptance criteria, and risk flags. Use as the common planning backbone before consulting stack-specific selector skills.
---

# Backend Task Decomposition Core

## When to Use This Skill

- Breaking down a feature into implementation tasks
- Reviewing architecture impact before coding
- Producing an execution plan for PR-sized delivery
- Aligning acceptance criteria across layers

---

## Scope and Boundaries

This skill is process-only.

- It defines how to analyze and structure tasks
- It does not define stack-specific technical rules
- For technical decisions, always consult one stack selector skill:
  - `backend-task-decomposition-kotlin`
  - `backend-task-decomposition-java-ee`

---

## Three Analysis Tracks

Run these tracks in parallel when possible.

### Track A - Existing System Analysis

1. Locate impacted bounded contexts and modules
2. Identify existing patterns to reuse
3. List what must be added, updated, or removed
4. Capture cross-cutting impacts (security, migrations, events, observability)

### Track B - Domain and Business Rules

1. List domain invariants and lifecycle constraints
2. Identify new/updated domain errors and validation rules
3. Define business rule identifiers (RG-xx)
4. Map each rule to acceptance criteria (AC-xx)

### Track C - Delivery Slices

1. Define implementation slices by layer/component
2. Establish dependency order between slices
3. Isolate high-risk changes into explicit tasks
4. Add required test tasks and architecture validation tasks

---

## Required Output Contract

Use this format for every task:

```md
### Task N - [Concise Title]

**Layer:** [domain | application | adapter-persistence | adapter-rest | infrastructure | security | migration | job | observability | test]

**Business Rules (RG):**

- RG-01: ...

**Acceptance Criteria (AC):**

- AC-01: ...

**What to implement:**

- Files/components to add or update
- Public signatures/contracts
- Data changes and compatibility notes

**Dependencies:** [Task N or "none"]
```

---

## Ordering Rules

1. Data and schema changes first when required
2. Domain and core business rules next
3. Application/service orchestration next
4. Adapters and API exposure next
5. Tests and architecture-rule updates last

Additional rules:

- Keep each task independently testable when possible
- Prefer additive migrations over destructive changes
- Separate risky refactors from feature behavior changes

---

## Risk Flags

Always include a risk section after the ordered task list.

Minimum checks:

- Breaking API changes
- Backward compatibility for persisted data
- Transaction/consistency boundaries
- Concurrency and idempotency concerns
- Security/authorization impact
- Observability coverage gaps

---

## Final Checklist

Before handing over the plan:

- Every acceptance criterion maps to at least one task
- Every task has explicit dependencies
- Stack-specific constraints were sourced from one selector skill
- Migration, test, and rollback concerns are explicit
