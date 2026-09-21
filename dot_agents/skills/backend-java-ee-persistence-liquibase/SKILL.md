---
name: java-ee-persistence-liquibase
description: |
  Java EE persistence conventions using JPA and Liquibase. Covers entity modeling, relationships, optimistic locking, query strategy (NamedQuery vs CriteriaBuilder), and migration authoring rules. Use when implementing PostgreSQL persistence in Java EE services.
---

# Java EE Persistence + Liquibase

## When to Use This Skill

- Adding or changing database-backed domain objects
- Implementing JPA entities and repository/DAO queries
- Writing Liquibase changesets for schema evolution

---

## Entity Design Rules

- Use `@Entity` with explicit table names
- Use `@Version` for aggregates with concurrent updates
- Prefer `LAZY` associations by default
- Keep bidirectional relationships only when truly needed
- Use immutable identifiers once persisted

Relationship guidelines:

- `@ManyToOne` for ownership/reference links
- `@OneToMany(mappedBy = ...)` for child collections
- `CascadeType.ALL` only when lifecycle is strictly bounded

---

## Query Strategy

Use the simplest option that satisfies the case:

1. `@NamedQuery`

- Stable, reused queries
- Good for frequent reads with simple parameters

2. CriteriaBuilder

- Dynamic filtering/sorting
- Optional predicates and complex combinations

3. Native SQL

- Use only when JPQL/Criteria cannot express required SQL efficiently

Document chosen strategy in task decomposition output.

---

## Optimistic Locking

- Add `@Version` column for write-heavy entities
- Translate lock exceptions to conflict-level API errors
- Never swallow lock exceptions; return deterministic retry-safe error payloads

---

## Liquibase Rules

- One atomic concern per changeset
- Add index/constraint changes explicitly (not implied)
- Keep rollback block when feasible
- Never edit already-applied changesets in shared environments

Suggested structure:

```text
db/changelog/
  db.changelog-master.xml
  changes/
    001-create-foo.xml
    002-add-foo-index.xml
```

---

## Migration Checklist

- Forward migration tested
- Rollback path defined or justified
- Entity mapping aligns with schema names/types
- Query/index strategy validated for expected cardinality
