---
name: document-backend-code
description: |
  Retro-documents the behavioral logic of a backend codebase from source code into structured Markdown. Supports Kotlin/Spring Boot Clean Architecture, Hexagonal Architecture, DDD, and Layered architectures. Generates per-domain BDD-style docs — summary tables for simple use cases, Mermaid sequence diagrams for complex ones. Supports initial full pass and incremental update mode. Use when asked to document business rules, use case flows, domain invariants, error handling, or cross-domain interactions.
---

# Document Backend Code

Retro-documents the **behavioral logic** of a backend codebase from source code into structured,
human-readable Markdown — capturing business rules, use case flows, domain invariants, state
transitions, error contracts, and cross-domain interactions.

## Invocation

```
@document backend
@document the workflow domain
@document all domains
@document --update after this bugfix
```

## When to Use This Skill

| Trigger phrase | What the skill does |
|---|---|
| "Document the workflow domain" | Generates `docs/domains/workflow-behavior.md` from scratch |
| "Generate behavior docs for the entire project" | Full pass — one file per detected domain |
| "Update the docs after this bugfix / new feature" | Incremental update — re-scans changed files only |
| "How does the CreateRequest use case work?" | Documents one use case inline or in its domain file |
| "Document the business rules of the Request aggregate" | Focuses on domain model + invariants for that aggregate |
| "What are the error cases for the approval flow?" | Generates the error reference table for a specific domain |

## Output

```
docs/
└── domains/
    ├── <domain>-behavior.md     ← one file per documented domain
    └── cross-domain.md          ← if ≥ 3 domain pairs interact (optional)
```

---

## Invocation modes

| Mode | Trigger | What it does |
|------|---------|-------------|
| **Initial** | "Document the X domain" / "Generate full behavior docs" | Full pass on selected domain(s), creates `docs/domains/<domain>-behavior.md` |
| **Update** | "Update docs after this change" / "Refresh the X section" | Re-scans changed files, updates affected sections only, appends changelog entry |
| **Single use case** | "Document how CreateX works" | Documents one use case inline or in the relevant domain file |

If the mode is ambiguous, infer from context. Ask only if both initial and update are plausible.

---

## Phase 0 — Discovery

> Read [`references/discovery-patterns.md`](./references/discovery-patterns.md) for the full detection algorithm.

Execute these steps in order. Infer everything possible. Ask the user only when inference is blocked.

### 0.1 — Check for existing project documentation

```
Read docs/ARCHITECTURE.md (if present) — extract: architecture style, domain list, key patterns
Read docs/domains/ (if present) — note already-documented domains and their versions
```

### 0.2 — Detect architecture style

Classify as one of: `clean-architecture-per-domain`, `hexagonal`, `layered`, `ddd`, `unknown`.
For `unknown` → ask the user before proceeding.

### 0.3 — Enumerate domains

List all business domain packages (exclude `common`, `config`, `shared`, `util`).
Count use cases per domain. This drives scoping decisions.

### 0.4 — Map error handlers

For each `@RestControllerAdvice` / `@ControllerAdvice`:
- Build table: `ExceptionClass → UseCaseError subtype → HTTP status`
- This is the authoritative source for all error documentation. Never invent HTTP codes.

### 0.5 — Map cross-domain interactions

Identify outbound ports in `application/port/outbound/` that cross domain boundaries.
For each: trace `Port → Adapter → Target domain use case`.

### 0.6 — Produce discovery summary (internal)

Print a concise summary, then ask the user:
> "I've detected [N] domains with [M] total use cases. Shall I document all domains in one pass,
> or start with a specific one? (Recommended: start with `<most complex domain>`)"

---

## Phase 1 — Per-domain analysis

For each target domain, perform a structured reading pass.

### 1.1 — Domain model

- Read all files in `<domain>/domain/model/`
- For each class: classify as aggregate root, entity, or value object
- Extract: construction invariants, state transitions, multi-error validation methods
- Compute complexity score for each aggregate method (see [`references/complexity-heuristics.md`](./references/complexity-heuristics.md))

### 1.2 — Use case inventory

- Read all `*ApplicationService.kt` in `<domain>/application/service/`
- For each: extract dependencies (constructor params), command type, response type, error cases
- Compute complexity score → classify 🟢/🟡/🔴

### 1.3 — Cross-domain port analysis

- Read all interfaces in `<domain>/application/port/outbound/`
- Match each to its adapter implementation in `<domain>/adapter/outbound/`
- Trace the call chain to the target domain's use case

### 1.4 — Error contract

- Cross-reference use case error cases with the error handler table from Phase 0
- Flag any `UseCaseError` subtype that has no HTTP mapping (ask the user if found)

---

## Phase 2 — Documentation generation

