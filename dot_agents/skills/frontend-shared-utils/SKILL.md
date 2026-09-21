---
name: shared-utils
description: DS-shipped utilities for array/event helpers, CSS variable reading, rem/px conversion, OS detection, and hover-elevation effects. Use when consuming @beetween/design-system-ui.
---

# Shared Utils

Utilities shipped from `@beetween/design-system-ui`. Only publicly exported items from the public barrel (`src/index.ts`) are documented here.

---

## Index

| Item | Doc | Purpose |
| ---- | --- | ------- |

| `toArray` | [to-array.docs.md](./docs/to-array.docs.md) | Wraps any value in an array; null/undefined returns `[]` |
| `getValueFromCustomEventOrValue` | [get-value-from-custom-event-or-value.docs.md](./docs/get-value-from-custom-event-or-value.docs.md) | Extracts value from `CustomEvent.detail` or returns value directly |
| `getPercentage` | [get-percentage.docs.md](./docs/get-percentage.docs.md) | Clamped 0-100 percentage from value/max with configurable precision |
| DOM utils | [dom-utils.docs.md](./docs/dom-utils.docs.md) | `getCssVariableValue`, `convertRemToPx`, `getRootFontSizeInPx` |
| `applyHoverElevation` | [hover-elevation.docs.md](./docs/hover-elevation.docs.md) | Framework-agnostic spring-scale + drop-shadow hover effect |
| `getPlatform` | [os-utils.docs.md](./docs/os-utils.docs.md) | Returns `'Windows' | 'MacOS' | 'Linux' | 'iOS' | 'Android' | 'Other'` from `navigator.userAgent` |

---

## Authoring Guide

To add a new utility doc:

1. Create `./docs/<kebab-name>.docs.md` following the format below.
2. Add a row to the Index table above.
3. Only document items that are publicly exported from the barrel (`src/index.ts`). Do NOT add internal-only items.
4. **Use `Nullable<T>` from `shared.types` for all null/undefined parameters** — never inline `T | null | undefined`.
5. **ALWAYS add a colocated `<kebab-name>.test.ts` file with 15–20+ exhaustive test cases** covering happy path, boundaries (null/undefined/empty strings/zero), type safety, and output invariants. See `vue-composable-testing-patterns` for templates.

---

## Anti-patterns

| ❌ Don't                                                 | ✅ Do                     |
| -------------------------------------------------------- | ------------------------- |
| Manual `document.documentElement.style.getPropertyValue` | Use `getCssVariableValue` |
| Rolling a custom percentage clamp                        | Use `getPercentage`       |
| Checking `navigator.userAgent` directly                  | Use `getPlatform()`       |
