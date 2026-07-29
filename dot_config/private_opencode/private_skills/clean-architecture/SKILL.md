---
name: clean-architecture
description: |
  Beetween hexagonal and clean architecture rules for Kotlin Spring Boot. Use when designing new backend features,  defining layer structures (domain models, use cases, ports, adapters, entities), enforcing layer boundaries,  reviewing architecture, or onboarding to a service. Do NOT use for frontend styling or pure SQL files.
---

# Beetween Clean Architecture — Kotlin / Spring Boot

## When to Use This Skill

- Designing a new domain feature from scratch
- Adding a new bounded context or sub-domain to an existing service
- Reviewing that a PR respects layer boundaries
- Deciding where a class belongs (domain, application, adapter, infrastructure)
- Structuring ports, use cases, and application services

---

## Layer Structure

Every bounded context follows this package structure:

```
{feature}/
├── domain/
│   ├── model/          ← pure Kotlin: entities, value objects, enums
│   ├── error/          ← DomainError sealed hierarchy
│   └── port/outbound/  ← repository port (domain-owned outbound port)
├── application/
│   ├── command/        ← Command / Query data classes (use-case inputs)
│   ├── port/
│   │   ├── inbound/    ← use case interfaces (fun interface)
│   │   └── outbound/   ← service ports (notification, user, workflow, time...)
│   ├── error/          ← UseCaseError sealed hierarchy + DomainErrorMapper
│   └── service/        ← ApplicationService implementations
└── adapter/
    ├── inbound/
    │   └── web/
    │       ├── controller/  ← @RestController classes
    │       ├── dto/         ← request/response DTOs
    │       └── errormanager/← @RestControllerAdvice
    └── outbound/
        └── persistence/
            ├── adapter/     ← repository adapter implementations
            ├── document/    ← @Document (MongoDB) or @Entity (JPA)
            └── repository/  ← Spring Data interfaces
```

Cross-cutting concerns (shared by all bounded contexts) go in:
```
common/          ← auth context, pagination, shared DTOs, error response shape
config/          ← Spring beans, security, OpenAPI
```

### Domain-First Structure (ADR-0013 — mandatory for new projects)

Per `adr-0013-backend-package-structure-clean-architecture` (Accepted), **new** backend projects nest each layer *inside* its owning domain instead of the layer-first layout shown above — the domain is the top-level folder, not the layer:

```
{app}/
├── {domainName}/          ← singular (e.g. `session`, not `sessions`)
│   ├── domain/
│   ├── application/
│   └── adapter/
│       ├── inbound/
│       └── outbound/
└── common/                ← cross-cutting only (never `shared`)
```

Existing layer-first services (jury-api, iam-api, recval-api — and the examples throughout this skill) predate the ADR and are **not required to migrate**; everything else in this skill (naming, `create()`/`rehydrate()`, error layering, ports) applies unchanged inside either layout — only the top-level nesting order differs. ArchUnit's `..`-wildcarded package matchers (see `architecture-testing`) match correctly under either layout with no rule changes.

---

## Dependency Direction (MANDATORY)

```
adapter/inbound  →  application  →  domain
adapter/outbound →  application  →  domain
                               ↑
                    (implements ports from)
```

**Rules:**
- Domain knows NOTHING about Spring, JPA, MongoDB, HTTP
- Application knows NOTHING about controllers, JPA entities, HTTP status
- Adapters implement ports defined in domain/application — never the reverse
- Cross-domain calls are FORBIDDEN — use ports if cross-domain data is needed

Enforced by ArchUnit tests — see `architecture-testing` skill.

---

## Domain Layer

### Aggregate Root

Private constructor, `create()` / `rehydrate()` companion factories:

```kotlin
class Jury private constructor(
    val id: JuryId?,
    val companyId: CompanyId,
    val name: String,
    val status: JuryStatus,
    val audit: AuditInfo,
) {
    companion object {
        fun create(
            companyId: CompanyId,
            name: String,
            now: Instant,
        ): Result<Jury, DomainError> {
            if (name.isBlank()) return Err(DomainError.JuryNameBlank)
            return Ok(Jury(id = null, companyId = companyId, name = name,
                status = JuryStatus.Draft, audit = AuditInfo(now, now)))
        }

        fun rehydrate(
            id: JuryId,
            companyId: CompanyId,
            name: String,
            status: JuryStatus,
            audit: AuditInfo,
        ): Jury = Jury(id, companyId, name, status, audit) // skips validation
    }

    fun update(name: String, now: Instant): Result<Jury, DomainError> {
        if (status != JuryStatus.Draft) return Err(DomainError.JuryNotEditable)
        if (name.isBlank()) return Err(DomainError.JuryNameBlank)
        return Ok(copy(name = name, audit = audit.updatedNow(now)))
    }

    private fun copy(...): Jury = Jury(...)  // internal copy, never exposed
}
```

