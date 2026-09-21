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

    // Internal errors (should not happen in normal flows)
    data class Internal(override val message: String) : UseCaseError() {
        override val code = "INTERNAL_ERROR"
    }
}
```

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
        // Add else -> UseCaseError.BadRequest(error.code, error.message) as fallback
        // but prefer exhaustive mapping for compile-time safety
    }
}
```

**Mapper in application layer** — never in domain, never in adapters.

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
)
```

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
