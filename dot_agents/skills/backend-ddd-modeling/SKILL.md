---
name: ddd-modeling
description: DDD modeling rules for Kotlin/hexagonal Clean Architecture backends. Use when creating or reviewing domain entities, value objects, domain errors, domain events, use-case errors, commands, response models, or outbound ports. Covers Entity/VO patterns, Result-based error handling, sealed class hierarchies, and the two-level port structure.
---

# DDD Modeling — Kotlin / Hexagonal Architecture

Rules and templates for the domain and application layers. Always keep the domain free of ALL framework imports — no Spring, no `jakarta.*`, no Jackson, no persistence annotations. Behavior lives on the model, not in services.

## Entities

- Use `class` (not `data class`) — entities have identity, lifecycle, and events.
- Private constructor + companion object with:
  - `create(...)`: `Result<Entity, DomainError>` — validates invariants, emits events.
  - `rehydrate(...)`: no invariant validation, no events — restores persisted state; may still normalize/deduplicate incoming values (e.g. `ingredients.map { IngredientName.of(it) }.distinct()`) so downstream logic operates on canonical data.
  - Entities the domain only READS (catalog/read models) are immutable: private constructor + `rehydrate()` is their only factory — no setters, no lifecycle.
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

- `@JvmInline value class` for all domain primitives (IDs, typed strings, measures) and every single-field concept.
- Place in `domain/model/<feature>/`. Never use raw `UUID` or `String` where a typed VO exists.
- Validation/normalization lives inside the VO factory: `MyVO.of(raw)` is the ONLY way raw input becomes a domain value — normalize there (trim, lowercase, strip punctuation, fold plurals: whatever the concept needs). Private helpers stay private in the companion.
- Validity semantics live on the VO: expose well-named predicates (e.g. `val isValid: Boolean get() = value.isNotBlank()` — true when the normalized value still has content); application services and adapters never inspect `vo.value.isBlank()` or format internals outside the VO.

```kotlin
// Template: Value Object — identity, no validation needed
@JvmInline
value class MyEntityId(val value: String)

// Template: Value Object — normalization factory (only construction path for raw input)
@JvmInline
value class IngredientName private constructor(val value: String) {
    companion object {
        fun of(raw: String): IngredientName = IngredientName(normalize(raw))

        // lowercase, strip punctuation via Regex("[^\\p{L}\\p{N}]+"), trim, naive plural fold
        private fun normalize(raw: String): String = /* ... */ raw
    }
}
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

### Extracting events without losing them

- **Application services publish from the PRE-save aggregate**: pull events (`aggregate.pullEvents()`) and hand them to the event publisher/outbox BEFORE `repository.save(aggregate)` — never from the `save()` return value. Persistence adapters rehydrate the domain object, and a rehydrated instance has an empty `pendingEvents` — publishing post-save silently drops every event.
- **Aggregate copies must carry `pendingEvents`**: when an aggregate mutates by returning a new instance (the copy-based `update()` pattern), route construction through a private `copy(...)` helper that forwards the current `_events` list into the new instance, with newly emitted events appended. A copy that starts from an empty event list drops everything emitted before the mutation. Public `rehydrate(...)` stays event-free — persisted state has no pending events.

```kotlin
// Constructor gains an internal events parameter — rehydrate leaves the default, copy forwards
class MyEntity private constructor(
    val id: MyEntityId?,
    val name: String,
    events: List<DomainEvent> = emptyList(),
) {
    private val _events = events.toMutableList()

    // Copy-based mutation — pending events survive, new events append
    private fun copy(name: String): MyEntity =
        MyEntity(id, name, _events).also { it._events += MyDomainEvent.Updated(this.name, name) }
}
```

*(From talent-api PR40 session, 2026-09-10; reference: talent-api `Application.kt` private copy helper.)*

## Derived Properties & Stateless Logic

- Computed outcomes are **derived properties**, never stored fields: `val readyToCook: Boolean get() = missing.isEmpty()`. If a value can be computed from other members, expose a `get()` — do not persist or duplicate it.
- Stateless domain logic lives in **`object`s**: pure functions plus shared constants (`object RecipeSearch { fun rank(...): Result<Ranked, DomainError> }`, `object Staples { val names }`, `object IngredientCatalog { const val MAX_SUGGESTIONS = 10 }`).

## Documented Trade-offs

Every deliberate simplification carries a KDoc naming **the ceiling and the upgrade path** (e.g. "naive singularization — swap in a stemming library if false matches appear", "full-catalog load per search — push matching into SQL if the catalog grows"). A trade-off comment without an upgrade path is an unfinished decision.

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

## Aggregate Child Collections with Dedup

When an aggregate holds multiple child value objects where duplicates must be impossible:

- Model the child as a `data class` with **custom `equals`/`hashCode` scoped to identity properties only** — metadata (requester, reason, timestamps) is deliberately excluded from identity.
- Hold the collection as `Set<Child>` (hash-backed — `toSet()` / `setOf()` give `LinkedHashSet`: dedup by identity + stable iteration order for persistence).
- Replace-on-identity inside the aggregate: `collection - newItem + newItem` — `minus` drops the equal (same-identity) old item, `plus` adds the fresh one.
- Document the identity choice in the child's KDoc — custom `equals`/`hashCode` overriding data-class defaults is load-bearing and must not read as a bug.

## Closed Vocabularies

- A closed set of values is a **domain enum** in `domain/model/` — never String labels on domain or application internals.
- Wire and persistence values are `enum.name` (e.g. `ALL`, `USER`, `GROUP`, `JOB_OFFER`).
- Pair the enum with a smart constructor `from(...)` on the related sealed hierarchy when ids are involved (e.g. `ExclusionTarget.from(type, id)`) — it owns the id-presence rules and returns null on mismatch; callers map that to a validation error.

## Forbidden

- `@Document`, `@JsonProperty`, `@Field` on any class in `domain/model/`.
- `data class` for entities with identity, lifecycle, or events.
- Forbidden package names: `adapters`, `ports`, `commands`, `errors`, `services`, `models`, `usecase`, `shared`, `api`, `spi`.
- Cross-domain ports in `domain/port/outbound/` — those belong in `application/port/outbound/`.
- Constructing a Value Object (`MyEntityId(...)`) from a raw primitive anywhere other than `toCommand()` in a DTO.