**Rules:**
- Constructor is `private` — only `create()` and `rehydrate()` build instances
- `create()` validates invariants and returns `Result<Aggregate, DomainError>`
- `rehydrate()` reconstructs from persistence — skips validation (data already trusted)
- Every mutation returns `Result<NewAggregate, DomainError>` — never mutates in place
- No framework annotations in the domain (no `@Entity`, `@Document`, no Spring, no Jackson)

### Value Objects

Use `@JvmInline value class` for type-safe IDs and string wrappers:

```kotlin
@JvmInline value class JuryId(val value: String)        // MongoDB ObjectId
@JvmInline value class CompanyId(val value: UUID)
@JvmInline value class GroupId(val value: UUID)
@JvmInline value class GroupName(val value: String)
@JvmInline value class Email(val value: String)
```

Value objects with validation return `Result`:
```kotlin
@JvmInline value class Email private constructor(val value: String) {
    companion object {
        fun of(raw: String): Result<Email, DomainError> =
            if (raw.matches(EMAIL_REGEX)) Ok(Email(raw)) else Err(DomainError.InvalidEmail)
    }
}
```

### Domain Errors

Flat `sealed class` with `data object` for no-payload errors, `data class` for payload errors:

```kotlin
sealed class DomainError {
    abstract val code: String
    abstract val message: String

    data object JuryNameBlank : DomainError() {
        override val code = "JURY_NAME_BLANK"
        override val message = "Jury name cannot be blank"
    }
    data object JuryNotEditable : DomainError() {
        override val code = "JURY_NOT_EDITABLE"
        override val message = "Jury cannot be modified in its current status"
    }
    data class IdpNotFound(val aliases: Set<String>) : DomainError() {
        override val code = "IDP_NOT_FOUND"
        override val message = "Identity providers not found: $aliases"
    }
}
```

**One `DomainError` sealed class per bounded context.** Never reuse errors across domains.

### Outbound Port (domain-owned)

Repository port lives in `domain/port/outbound/` — domain defines what it needs:

```kotlin
interface JuryRepositoryPort {
    fun findById(id: JuryId): Jury?
    fun findAllByCompanyId(companyId: CompanyId): List<Jury>
    fun save(jury: Jury): Jury
    fun delete(id: JuryId)
}
```

No Spring Data generics, no `@Transactional` — pure interface.

---

## Application Layer

### Use Case Interface

`fun interface` (SAM) — one per operation:

```kotlin
fun interface CreateJuryUseCase {
    fun execute(command: CreateJuryCommand): Result<JuryResponse, UseCaseError>
}

fun interface CancelJuryUseCase {
    fun execute(command: CancelJuryCommand): Result<JuryResponse, UseCaseError>
}
```

### Commands & Queries

Plain `data class` — one per use case:

```kotlin
data class CreateJuryCommand(
    val companyId: CompanyId,
    val name: String,
    val description: String?,
    val callerUserId: UUID,
)

data class ListJuriesQuery(
    val companyId: CompanyId,
    val status: JuryStatus?,
    val page: Int,
    val size: Int,
)
```

No annotations. No framework types. The DTO-to-command mapping happens in the controller via extension functions.

### Application Service

`@Service` implementing use case interface(s). Orchestrates: load → validate → mutate → save → notify:

```kotlin
@Service
class CreateJuryService(
    private val repository: JuryRepositoryPort,
    private val notificationPort: NotificationPort,
    private val timeProvider: TimeProviderPort,
) : CreateJuryUseCase {

    override fun execute(command: CreateJuryCommand): Result<JuryResponse, UseCaseError> {
        val now = timeProvider.now()
        return Jury.create(command.companyId, command.name, now)
            .mapError { DomainErrorMapper.map(it) }
            .map { jury ->
                val saved = repository.save(jury)
                notificationPort.notifyJuryCreated(saved, command.callerUserId)
                JuryResponse.from(saved)
            }
    }
}
```

**Rules:**
- Services have NO HTTP or persistence framework imports
- One service implements one or a few closely related use cases
- Error mapping from domain → use case happens via `DomainErrorMapper`
- Clock is always injected via `TimeProviderPort` — never `Instant.now()` directly

### Use Case Error

Two-level error hierarchy at the application/adapter boundary:

```kotlin
sealed class UseCaseError {
    abstract val code: String
    abstract val message: String

    // Group by HTTP semantics for exhaustive mapping in the controller advice:
    sealed class NotFound : UseCaseError() {
        data object JuryNotFound : NotFound() { override val code = "JURY_NOT_FOUND"; ... }
        data object MemberNotFound : NotFound() { ... }
    }
    sealed class Conflict : UseCaseError() {
        data object ActiveJuryAlreadyExists : Conflict() { ... }
    }
    sealed class Unprocessable : UseCaseError() {
        data object JuryNotEditable : Unprocessable() { ... }
    }
    sealed class Unauthorized : UseCaseError() { ... }
    sealed class Gone : UseCaseError() { ... }
    data class BadRequest(override val code: String, override val message: String) : UseCaseError()
}
```

### Domain Error Mapper

`object` in `application/error/`:

```kotlin
object DomainErrorMapper {
    fun map(error: DomainError): UseCaseError = when (error) {
        DomainError.JuryNameBlank    -> UseCaseError.Unprocessable.JuryNameBlank
        DomainError.JuryNotEditable  -> UseCaseError.Unprocessable.JuryNotEditable
        else -> UseCaseError.BadRequest(code = error.code, message = error.message)
    }
}
```

`when` must be exhaustive — the compiler enforces this via `sealed class`.

### Outbound Ports (application-owned)

```kotlin
fun interface NotificationPort {
    fun notifyJuryCreated(jury: Jury, actorId: UUID)
}

fun interface TimeProviderPort {
    fun now(): Instant
}

fun interface UserDetailPort {
    fun getUsersByIds(ids: List<UUID>): List<UserDetail>
}
```

---

## Adapter Layer — Inbound (REST)

### Controller

```kotlin
@RestController
@RequestMapping("/api/v1/juries")
class JuryController(
    private val createJuryUseCase: CreateJuryUseCase,
    private val cancelJuryUseCase: CancelJuryUseCase,
) {
    @PostMapping
    fun create(
        @Valid @RequestBody dto: CreateJuryRequestDto,
        @CallerCompanyId companyId: UUID,
    ): ResponseEntity<JuryResponseDto> =
        createJuryUseCase.execute(dto.toCommand(CompanyId(companyId))).fold(
            success = { ResponseEntity.status(HttpStatus.CREATED).body(JuryResponseDto.from(it)) },
            failure = { throw ApplicationException(it) },
        )
}
```

**Rules:**
- Controllers inject use case interfaces, not services directly
- `fold()` / `andThen()` + `map()` chain unwraps `Result` — never raw `if (result.isOk)`
- All `Err` paths throw `ApplicationException(useCaseError)` — caught by `@RestControllerAdvice`
- DTOs have `toCommand()` extension for inbound mapping and `from(domain)` companion for outbound
- No business logic in controllers — they translate HTTP ↔ application

### Error Handler

```kotlin
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
class ApplicationErrorHandler {

    @ExceptionHandler(ApplicationException::class)
    fun handle(ex: ApplicationException, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
        val status = resolveStatus(ex.error)
        val metadata = buildMetadata(ex.error)
        return ResponseEntity.status(status).body(
            ErrorResponse(status.value(), ex.error.message, ex.error.code, request.requestURI, metadata)
        )
    }

    private fun resolveStatus(error: UseCaseError): HttpStatus = when (error) {
        is UseCaseError.NotFound      -> HttpStatus.NOT_FOUND
        is UseCaseError.Conflict      -> HttpStatus.CONFLICT
        is UseCaseError.Unauthorized  -> HttpStatus.FORBIDDEN
        is UseCaseError.Gone          -> HttpStatus.GONE
        is UseCaseError.Unprocessable -> HttpStatus.UNPROCESSABLE_ENTITY
        is UseCaseError.BadRequest    -> HttpStatus.BAD_REQUEST
        else                          -> HttpStatus.INTERNAL_SERVER_ERROR
    }
}
```

`when` on sealed class must be exhaustive — any new `UseCaseError` subtype requires adding a branch.

---

## Naming Conventions

| Layer | Suffix | Example |
|---|---|---|
| Domain aggregate | none | `Jury`, `Request`, `Group` |
| Domain value object | none | `JuryId`, `Email`, `GroupName` |
| Domain error | none (members) | `DomainError.JuryNameBlank` |
| Domain repository port | `RepositoryPort` | `JuryRepositoryPort` |
| Use case interface | `UseCase` | `CreateJuryUseCase` |
| Application service | `Service` | `CreateJuryService` |
| Command | `Command` | `CreateJuryCommand` |
| Query | `Query` | `ListJuriesQuery` |
| Application error | none (members) | `UseCaseError.JuryNotFound` |
| Outbound port | `Port` | `NotificationPort`, `TimeProviderPort` |
| REST controller | `Controller` | `JuryController` |
| REST DTO (inbound) | `RequestDto` / `Dto` | `CreateJuryRequestDto` |
| REST DTO (outbound) | `ResponseDto` | `JuryResponseDto` |
| JPA entity | `Entity` | `RequestEntity` |
| MongoDB document | `Document` | `JuryDocument` |
| Repository adapter | `Adapter` | `JuryRepositoryAdapter` |
| Spring Data repo | `Repository` (interface) | `JuryMongoRepository`, `RequestJpaRepository` |
| Error handler | `ErrorHandler` | `ApplicationErrorHandler` |

---

## Do Not

- Put `@Entity`, `@Document`, or any Spring annotation in `domain/`
- Put HTTP concepts (`HttpStatus`, `ResponseEntity`) in `application/`
- Inject `@Service` directly into controllers — inject the use case interface
- Call across bounded contexts without a port
- Use `Instant.now()` directly in services — inject `TimeProviderPort`
- Use `throw` for domain errors — return `Result`
- Use `?.let { }` chains instead of `Result.andThen` for error-prone operations
- Create `UseCaseError` that duplicates `DomainError` 1-to-1 without adding meaning