> Read [`references/documentation-format.md`](./references/documentation-format.md) for the complete BDD template and filling rules.
> Read [`references/complexity-heuristics.md`](./references/complexity-heuristics.md) for detail level decisions.

### 2.1 — Generate per-domain file

Output to: `docs/domains/<domain>-behavior.md`

| Section | Condition |
|---------|-----------|
| Header (responsibility, aggregates) | Always |
| Overview + key business rules | Always |
| Domain Model → construction rules | Always (if non-trivial invariants) |
| Domain Model → state machine diagram | Aggregate has ≥ 2 states with transitions |
| Domain Model → key methods | Method score ≥ 2 (see heuristics) |
| Use Cases → summary table | All 🟢 simple use cases |
| Use Cases → medium section | All 🟡 medium use cases |
| Use Cases → full detailed section | All 🔴 complex use cases |
| Cross-domain interactions | Domain has cross-domain outbound ports |
| Error reference table | Always — derived from error handler |
| Architecture diagram | Domain has ≥ 3 use cases OR complex wiring |
| Documentation changelog | Always — start with v1.0 entry |

### 2.2 — Adaptive verbosity rules

**🟢 Simple use case** → one row in summary table:
```markdown
| `ListXxxApplicationService` | Returns paginated list for the group | `ListXxxQuery(groupId, page, size)` | `InsufficientPermissions` (403) | `XxxRepositoryPort` |
```

**🟡 Medium use case** → summary row + non-obvious rules sub-section:
```markdown
*Additional rules for `PublishWorkflow`:*
- Publication validates all steps in one pass, accumulating ALL errors before returning
- Errors are returned as `List<DomainError>`, not a single error
```

**🔴 Complex use case** → full section with:
- Nominal flow sequence diagram (Mermaid)
- Business rules table (Step / Rule / Error / HTTP)
- Dependencies bullet list with purpose
- Edge cases (⚠️ points)

### 2.3 — When to ask (vs. infer)

**Infer without asking:**
- HTTP status codes → from error handler `when` branches (authoritative)
- Port dependencies → from constructor injection
- Error cases → from `return Err(...)` statements
- State transitions → from domain method return types
- Business rules → from `if (condition) return Err(...)` patterns

**Ask the user when:**
- A domain method has no `Result` return type but contains complex logic
- An outbound port calls an external system whose behavior is not in the codebase
- A `// TODO` or `// FIXME` comment is on a key business rule path
- The same error type appears with different HTTP statuses in different handlers
- State transitions are managed via a DB flag not reflected in the domain model

---

## Phase 3 — Update mode

Triggered when the user asks to update docs after a code change.

### 3.1 — Identify changed files

```bash
git diff --name-only HEAD~1  # or ask the user which files changed
```

### 3.2 — Map changed files to doc sections

| Changed file pattern | Sections to update |
|---------------------|-------------------|
| `<domain>/domain/model/<Aggregate>.kt` | Domain Model section for that aggregate |
| `<domain>/application/service/<UseCase>ApplicationService.kt` | Use Cases section for that use case |
| `<domain>/adapter/inbound/web/errormanager/*ErrorHandler.kt` | Error Reference table |
| `<domain>/application/port/outbound/*Port.kt` | Cross-Domain Interactions |
| `<domain>/domain/error/DomainError.kt` | Methods that use the changed errors |

### 3.3 — Re-analyze and update

- Apply Phase 1 analysis only to affected components
- Modify only affected sections in `docs/domains/<domain>-behavior.md`
- Append a changelog entry:

```markdown
| <date> | <version+1> | Skill | Updated: <section name> — <1-line change summary> |
```

---

## Portability checklist

Works on any Kotlin/Spring Boot or Java backend project:

1. ✅ Check if `docs/ARCHITECTURE.md` exists — if yes, read it first (Phase 0.1)
2. ✅ Run Phase 0 discovery to auto-detect conventions
3. ✅ If naming conventions differ (e.g., suffix is `Handler` not `ApplicationService`), detect from code and adapt
4. ✅ If a `.github/agents/code-document-config.yml` exists, read it for threshold overrides
5. ✅ All documentation written in the same language as existing `docs/` files

---

## Anti-patterns to avoid

- ❌ Never invent business rules — only document what is explicitly in the code
- ❌ Never invent HTTP status codes — derive only from error handler `when` branches
- ❌ Never document JPA entities, DTOs, or adapter-only classes — focus on domain + use cases
- ❌ Never copy-paste code blocks verbatim — summarize intent, show logic via diagrams/tables
- ❌ Never skip the complexity scoring — it ensures consistent detail across all use cases
- ❌ Never commit documentation without explicit user confirmation

## References

- [Documentation Format (BDD Template)](./references/documentation-format.md)
- [Complexity Heuristics](./references/complexity-heuristics.md)
- [Discovery Patterns](./references/discovery-patterns.md)
