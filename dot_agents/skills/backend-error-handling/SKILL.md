---
name: error-handling
description: |
  End-to-end error handling conventions for Beetween backend services. Covers the two-layer error model (DomainError + UseCaseError), kotlin-result DSL, domain-to-use-case error mapping, REST error responses, @RestControllerAdvice, optimistic lock conflict handling, and Bean Validation error responses. Use when implementing error handling in any layer of a Beetween backend service.
---

# Error Handling — Beetween Backend

## When to Use This Skill

- Designing `DomainError` and `UseCaseError` for a new bounded context
- Implementing `DomainErrorMapper` to bridge domain and application
- Configuring `@RestControllerAdvice` to map errors to HTTP responses
- Handling optimistic lock conflicts in JPA adapters
- Returning consistent JSON error responses
- Deciding when to use `throw` vs `return Err()`

---

## Two-Layer Error Model

```
Domain layer:    DomainError  (sealed, pure Kotlin)
                     ↓ DomainErrorMapper.map()
Application layer: UseCaseError (sealed, no HTTP semantics)
                     ↓ ApplicationException(useCaseError)
Adapter layer:   @RestControllerAdvice maps UseCaseError → HttpStatus
                     ↓
HTTP client:     ErrorResponse JSON { code, message, status, path, metadata? }
```

**No exceptions cross domain or application boundaries** — all failures are typed `Result`.

---

## DomainError

```kotlin
// domain/error/DomainError.kt
sealed class DomainError {
    abstract val code: String
    abstract val message: String

    // No-payload errors — data object
    data object JuryNameBlank : DomainError() {
        override val code = "JURY_NAME_BLANK"
        override val message = "Jury name cannot be blank"
    }
    data object JuryNotEditable : DomainError() {
        override val code = "JURY_NOT_EDITABLE"
        override val message = "Jury cannot be modified in its current status"
    }
    data object NotSessionLeader : DomainError() {
        override val code = "NOT_SESSION_LEADER"
        override val message = "Only the session leader can perform this action"
    }

    // Payload errors — data class
    data class InvalidDateRange(val start: Instant, val end: Instant) : DomainError() {
        override val code = "INVALID_DATE_RANGE"
        override val message = "Start date $start must be before end date $end"
    }
    data class IdpNotFound(val aliases: Set<String>) : DomainError() {
        override val code = "IDP_NOT_FOUND"
        override val message = "Identity providers not found: $aliases"
    }
}
```

**Rules:**

- One `DomainError` sealed class per bounded context
- `data object` for stateless errors, `data class` for errors with context
- No HTTP concepts (`HttpStatus`, response codes) in domain errors
- Domain errors are final — never subclass them outside the domain package

---

## UseCaseError

```kotlin
// application/error/UseCaseError.kt
sealed class UseCaseError {
    abstract val code: String
    abstract val message: String

    // Grouped by HTTP semantics — enables exhaustive mapping in the advice
    sealed class NotFound : UseCaseError() {
        data object JuryNotFound : NotFound() {
            override val code = "JURY_NOT_FOUND"
            override val message = "Jury not found"
        }
        data object MemberNotFound : NotFound() {
            override val code = "MEMBER_NOT_FOUND"
            override val message = "Member not found"
        }
    }

    sealed class Conflict : UseCaseError() {
        data class ActiveJuryAlreadyExists(val conflictingJuryId: String) : Conflict() {
            override val code = "ACTIVE_JURY_ALREADY_EXISTS"
            override val message = "An active jury already exists for this company"
        }
    }

    sealed class Unprocessable : UseCaseError() {
        data object JuryNameBlank : Unprocessable() {
            override val code = "JURY_NAME_BLANK"
            override val message = "Jury name cannot be blank"
        }
        data object JuryNotEditable : Unprocessable() {
            override val code = "JURY_NOT_EDITABLE"
            override val message = "Jury cannot be modified in its current status"
        }
    }

    sealed class Unauthorized : UseCaseError() {
        data object InsufficientPermissions : Unauthorized() {
            override val code = "INSUFFICIENT_PERMISSIONS"
            override val message = "You do not have permission to perform this action"
        }
    }

    sealed class Gone : UseCaseError() {
        data object NoticeTokenExpired : Gone() {
            override val code = "NOTICE_TOKEN_EXPIRED"
            override val message = "The notice token has expired"
        }
    }

    // External/upstream provider integration failures — timeouts, 5xx, auth misconfiguration on OUR
    // side calling the provider, or a resilience4j circuit breaker OPEN (CallNotPermittedException).
    // Maps to HTTP 503. Never map an upstream 401 to our own Unauthorized — the caller already passed
    // OUR auth check; a provider-side 401 is an operational/config problem on our backend, not theirs.
    sealed class UpstreamUnavailable : UseCaseError() {
        data class ProviderUnreachable(val detail: String) : UpstreamUnavailable() {
            override val code = "UPSTREAM_UNAVAILABLE"
            override val message = "The upstream provider is unavailable: $detail"
        }
    }

    // Catch-all for unexpected domain errors
    data class BadRequest(override val code: String, override val message: String) : UseCaseError()

    // Reserved fallback — not constructed by current use cases; kept so the exhaustive
    // `when`s in the mapper and the advice force new domain errors to be wired through a
    // semantic group rather than silently reusing this one. Maps to HTTP 400.
    data class DomainValidation(override val code: String, override val message: String) : UseCaseError()

    // Reserved catch-all (maps to HTTP 500) — should not happen in normal flows
    data class Internal(override val message: String) : UseCaseError() {
        override val code = "INTERNAL_ERROR"
    }
}
```

