---
name: kotlin-best-practices
description: |
  Kotlin best practices and idioms for Spring Boot. Use when writing or reviewing Kotlin (.kt) files,  designing classes, using sealed/value classes, kotlin-result DSL chains, companion factories, functional  interfaces, or resolving Kotlin compiler warnings. Do NOT use for Java EE or frontend JavaScript code.
---

# Kotlin Best Practices — Beetween Backend

## When to Use This Skill

- Writing domain models, application services, or REST adapters in Kotlin
- Reviewing Kotlin code for idioms and anti-patterns
- Choosing between data class / sealed class / value class / object
- Using kotlin-result (`andThen`, `mapError`, `fold`, `Ok`, `Err`)
- Writing Kotlin extension functions for DTOs or Result chains

---

## Core Type Choices

### `sealed class` — for exhaustive hierarchies

Use for `DomainError`, `UseCaseError`, and aggregate roots with subtypes:

```kotlin
// ✅ Sealed error hierarchy — compiler-enforced exhaustiveness
sealed class DomainError {
    abstract val code: String
    abstract val message: String

    data object NameBlank : DomainError() {
        override val code = "NAME_BLANK"
        override val message = "Name cannot be blank"
    }
    data class NotFound(val id: String) : DomainError() {
        override val code = "NOT_FOUND"
        override val message = "Entity $id not found"
    }
}

// ✅ Sealed aggregate hierarchy
sealed class Group {
    abstract val id: GroupId
    abstract val name: GroupName
    data class Organization(override val id: GroupId, override val name: GroupName, ...) : Group()
    data class Unit(override val id: GroupId, override val name: GroupName, val parentId: GroupId) : Group()
}
```

**`when` on sealed must be exhaustive** — always without `else` branch on sealed types so the compiler catches missing cases.

### `data class` — for immutable value carriers

Commands, DTOs, query results, embedded models:

```kotlin
data class CreateJuryCommand(
    val companyId: CompanyId,
    val name: String,
    val description: String?,
)

data class AuditInfo(
    val createdAt: Instant,
    val updatedAt: Instant,
) {
    fun updatedNow(now: Instant) = copy(updatedAt = now)
}
```

### `@JvmInline value class` — for type-safe IDs and primitives

Prevents passing `UUID` in wrong position; zero runtime overhead:

```kotlin
@JvmInline value class JuryId(val value: String)       // MongoDB ObjectId
@JvmInline value class CompanyId(val value: UUID)
@JvmInline value class GroupId(val value: UUID)
@JvmInline value class GroupName(val value: String)
@JvmInline value class Email(val value: String)
@JvmInline value class I18nKey(val value: String)
```

Rules:
- Use for all domain IDs and constrained string wrappers
- Never use raw `UUID` or `String` as aggregate IDs in function signatures
- Suffix with the domain concept, not the primitive type (`GroupId` not `GroupUUID`)
- This applies to **every** domain/application object property, not just IDs — a raw `String`/`Instant`/`Int` on a domain or application model is a smell. Wrap it (`CreatedAt(Instant)`, `MessageContent(String)`, etc.) even when the wrapper adds no validation today, so formatting/business rules always have a home to grow into later without a signature-breaking refactor.

### `fun interface` — for single-method ports

All use case interfaces and single-method ports:

```kotlin
fun interface CreateJuryUseCase {
    fun execute(command: CreateJuryCommand): Result<JuryResponse, UseCaseError>
}

fun interface TimeProviderPort {
    fun now(): Instant
}
```

Enables lambda instantiation in tests:
```kotlin
val fakeTime = TimeProviderPort { Instant.parse("2025-01-01T00:00:00Z") }
```

Every `fun interface` method — and the interface declaration itself — requires exhaustive KDoc: what it does, when/by whom it's called, and what each `Result` error case means. A use-case interface is a contract other engineers read *before* the implementation; undocumented, it forces them to go spelunking through the application service to understand the port they're about to inject.

### `object` / `data object` — for singletons and no-payload errors

```kotlin
data object JuryNameBlank : DomainError() { ... }  // preferred in sealed hierarchies
object DomainErrorMapper { fun map(e: DomainError): UseCaseError = ... }
```

`data object` over `object` inside sealed hierarchies — provides `toString()`, `equals()`, `hashCode()` that match data class behavior in tests.

---

## kotlin-result DSL

Library: `com.michael-bull.kotlin-result:kotlin-result:2.1.0`

### Core operations

```kotlin
// Create
Ok(value)
Err(DomainError.NameBlank)

// Transform success
result.map { it.toResponse() }           // Result<A,E> → Result<B,E>
result.andThen { useCase.execute(it) }   // Result<A,E> → Result<B,E> (flatMap)

// Transform error
result.mapError { DomainErrorMapper.map(it) }  // Result<A,E1> → Result<A,E2>

// Side effects
result.onSuccess { log.info("created: $it") }
result.onFailure { log.warn("failed: $it") }

// Unwrap
result.fold(
    success = { ResponseEntity.ok(JuryResponseDto.from(it)) },
    failure = { throw ApplicationException(it) },
)
result.getOrElse { return Err(UseCaseError.JuryNotFound) }
result.getOrThrow()  // only when failure is truly unexpected
```

### Chain pattern — controller to domain

