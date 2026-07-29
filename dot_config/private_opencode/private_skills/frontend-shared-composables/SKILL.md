---
name: shared-composables
description: DS-shipped composables for form validation, dirty/touched tracking, slot detection, ID generation, and viewport sizing. Use in Vue components instead of implementing per-app.
---

# Shared Composables

Composables shipped from `@beetween/design-system-ui` that are app-agnostic. Exported from `src/composables/index.ts`.

---

## Index

| Item                         | Doc                                                                                   | Purpose                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `useFallbackTextColor`       | [use-fallback-text-color.docs.md](./docs/use-fallback-text-color.docs.md)             | Returns a color utility class, or empty string if a `text-*` class is already present in attrs |
| `useFormValidation`          | [use-form-validation.docs.md](./docs/use-form-validation.docs.md)                     | Wraps native HTML5 constraint validation API for an input ref                                  |
| `useIsDirty`                 | [use-is-dirty.docs.md](./docs/use-is-dirty.docs.md)                                   | Tracks whether a reactive value has changed from its initial state                             |
| `useIsTouched`               | [use-is-touched.docs.md](./docs/use-is-touched.docs.md)                               | Tracks whether a field has been interacted with                                                |
| `useSlotContent`             | [use-slot-content.docs.md](./docs/use-slot-content.docs.md)                           | Detects whether a slot wrapper has rendered content (Shadow DOM + Vue slots)                   |
| `useState`                   | [use-state.docs.md](./docs/use-state.docs.md)                                         | Thin shallowRef state wrapper that handles both CustomEvent and direct values                  |
| `useUniqueId`                | [use-unique-id.docs.md](./docs/use-unique-id.docs.md)                                 | Generates a stable UUID v4 string per component instance                                       |
| `useViewportConstrainedSize` | [use-viewport-constrained-size.docs.md](./docs/use-viewport-constrained-size.docs.md) | Computes viewport-constrained height/width/offset for popovers and overlays                    |
| `useSafeHtml` / `vSafeHtml`  | See `safe-html-implementation`                                                        | DOMPurify-backed sanitisation composable + directive. Import from `@beetween/composables`.     |

---

## Authoring Guide

To add a new composable doc:

1. Create `./docs/use-<kebab-name>.docs.md` following the format below.
2. Add a row to the Index table above.
3. Each doc must include: Overview, TypeScript Interfaces, Options, Return, Usage Example, Notes & Constraints.
4. **Use `Nullable<T>` from `shared.types` for all null/undefined parameters** — never inline `T | null | undefined`.
5. **ALWAYS add a colocated `<name>.test.ts` file with 15–20+ exhaustive test cases** covering happy path, boundaries (null/undefined/empty), type safety, and invariants. See `vue-composable-testing-patterns` for templates.

---

## Anti-patterns

| ❌ Don't                                            | ✅ Do                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| Fetch data inside a composable                      | Accept data as reactive input args                                       |
| Import from app `~/composables` or `~/stores`       | Keep composable import-free (Vue + VueUse only)                          |
| Read `localStorage` for tokens                      | Use in-memory `Ref` — tokens live in JS only                             |
| Ship i18next `t()` calls inside a shared composable | Let the consumer pass translated strings                                 |
| Use persistent state across instances               | Accept `Ref` args or use `shallowRef`. Prefer stateless utility patterns |
