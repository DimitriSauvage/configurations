---
name: ddd-modeling
description: DDD modeling rules for Kotlin/hexagonal Clean Architecture backends. Use when creating or reviewing domain entities, value objects, domain errors, domain events, use-case errors, commands, response models, or outbound ports. Covers Entity/VO patterns, Result-based error handling, sealed class hierarchies, and the two-level port structure.
---

# DDD Modeling — Kotlin / Hexagonal Architecture

Rules and templates for the domain and application layers. Always keep the domain free of Spring/persistence-framework imports.

## Entities

- Use `class` (not `data class`) — entities have identity, lifecycle, and events.
- Private constructor + companion object with:
  - `create(...)`: `Result<Entity, DomainError>` — validates invariants, emits events.
  - `rehydrate(...)`: no validation, no events, no side-effects — restores persisted state.
- Accumulate domain events in a private `mutableListOf<DomainEvent>()`; expose via `pullEvents()`.

```kotlin
// Template: Entity
class MyEntity private constructor(
    val id: MyEntityId?,
    val name: String,
    // ... other fields
) {
    private val _events = mutableListOf<DomainEvent>()
    fun pullEvents(): List<DomainEvent> = _events.toList().also { _events.clear() }

    companion object {
        fun create(name: String): Result<MyEntity, DomainError> {
            if (name.isBlank()) return Err(MyDomainError.NameBlank)
            val entity = MyEntity(id = null, name = name.trim())
            entity._events += MyDomainEvent.Created(name)
            return Ok(entity)
        }

        fun rehydrate(id: MyEntityId, name: String): MyEntity =
            MyEntity(id = id, name = name)
    }

    fun update(name: String): Result<MyEntity, DomainError> {
        if (name.isBlank()) return Err(MyDomainError.NameBlank)
        return Ok(MyEntity(id = this.id, name = name.trim()))
    }
}
```

## Value Objects

- `@JvmInline value class` for all domain primitives (IDs, typed strings, measures).
- Place in `domain/model/<feature>/`. Never use raw `UUID` or `String` where a typed VO exists.

```kotlin
// Template: Value Object
@JvmInline
value class MyEntityId(val value: String)
```

## Domain Errors

- `DomainError` is an `abstract class` in `domain/error/DomainError.kt`. Each feature declares a `sealed class MyFeatureDomainError : DomainError()` in `domain/error/`.
- Each case is a `data object` with a stable `code` and `message`.
- Never throw for expected domain failures — return `Err(MyFeatureDomainError.*)`.

```kotlin
// domain/error/DomainError.kt — shared base
abstract class DomainError {
    abstract val code: String
    abstract val message: String
}

// domain/error/MyFeatureDomainErrors.kt — feature errors
sealed class MyFeatureDomainError : DomainError() {
    data object EntityNotFound : MyFeatureDomainError() {
        override val code = "ENTITY_NOT_FOUND"
        override val message = "The entity was not found."
    }
}
```

## Domain Events

- Sealed class in `domain/event/<feature>/`. Model as `data class` with all relevant fields.

```kotlin
sealed class MyDomainEvent {
    data class Created(val name: String) : MyDomainEvent()
    data class Updated(val oldName: String, val newName: String) : MyDomainEvent()
}
```

## Use-Case Errors

- Single `UseCaseError` sealed class in `application/error/UseCaseError.kt` — shared across all features.
- Map from `DomainError` via `toUseCaseError()` extension in `application/error/DomainErrorExtensions.kt`.
- Group by HTTP category: `NotFound`, `Conflict`, `Unprocessable`, `DomainValidation`.

```kotlin
sealed class UseCaseError {
    abstract val code: String
    abstract val message: String

    sealed class NotFound : UseCaseError() {
        data object EntityNotFound : NotFound() {
            override val code = "ENTITY_NOT_FOUND"
            override val message = "The entity was not found."
        }
    }

    data class DomainValidation(override val code: String, override val message: String) : UseCaseError()
}

fun DomainError.toUseCaseError(): UseCaseError =
    UseCaseError.DomainValidation(code = this.code, message = this.message)
```

## Commands & Response Models

- **Commands**: `data class` in `application/command/<feature>/` — boundary between inbound adapter and use case. Must carry fully-typed domain objects (Value Objects), never raw primitives.
- **Responses**: `data class` in `application/model/<feature>/` — adapters map these to their own DTOs.

```kotlin
// Command — domain VOs, not raw primitives
data class UpdateMyEntityCommand(
    val id: MyEntityId,
    val name: String,
)

// Response model
data class MyEntityResponse(val id: String, val name: String) {
    companion object {
        fun from(entity: MyEntity): MyEntityResponse =
            MyEntityResponse(id = entity.id!!.value, name = entity.name)
    }
}
```

## Outbound Ports — Two Levels

| Package | Purpose |
|---|---|
| `domain/port/outbound/<feature>/` | Resource ports — the feature's own data needs |
| `application/port/outbound/` | Cross-feature and transversal service ports |

## Forbidden

- `@Document`, `@JsonProperty`, `@Field` on any class in `domain/model/`.
- `data class` for entities with identity, lifecycle, or events.
- Forbidden package names: `adapters`, `ports`, `commands`, `errors`, `services`, `models`, `usecase`, `shared`, `api`, `spi`.
- Cross-domain ports in `domain/port/outbound/` — those belong in `application/port/outbound/`.
- Constructing a Value Object (`MyEntityId(...)`) from a raw primitive anywhere other than `toCommand()` in a DTO.