```kotlin
// Controller
createUseCase.execute(dto.toCommand(companyId)).fold(
    success = { ResponseEntity.status(201).body(JuryResponseDto.from(it)) },
    failure = { throw ApplicationException(it) },
)

// Application service
Jury.create(command.companyId, command.name, now)
    .mapError { DomainErrorMapper.map(it) }
    .map { jury -> repository.save(jury).also { notificationPort.notify(it) } }
    .map { JuryResponse.from(it) }

// iam-api style — extension functions on Result
request.toCommand()
    .andThen { createGroupUseCase.create(it) }
    .map { it.toResponse() }
    .created()  // extension: Result<T, DomainError> → ResponseEntity<T>
```

### Do Not

- Mix `?.let {}` chains and `andThen {}` for the same error path
- Use `result.isOk` / `result.isErr` + raw access — use `fold` or `andThen`
- Throw exceptions from domain or application layers — return `Err()`
- Unwrap `Result` with `!!` — always handle the `Err` path explicitly

---

## Extension Functions

Use extension functions to keep controllers thin and domain classes clean:

### DTO ↔ Command mapping

```kotlin
// In controller package (not in domain)
fun CreateJuryRequestDto.toCommand(companyId: CompanyId) = CreateJuryCommand(
    companyId = companyId,
    name = this.name,
    description = this.description,
)

// On response DTO companion
data class JuryResponseDto(...) {
    companion object {
        fun from(jury: Jury) = JuryResponseDto(
            id = jury.id?.value,
            name = jury.name,
            status = jury.status.name,
        )
    }
}
```

### Result → ResponseEntity extensions (iam-api style)

```kotlin
fun <T> Result<T, DomainError>.ok(): ResponseEntity<T> =
    fold({ ResponseEntity.ok(it) }, { throw DomainException(it) })

fun <T> Result<T, DomainError>.created(): ResponseEntity<T> =
    fold({ ResponseEntity.status(HttpStatus.CREATED).body(it) }, { throw DomainException(it) })
```

---

## Companion Factory Pattern

Every aggregate uses `create()` / `rehydrate()` — never a public constructor:

```kotlin
class Request private constructor(...) {
    companion object {
        fun create(groupId: UUID, name: String, now: Instant): Result<Request, DomainError> {
            if (name.isBlank()) return Err(DomainError.RequestNameBlank)
            return Ok(Request(id = null, groupId = groupId, name = name,
                status = RequestStatus.DRAFT, createdAt = now, updatedAt = now))
        }

        fun rehydrate(id: UUID, groupId: UUID, name: String, status: RequestStatus,
                      createdAt: Instant, updatedAt: Instant): Request =
            Request(id, groupId, name, status, createdAt, updatedAt)
    }
}
```

**Why two factories?**
- `create()` — enforces domain invariants, returns `Result`
- `rehydrate()` — reconstitutes from trusted persistence data, skips validation, never returns `Err`

---

## Kotlin-Specific Spring Boot Patterns

### No-arg plugin for JPA/MongoDB

`pom.xml` must have `kotlin-noarg` plugin for `@Entity` and `@Document` classes:
```xml
<plugin>
    <groupId>org.jetbrains.kotlin</groupId>
    <artifactId>kotlin-maven-plugin</artifactId>
    <configuration>
        <compilerPlugins>
            <plugin>spring</plugin>
            <plugin>jpa</plugin>  <!-- generates no-arg constructor for @Entity -->
        </compilerPlugins>
    </configuration>
</plugin>
```

### Open classes for Spring proxies

`kotlin-allopen` (bundled in `kotlin-spring` plugin) handles `@Service`, `@Component`, `@Configuration` — no `open` keyword needed manually.

### Null safety with Spring

- Use `@NotNull` / `@Valid` on `@RequestBody` parameters
- Kotlin non-null types + Bean Validation: `@field:NotBlank val name: String`
- Constructor injection (not field injection) for Spring beans:
```kotlin
@Service
class CreateJuryService(        // constructor injection — immutable, testable
    private val repository: JuryRepositoryPort,
    private val timeProvider: TimeProviderPort,
) : CreateJuryUseCase { ... }
```

### Custom argument resolvers for JWT claims

```kotlin
@Target(AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
annotation class CallerCompanyId

@Component
class CompanyIdArgumentResolver : HandlerMethodArgumentResolver {
    override fun supportsParameter(param: MethodParameter) =
        param.hasParameterAnnotation(CallerCompanyId::class.java)

    override fun resolveArgument(param: MethodParameter, mavContainer: ModelAndViewContainer?,
                                  webRequest: NativeWebRequest, binderFactory: WebDataBinderFactory?): UUID {
        val jwt = (webRequest.userPrincipal as JwtAuthenticationToken).token
        return UUID.fromString(jwt.getClaimAsString("companyId"))
            ?: throw MissingClaimException("companyId")
    }
}
```

---

## Logging

```kotlin
private val log = KotlinLogging.logger {}  // kotlin-logging

log.info { "Jury created: ${jury.id}" }    // lambda — no string interpolation unless logged
log.warn { "Domain error: $error" }
log.error(ex) { "Unexpected error processing ${command.juryId}" }
```

Library: `io.github.oshai:kotlin-logging-jvm:7.0.x`

---

## Do Not

- Use `lateinit var` for injected dependencies — use constructor injection
- Use `!!` (non-null assertion) in production code — handle nulls explicitly
- Return `null` from domain methods that can fail — return `Result` or `Option`
- Use Java `Optional` — use Kotlin nullable types or `Result`
- Annotate interfaces with `@Service` — annotate the implementation class
- Use `companion object { val INSTANCE = ... }` — use `object` declarations directly
- Mix `data class` + mutable `var` fields — use `val` + `copy()` for mutation
- Extend domain entities with open inheritance — use sealed classes instead
- Use `Any` in function signatures — use proper sealed types
