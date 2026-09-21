---
name: constants-discipline
description: Eliminates magic strings and magic numbers by placing constants where they belong (enum wire values, class-local consts, shared modules) and defines which literals stay inline. Use when asked to "remove magic strings", "extract constants", "fix magic numbers", or "clean up hardcoded values". Not for general refactoring or i18n strings.
---

# Constants Discipline

Eliminate magic strings/numbers without creating grab-bag `Constants.kt` files. Constants live **near their use**; shared homes exist only for cross-module values.

## Decision Ladder (stop at first rung that holds)

1. **It's a wire value of a domain concept?** → `const val *_WIRE` on the enum/model's own companion object. The constant names the enum member's serialized form and lives next to it.
2. **Used by one class only?** → `private const val` in that class's companion object.
3. **Shared across modules (pagination, regex, common field names)?** → top-level `const val` in the shared module's single-values file (e.g. `common/Values.kt`).
4. **Repeated OpenAPI `example =` literal across 2+ DTO files?** → shared ApiExamples object. One-off examples stay literal.
5. **Group of keywords mapping to values?** → private ordered `List<Pair<Value, List<String>>>` table (order matters — document it), not an if/else chain.

## Wire-Value Rules

- Wire values = lowercase enum names unless the API contract says otherwise. Document the convention once per companion: `/** Wire values (lowercase enum names) — swagger X schemas. */`
- DTO `@Schema(allowableValues = [...])`/`example =` MUST reference domain `*_WIRE` consts, never re-declare literals. Annotation args accept `const val` references.
- Persistence adapters must also use the same consts for defaults and parsing.

## Deliberate Magic (leave inline — do NOT extract)

- **Config key paths** in `@Value`/`@ConditionalOnProperty` — Spring annotation contract, they are the keys themselves.
- **Legal/regulatory references** in prose (e.g. "GDPR Art. 15" in comments/docs) — not logic values.
- **Driver/library API names** used once at the call site (e.g. Mongo `$rerank`, `numDocsToRerank`) — extract only when a sibling const already exists.
- **Test assertion literals** that independently verify a production constant — swapping them for the prod const makes the assertion tautological.

## Guarded Duplication Exception

When architecture (e.g. Clean/Hexagonal layer rules) forbids one layer from referencing another's constants, a two-source-of-truth duplication is acceptable ONLY with a startup guard that fails the boot on divergence. Never allow silent drift.

## Anti-Patterns

- ❌ One god-file `Constants.kt` / `Consts.kt` with 100 unrelated values.
- ❌ `interface Consts` implementation-inheritance constant holders.
- ❌ Re-declaring a wire value in a DTO when the domain enum already exports it.
- ❌ Extracting every unique `@Schema example` — doc-only, single-use literals stay inline.
- ❌ Extracting a number that appears once with a self-documenting context.

## Verification

After a constants sweep: compile + unit tests, then grep for the extracted literals in logic sites (exclude annotations, KDoc, and the const declarations themselves). Expect zero hits.
