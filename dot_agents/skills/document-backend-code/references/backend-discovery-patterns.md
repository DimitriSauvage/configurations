# Discovery Patterns — Cross-Repository Architecture Detection

Used by the `document-backend-code` skill during **Phase 0** to auto-detect the project's
architecture style, naming conventions, and key code locations — without requiring manual config.

---

## Step 1 — Detect architecture style

Check for the following signals in order:

| Signal | Architecture | Detection method |
|--------|-------------|-----------------|
| `docs/ARCHITECTURE.md` exists | Documented project — read it first | `find . -maxdepth 3 -name "ARCHITECTURE.md"` |
| Classes suffixed `ApplicationService` + `UseCase` interfaces | **Clean Architecture (per-domain)** | grep for `interface.*UseCase` + `class.*ApplicationService` |
| Classes suffixed `Service` + `Repository` interfaces | **Layered / DDD** | grep for `interface.*Repository` + `@Service` |
| `Port` interfaces + `Adapter` implementations | **Hexagonal Architecture** | grep for `interface.*Port` + `class.*Adapter` |
| None of the above | **Unknown** — ask the user | `ask_user` |

**For Clean Architecture (per-domain):** verify the 3-level structure:
```
<domain>/domain/       ← entities, value objects, DomainError
<domain>/application/  ← use cases, commands, UseCaseError
<domain>/adapter/      ← controllers, JPA adapters, cross-domain adapters
```

---

## Step 2 — Identify domains

List all top-level packages under the main source root:

```bash
find src/main -mindepth 4 -maxdepth 4 -type d | \
  awk -F/ '{print $(NF)}' | sort -u
```

Exclude: `common`, `config`, `shared`, `util`, `infrastructure` — these are transversal.

**Ask the user if:**
- More than 10 top-level packages (may be a large monorepo — scope clarification needed)
- No domain packages detected (flat structure)

---

## Step 3 — Map use cases per domain

For each domain, find all use case implementations:

```bash
find src/main -name "*ApplicationService.kt" | sort
# or for DDD/Layered:
find src/main -name "*Service.kt" | grep -v "config\|adapter\|common"
```

Count use cases per domain — this drives:
- Whether to generate one file per domain or a consolidated file
- Which domains have enough content to deserve a full architecture diagram

---

## Step 4 — Map error handlers

Error handlers are the authoritative source for **UseCaseError → HTTP status** mapping.

```bash
find src/main -name "*ErrorHandler.kt" -o -name "*ExceptionHandler.kt" \
  -o -name "*ControllerAdvice.kt" | sort
```

For each handler, read the `when(error)` or `switch(error)` branches.
Build the error table: `UseCaseError subtype → HTTP status → Description`.

**Kotlin pattern:**
```kotlin
when (error) {
    is UseCaseError.WorkflowNotFound -> HttpStatus.NOT_FOUND          // 404
    is UseCaseError.InsufficientPermissions -> HttpStatus.FORBIDDEN   // 403
    is UseCaseError.ConcurrentModification -> HttpStatus.CONFLICT     // 409
    is UseCaseError.WorkflowNotDraft -> HttpStatus.UNPROCESSABLE_ENTITY // 422
}
```

**Java pattern (Spring @ControllerAdvice style):**
```java
// Look for if/else chains or switch on error.getCode()
```

---

## Step 5 — Detect cross-domain interactions

Look for outbound ports in `application/port/outbound/` that reference another domain's
naming conventions (e.g., `UserWorkflowPort` in `workflow/` → cross-domain call to `user/`).

```bash
find src/main -path "*/application/port/outbound/*.kt" | sort
```

For each port, find its adapter implementation:
```bash
find src/main -path "*/adapter/outbound/*Adapter.kt" | grep -v "persistence\|systemtime\|monitoring"
```

Map: `Port interface → Adapter class → Target domain`.

---

## Step 6 — Detect domain model structure

For each domain, list aggregate root candidates:
```bash
find src/main -path "*/<domain>/domain/model/*.kt" | sort
```

Aggregates are typically:
- Classes with `private constructor` + `companion object { fun create(...): Result<T, E> }`
- Classes with methods that return `Result<T, DomainError>`
- Classes that hold a `List<ChildEntity>` and expose mutation methods

Value objects are typically:
- `@JvmInline value class` wrappers
- `data class` with no ID or lifecycle (e.g., `Owner`, `AuditInfo`)

---

## Step 7 — Build the discovery summary

At the end of Phase 0, produce an internal summary (not written to docs):

```
DISCOVERY SUMMARY
=================
Architecture style : Clean Architecture (per-domain)
Source root        : src/main/kotlin/com/company/project
Domains detected   : workflow (18 use cases), request (12 use cases), user (4 use cases)
Error handlers     : ApplicationErrorHandler, RequestApplicationErrorHandler
Cross-domain calls : workflow → user (UserWorkflowPort), request → workflow (WorkflowPort)
Config file        : not found — using defaults
```

Then ask the user:
> "I've detected 3 domains with a total of 34 use cases. Shall I document all domains in one pass,
> or start with a specific one?"

---

## Adapting to other architectures

### Hexagonal Architecture
- Driving ports: `interface.*InputPort` or `interface.*UseCase`
- Driven ports: `interface.*OutputPort` or `interface.*Repository`
- Adapters: `class.*Adapter`
- Domain: classes in `domain/model/` or `core/domain/`

### Layered (traditional Spring Boot)
- Services: `@Service class` in `service/`
- Repositories: `interface.*Repository extends JpaRepository`
- DTOs: classes in `dto/`
- Error mapping: `@ControllerAdvice` with `@ExceptionHandler` methods

### DDD (tactical patterns)
- Aggregates: classes annotated with `// Aggregate Root` or extending `AggregateRoot`
- Domain events: classes in `domain/event/` extending `DomainEvent`
- Value objects: `@Embeddable` or immutable final classes

---

## When to ask the user (vs. infer)

| Situation | Action |
|-----------|--------|
| `ARCHITECTURE.md` exists and matches code structure | Infer everything, no questions |
| Architecture detected but no `ARCHITECTURE.md` | Generate doc, mention at end: "Consider creating ARCHITECTURE.md" |
| Multiple architecture styles mixed in same codebase | Ask: "I detected mixed patterns. Which domain should I start with?" |
| A use case calls an external service not in the codebase | Ask: "Can you describe what `<ExternalPort.method>` does?" |
| An aggregate has undocumented state transitions (implicit via DB flag) | Ask: "I see a `status` field but no state machine. Can you confirm valid transitions?" |
| Comment says `// TODO`, `// FIXME`, or `// HACK` on a key business rule | Flag: "I found a TODO on a business rule in `<class>`. Document as-is or wait for fix?" |
