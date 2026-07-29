---
name: vueuse-composable-usage
description: Use @vueuse/core as canonical browser/DOM/reactivity utility source. Prefer over hand-rolled or single-purpose libs.
---

# VueUse Composable Usage

## Foundation

`@vueuse/core` is the canonical source for browser/DOM/reactivity utilities in this project.

- **PREFER VueUse over hand-rolled implementations.**
- **PREFER VueUse over installing a single-purpose library.**

---

## Install

```bash
npm install @vueuse/core
# Optional extras
npm install @vueuse/components   # renderless component wrappers
npm install @vueuse/integrations # third-party integrations (axios, etc.)
```

---

## Decision Rule

1. Need a reactive utility?
2. Does VueUse have it? → **Use it.**
3. Does a battle-tested lib have it AND VueUse doesn't? → Use lib (justify in PR).
4. Else → write a composable per `structure-components` conventions.

---

## Common-Use Table

| Need | VueUse |
|---|---|
| Debounced reactive value | `useDebounceFn`, `refDebounced` |
| Throttled value | `useThrottleFn`, `refThrottled` |
| Local/session storage (NON-AUTH) | `useLocalStorage`, `useSessionStorage` |
| Outside-click | `onClickOutside` |
| Element size | `useElementSize`, `useResizeObserver` |
| Intersection (lazy load) | `useIntersectionObserver` |
| Network state | `useOnline`, `useNetwork` |
| Clipboard | `useClipboard` |
| Async state (non-server) | `useAsyncState` |
| Window scroll | `useWindowScroll`, `useScrollLock` |
| Media queries | `useMediaQuery`, `useBreakpoints` |
| Event listener cleanup | `useEventListener` |
| Title | `useTitle` (combine with i18n) |
| Color scheme | `useColorMode`, `usePreferredDark` |
| Focus trap | `useFocusTrap` — see a11y note below |
| Idle detection | `useIdle` |

---

## Import Convention

Always import per-utility. Tree-shaking depends on it.

```ts
// ✅ correct
import { useDebounceFn, useLocalStorage } from '@vueuse/core'

// ❌ forbidden — kills tree-shaking
import * as VueUse from '@vueuse/core'
```

---

## Auth Tokens

**NEVER** use `useLocalStorage` or `useSessionStorage` for auth tokens.
Tokens are in-memory only. See cross-link `iam-oidc-setup`.

---

## Server State

**NEVER** use `useAsyncState` for HTTP fetches managed by TanStack Query.
`useAsyncState` is fine for local non-server async (e.g., reading an IndexedDB record).
See cross-link `tanstack-query-patterns`.

---

## A11y Note — Focus Trap

VueUse provides `useFocusTrap`. Project rule (see `enforce-a11y`): no focus-trap library is mandated by default.
Use `useFocusTrap` only when a hand-rolled trap is verifiably insufficient **and** the result is tested with keyboard + screen reader.

---

## Cleanup

VueUse composables auto-register `onScopeDispose` cleanup internally.
**Do NOT** manually call `removeEventListener` for listeners created via VueUse.

---

## SSR

Not applicable — project is CSR-only. Ignore VueUse SSR caveats.

---

## Testing

VueUse composables are reactive. Test via `mountSuspended` or directly inside a `setup()` test scope.
Stub timers (`vi.useFakeTimers`) for `useDebounceFn` / `useThrottleFn` / `refDebounced` / `refThrottled`.
See cross-link `vue-composable-testing-patterns`.

---

## Anti-Patterns

| Pattern | Why forbidden |
|---|---|
| Hand-rolled debounce/throttle | `useDebounceFn` / `refDebounced` cover it |
| Custom outside-click listener | `onClickOutside` covers it |
| `useLocalStorage` for auth tokens | Tokens must be in-memory only |
| `useAsyncState` for TanStack-managed data | Dual ownership, cache inconsistency |
| `import * as VueUse from '@vueuse/core'` | Kills tree-shaking |
| Ad-hoc resize listeners | Use `useResizeObserver` |
| Installing single-purpose dep when VueUse covers it | Unnecessary bundle weight |
| Manual `removeEventListener` on VueUse listeners | VueUse handles `onScopeDispose` automatically |

---

## Cross-Links

- `structure-components` — composable file conventions, folder layout
- `typescript-vue-conventions` — strict typing, no-any, Props/Emits interfaces
- `tanstack-query-patterns` — server state via useQuery/useMutation
- `iam-oidc-setup` — in-memory token storage rules
- `enforce-a11y` — ARIA, focus trap policy, WCAG 2.2
- `vue-composable-testing-patterns` — Vitest patterns for reactive composables
