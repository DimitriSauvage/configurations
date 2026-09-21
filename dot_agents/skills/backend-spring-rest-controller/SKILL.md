---
name: spring-rest-controller
description: REST controller conventions for Spring Boot backends. Use when creating or reviewing a Spring Boot REST controller, adding OpenAPI/Swagger annotations (@Tag, @Operation, response-doc annotations, @Parameter, @RequestBody), or mapping a DTO to a Command. Covers the DTO→Command mapping rule (Value Object wrapping), controller structure, and reusable OpenAPI response-doc meta-annotations.
---

# Spring REST Controller

Rules for the `adapter/inbound/web/` layer. Controllers call one use case, fold the result, and delegate error mapping to a shared `ApplicationErrorHandler`. Zero business logic.

## Controller Rules

- Controllers depend on **use-case ports only** — never on `..application.service..` implementations. Constructor injection.
- **Thin method body**: build the DTO → `toCommand()` → `useCase.execute(command).fold(success = {...}, failure = { throw ApplicationException(it) })`. Nothing else.
- **`produces = [MediaType.APPLICATION_JSON_VALUE]` on every mapping** (`@GetMapping`, `@PostMapping`, …).
- **Success returns `ResponseEntity.ok(...)`** (201 only for explicit creation). Non-2xx statuses are decided by the error advice, never by controller branching.
- **Parameter validation via `@Min`/`@Max` on the handler params** (jakarta.validation.constraints), relying on Spring MVC's built-in method validation. **NO class-level `@Validated`** — it would trigger AOP method validation and bypass the `HandlerMethodValidationException` path the error advice handles.

## OpenAPI / Swagger Annotations

Every endpoint **must** be fully annotated.

### Class level

```kotlin
@Tag(name = "ResourceName", description = "Short description of the resource")
```

### Method level — mandatory on every endpoint

```kotlin
@Operation(
    summary = "Short action title",
    description = "Detailed description of the operation.",
)
```

### Response-doc meta-annotations

Define reusable, composed OpenAPI response-doc annotations per HTTP status so controllers stay declarative instead of repeating a `@ApiResponse` block on every endpoint. Apply the relevant subset to every endpoint:

| Composed annotation (example naming) | HTTP status |
|---|---|
| `@SuccessResponseDoc` | 200 OK |
| `@CreatedResponseDoc` | 201 Created |
| `@ValidationErrorResponseDoc` | 400 Bad Request |
| `@UnauthorizedResponseDoc` | 401 Unauthorized |
| `@NotFoundResponseDoc` | 404 Not Found |
| `@ConflictResponseDoc` | 409 Conflict |
| `@UnprocessableResponseDoc` | 422 Unprocessable Entity |
| `@ServerErrorResponseDoc` | 500 Internal Server Error |

Each composed annotation is a meta-annotation combining `@ApiResponse` + the shared error envelope schema (`ErrorResponse`) + **named `ExampleObject` JSON examples for every error case of that status** (e.g. `missingParameter` / `invalidParameter` for 400), so the actual attributes live in one place instead of being copy-pasted per endpoint.

### Path variables

```kotlin
@Parameter(
    description = "Unique identifier of the resource",
    example = "665a1b2c3d4e5f6a7b8c9d0e",
    required = true,
    `in` = ParameterIn.PATH,
)
@PathVariable id: String
```

### Query parameters — method validation

Constraints live on the handler parameters; there is **no class-level `@Validated`** (see Controller Rules):

```kotlin
@RequestParam(required = false)
@Min(0)
@Max(10_000) page: Int?,
@RequestParam(required = false)
@Min(1)
@Max(100) size: Int?,
```

A violation surfaces as `HandlerMethodValidationException` → typed 400 (`INVALID_PARAMETER`) from the error advice. Boundary values of the constraints are covered by `@WebMvcTest` assertions.

### Request bodies

```kotlin
@io.swagger.v3.oas.annotations.parameters.RequestBody(
    required = true,
    description = "Payload for creating/updating the resource",
    content = [Content(mediaType = "application/json", schema = Schema(implementation = MyRequestDto::class))],
)
```

### Server-Sent Events (SSE) endpoints

A controller method returning `SseEmitter` (`produces = [MediaType.TEXT_EVENT_STREAM_VALUE]`) is documented the same way as any other endpoint, with the response content type and named-event schema made explicit:

```kotlin
@Operation(
    summary = "Stream the assistant's reply",
    description = "Server-Sent Events stream. The event name (message_chunk / message_complete / error) " +
        "identifies which payload schema the `data:` JSON line conforms to.",
)
@ApiResponse(
    responseCode = "200",
    description = "SSE stream established.",
    content = [
        Content(
            mediaType = MediaType.TEXT_EVENT_STREAM_VALUE,
            schema = Schema(
                oneOf = [MessageChunkPayload::class, MessageCompletePayload::class, ErrorPayload::class],
                description = "JSON payload inside the SSE `data:` field; the concrete schema is selected by the SSE `event:` name.",
            ),
        ),
    ],
)
```