**Reserved fallbacks.** `DomainValidation` (→ 400) and `Internal` (→ 500) are reserved: no use case constructs them in normal flows. They exist so the exhaustive `when`s in `DomainErrorMapper` and the advice force every new domain error to be wired through a semantic group instead of silently reusing the fallback.

---

## DomainErrorMapper

```kotlin
// application/error/DomainErrorMapper.kt
object DomainErrorMapper {
    fun map(error: DomainError): UseCaseError = when (error) {
        DomainError.JuryNameBlank    -> UseCaseError.Unprocessable.JuryNameBlank
        DomainError.JuryNotEditable  -> UseCaseError.Unprocessable.JuryNotEditable
        DomainError.NotSessionLeader -> UseCaseError.Unauthorized.InsufficientPermissions
        is DomainError.InvalidDateRange -> UseCaseError.Unprocessable.JuryNameBlank  // map with context if needed
        is DomainError.IdpNotFound      -> UseCaseError.BadRequest(
            code = error.code, message = error.message
        )
        // NO `else` branch: the `when` is exhaustive over the sealed hierarchy, so a new
        // DomainError case breaks compilation until it is explicitly wired here.
    }
}
```

**Mapper in application layer** — never in domain, never in adapters. Exhaustive `when`, **no `else` branch** — the compiler enforces wiring of every new case.

---

## Application Service — Result chain

```kotlin
@Service
class CreateJuryService(
    private val repository: JuryRepositoryPort,
    private val timeProvider: TimeProviderPort,
) : CreateJuryUseCase {

    override fun execute(command: CreateJuryCommand): Result<JuryResponse, UseCaseError> =
        Jury.create(command.companyId, command.name, timeProvider.now())
            .mapError { DomainErrorMapper.map(it) }               // DomainError → UseCaseError
            .map { jury -> repository.save(jury) }                // persist
            .map { saved -> JuryResponse.from(saved) }            // map to response
}
```

For sequential operations with early exit:

```kotlin
override fun execute(command: ApproveRequestCommand): Result<RequestResponse, UseCaseError> {
    val request = repository.findByIdAndGroupId(command.requestId, command.groupId)
        ?: return Err(UseCaseError.NotFound.RequestNotFound)

    return request
        .approve(command.approverId, command.comment, timeProvider.now())
        .mapError { DomainErrorMapper.map(it) }
        .map { approved ->
            val saved = repository.save(approved)
            notificationPort.notifyApproved(saved, command.approverId)
            RequestResponse.from(saved)
        }
}
```

---

## Controller — Result unwrapping

```kotlin
// fold pattern (jury-api style)
fun create(...): ResponseEntity<JuryResponseDto> =
    createJuryUseCase.execute(dto.toCommand(companyId)).fold(
        success = { ResponseEntity.status(HttpStatus.CREATED).body(JuryResponseDto.from(it)) },
        failure = { throw ApplicationException(it) },
    )

// andThen + map + extension (iam-api style)
fun create(...): ResponseEntity<GroupResponse> =
    dto.toCommand()
        .andThen { createGroupUseCase.create(it) }
        .map { it.toResponse() }
        .created()   // extension on Result<T, DomainError> → ResponseEntity<T>
```

Both are valid — use whichever is established in the service.

---

## @RestControllerAdvice

```kotlin
// adapter/inbound/web/errormanager/ApplicationErrorHandler.kt
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
class ApplicationErrorHandler {

    private val log = KotlinLogging.logger {}

    @ExceptionHandler(ApplicationException::class)
    fun handleApplicationException(
        ex: ApplicationException,
        request: HttpServletRequest,
    ): ResponseEntity<ErrorResponse> {
        val status = resolveStatus(ex.error)
        val metadata = buildMetadata(ex.error)
        log.warn { "Application error [${status.value()}] ${ex.error.code}: ${ex.error.message}" }
        return ResponseEntity.status(status).body(
            ErrorResponse(
                timestamp = Instant.now(),
                status = status.value(),
                error = status.reasonPhrase,
                path = request.requestURI,
                code = ex.error.code,
                message = ex.error.message,
                metadata = metadata,
            )
        )
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(
        ex: MethodArgumentNotValidException,
        request: HttpServletRequest,
    ): ResponseEntity<ErrorResponse> {
        val details = ex.bindingResult.fieldErrors.map { "${it.field}: ${it.defaultMessage}" }
        return ResponseEntity.badRequest().body(
            ErrorResponse(
                timestamp = Instant.now(),
                status = 400,
                error = "Bad Request",
                path = request.requestURI,
                code = "VALIDATION_ERROR",
                message = "Request validation failed",
                details = details,
            )
        )
    }

    private fun resolveStatus(error: UseCaseError): HttpStatus = when (error) {
        is UseCaseError.NotFound           -> HttpStatus.NOT_FOUND
        is UseCaseError.Conflict           -> HttpStatus.CONFLICT
        is UseCaseError.Unauthorized       -> HttpStatus.FORBIDDEN
        is UseCaseError.Gone               -> HttpStatus.GONE
        is UseCaseError.Unprocessable      -> HttpStatus.UNPROCESSABLE_ENTITY
        is UseCaseError.UpstreamUnavailable-> HttpStatus.SERVICE_UNAVAILABLE
        is UseCaseError.BadRequest         -> HttpStatus.BAD_REQUEST
        is UseCaseError.Internal           -> HttpStatus.INTERNAL_SERVER_ERROR
    }

    private fun buildMetadata(error: UseCaseError): Map<String, Any>? = when (error) {
        is UseCaseError.Conflict.ActiveJuryAlreadyExists ->
            mapOf("conflictingJuryId" to error.conflictingJuryId)
        else -> null
    }
}
```

Status mapping is exhaustive over the sealed groups, **no `else`**: `NotFound` → 404, `Unprocessable` → 422, `Conflict` → 409, `DomainValidation`/`BadRequest` → 400, `Internal` → 500. A new `UseCaseError` group breaks compilation until wired.

### ApplicationException

```kotlin
class ApplicationException(val error: UseCaseError) : RuntimeException(error.message)
```

### ErrorResponse shape

```kotlin
data class ErrorResponse(
    val timestamp: Instant,
    val status: Int,
    val error: String,
    val path: String,
    val code: String,
    val message: String,
    val details: List<String> = emptyList(),    // Bean Validation field errors
    val metadata: Map<String, Any>? = null,     // conflict IDs, etc.
) {
    companion object {
        fun of(status: HttpStatus, path: String, code: String, message: String) = ErrorResponse(
            timestamp = Instant.now(),
            status = status.value(),
            error = status.reasonPhrase,
            path = path,
            code = code,
            message = message,
        )
    }
}
```

**One envelope for every error path** — application errors, framework parameter errors, and the 500 catch-all all return this same `ErrorResponse`, built via the `of(...)` factory.

---

## Framework Parameter Errors — Typed Codes

Framework-level parameter errors get typed codes too, through the same `ErrorResponse` envelope:

| Exception | Code | Status |
|---|---|---|
| `MissingServletRequestParameterException` | `MISSING_PARAMETER` | 400 |
| `MethodArgumentTypeMismatchException` | `INVALID_PARAMETER` | 400 |
| `HandlerMethodValidationException` (`@Min`/`@Max` on handler params) | `INVALID_PARAMETER` | 400 |
| `MethodArgumentNotValidException` (`@RequestBody` Bean Validation) | `VALIDATION_ERROR` | 400 |

```kotlin
@ExceptionHandler(MissingServletRequestParameterException::class)
fun handleMissingParameter(
    ex: MissingServletRequestParameterException,
    request: HttpServletRequest,
): ResponseEntity<ErrorResponse> {
    log.warn { "400 MISSING_PARAMETER on ${request.requestURI}: '${ex.parameterName}' is missing" }
    return ResponseEntity.badRequest().body(
        ErrorResponse.of(HttpStatus.BAD_REQUEST, request.requestURI, "MISSING_PARAMETER",
            "Required parameter '${ex.parameterName}' is missing")
    )
}
```