Do not use `@SuccessResponseDoc` here — the plain `@ApiResponse` above is required because the `oneOf` + streaming media type isn't expressible through the simple 200-OK meta-annotation.

### Forbidden

- Endpoints without `@Operation`.
- Controllers without `@Tag`.
- `@PathVariable` parameters without `@Parameter`.
- `@RequestBody` without the Swagger `@RequestBody` annotation.

---

## DTO → Command Mapping Rule

The DTO's `toCommand()` is the **only place** where raw primitives (`String`, `UUID`, …) are wrapped into domain Value Objects. Commands must carry fully-typed domain objects.

```kotlin
// ✅ Correct — wrapping in toCommand()
fun toCommand(entityId: String) = UpdateMyEntityCommand(
    id = MyEntityId(entityId),
    name = name,
)
data class UpdateMyEntityCommand(val id: MyEntityId, val name: String)

// ❌ Wrong — service wrapping a primitive from the command
repository.findByIdAndName(MyEntityId(command.id), command.name)

// ❌ Wrong — controller wrapping before calling toCommand()
val command = dto.toCommand(MyEntityId(id))
```

Neither controllers nor services must construct a Value Object from a raw primitive.

Response DTOs are built **from application models** via `companion object { fun from(...) }`, and every field carries `@field:Schema(description = ..., example = ...)`. Request DTOs are dumb param holders — no normalization, no domain imports beyond what `toCommand()` produces.

---

## Merge-Patch (RFC 7396) DTO Pattern

A PATCH DTO must distinguish "field present with `null`" (clear the value) from "field absent" (keep the current value) — a plain nullable cannot express both.

- **Clearable scalars use `Patchable<T>`** on the DTO field: `Absent` (keep), `Present(null)` (clear), `Present(value)` (set). `toCommand()` folds the three states into the command.
- **The `Patchable` deserializer is domain-local** (e.g. `PatchableStringDeserializer` in each domain's own DTO package). Onion rules forbid cross-domain imports, so each domain keeps its own copy — the duplication is deliberate, not a refactor target.
- **Fields where clearing is illegal stay plain nullable** with KDoc stating that clearing is rejected — do not widen them to `Patchable` for symmetry.

When testing explicit-null patch bodies, build them as raw literals or `JsonNode`, never via the app `ObjectMapper` (`NON_NULL` drops null keys — see `unit-testing`).

*(From talent-api PR40 session, 2026-09-10; reference implementations: talent-api profile c73d814, job 7eb87eb.)*

---

## Controller Structure Template

```kotlin
@Tag(name = "MyResource", description = "Operations related to my resource")
@RestController
@RequestMapping("/api/v1/my-resources")
class MyResourceController(
    private val createUseCase: CreateMyResourceUseCase,
    private val getUseCase: GetMyResourceUseCase,
) {
    @Operation(summary = "Create a resource", description = "Creates a new resource.")
    @CreatedResponseDoc
    @ValidationErrorResponseDoc
    @UnauthorizedResponseDoc
    @ServerErrorResponseDoc
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        description = "Payload for creating the resource",
        content = [Content(mediaType = "application/json", schema = Schema(implementation = CreateMyResourceRequestDto::class))],
    )
    @PostMapping
    fun create(
        @Valid @RequestBody dto: CreateMyResourceRequestDto,
    ): ResponseEntity<CreateMyResourceResponseDto> =
        createUseCase.execute(dto.toCommand()).fold(
            success = { ResponseEntity.status(HttpStatus.CREATED).body(CreateMyResourceResponseDto.from(it)) },
            failure = { throw ApplicationException(it) },
        )

    @Operation(summary = "Get a resource by ID", description = "Retrieves a resource by its unique identifier.")
    @SuccessResponseDoc
    @UnauthorizedResponseDoc
    @NotFoundResponseDoc
    @ServerErrorResponseDoc
    @GetMapping("/{id}")
    fun getById(
        @Parameter(description = "Unique identifier of the resource", example = "665a1b2c3d4e5f6a7b8c9d0e", required = true, `in` = ParameterIn.PATH)
        @PathVariable id: String,
    ): ResponseEntity<MyResourceDetailResponseDto> =
        getUseCase.execute(GetMyResourceQuery(id = id)).fold(
            success = { ResponseEntity.ok(MyResourceDetailResponseDto.from(it)) },
            failure = { throw ApplicationException(it) },
        )
}
```