User-controlled values echoed into log lines ALWAYS pass through `sanitizeForLog()` (below).

## Unexpected Exceptions — the 500 Path

One catch-all `@ExceptionHandler(Exception::class)`:

```kotlin
@ExceptionHandler(Exception::class)
fun handleUnexpected(ex: Exception, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
    // Rethrowing makes the resolver chain fall through to Spring's default handling,
    // keeping 404/405/406/415. Fully qualified: this package has its own ErrorResponse.
    if (ex is org.springframework.web.ErrorResponse) throw ex
    // A client that disconnected mid-response is expected noise, not a server failure.
    if (ex is ClientAbortException) {
        log.debug { "client aborted the connection on ${request.requestURI}: ${ex.message}" }
        throw ex
    }
    log.error { "500 INTERNAL_ERROR on ${request.requestURI}: ${ex.javaClass.simpleName}: ${ex.message}" }
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
        ErrorResponse.of(HttpStatus.INTERNAL_SERVER_ERROR, request.requestURI, "INTERNAL_ERROR",
            "An unexpected error occurred")
    )
}
```

Rules:

- Log `error`, return 500 `INTERNAL_ERROR` with a **generic message** — internals (stack traces, class names) stay in logs, never in the response body
- Rethrow `org.springframework.web.ErrorResponse` so Spring keeps its native 404/405/406/415 handling
- `ClientAbortException` is debug-logged and rethrown

## Log-Injection Guard (OWASP A09)

User-controlled values (query params, request bodies, path segments) must never be echoed raw into log lines — control characters could forge entries:

```kotlin
// Log-injection guard: control characters in a user-supplied value could forge log entries;
// the JSON response body is Jackson-encoded and needs no sanitizing.
private val controlCharacters = Regex("\\p{Cntrl}")

internal fun sanitizeForLog(value: Any?): String = value.toString().replace(controlCharacters, "_")
```

## Logging Levels

kotlin-logging (`KotlinLogging.logger {}`) with **lambda message syntax**; level follows the status:

```kotlin
if (status == HttpStatus.INTERNAL_SERVER_ERROR) {
    log.error { "500 ${error.code}: ${error.message}" }
} else {
    log.warn { "${status.value()} ${error.code}: ${error.message}" }
}
```

`warn` for 4xx, `error` for 5xx — never `error` for expected client failures.

---

## Optimistic Lock Conflict

Wrap `ObjectOptimisticLockingFailureException` in a domain-meaningful exception from the adapter:

```kotlin
// adapter/outbound/persistence/adapter/RequestRepositoryAdapter.kt
override fun save(request: Request): Request {
    return try {
        mapper.toDomain(jpaRepository.save(mapper.toEntity(request)))
    } catch (ex: ObjectOptimisticLockingFailureException) {
        throw ConcurrencyConflictException("Concurrent update detected on request ${request.id}", ex)
    }
}

// domain/error/ConcurrencyConflictException.kt (or application/error/)
class ConcurrencyConflictException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)
```

Handle in `@RestControllerAdvice`:

```kotlin
@ExceptionHandler(ConcurrencyConflictException::class)
fun handleConcurrencyConflict(ex: ConcurrencyConflictException, request: HttpServletRequest): ResponseEntity<ErrorResponse> =
    ResponseEntity.status(HttpStatus.CONFLICT).body(
        ErrorResponse(timestamp = Instant.now(), status = 409, error = "Conflict",
            path = request.requestURI, code = "CONCURRENCY_CONFLICT", message = ex.message ?: "Concurrent modification")
    )
```

---

## Do Not

- Throw `RuntimeException` from domain or application layers — return `Err()`
- Use `try/catch` in application services — use `Result` chain operators
- Add HTTP concepts to `DomainError` — `HttpStatus` belongs only in the advice
- Use `else -> ...` in `when(useCaseError)` in the advice — keep it exhaustive so new errors force a branch
- Return different error shapes from different controllers — use one `ErrorResponse` class
- Swallow errors with `onFailure { log.warn(...) }` without propagating — always return or throw
- Map every `DomainError` to `UseCaseError.Internal` — each error needs a meaningful HTTP status

---

## Error Code Naming Convention

Use stable, uppercase snake-case error codes across all layers.

Rules:

- Format: `CONTEXT_REASON` (example: `JURY_NAME_BLANK`)
- Prefer domain language over technical exception names
- Keep codes stable over time; message text may evolve
- Do not use lowercase, kebab-case, or localized strings for codes

Recommended ownership:

- Domain errors define canonical codes
- UseCaseError keeps same code unless semantic remapping is required
- REST error response exposes the code unchanged for clients
