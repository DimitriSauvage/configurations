---
name: nuxt-orval-runtime
description: HTTP client + fetch hooks of @beetween/nuxt-orval consumed by Orval-generated DTOs — auth injection, 401 retry, consumption patterns.
---

# `@beetween/nuxt-orval` Runtime

## Scope

This skill covers the **runtime layer only**: the HTTP client (`customInstance`), fetch hooks (Bearer injection, 401 retry), and how generated code is consumed.

Generation config (codegen, `orval.config.ts`) → see `orval-openapi-codegen`.

---

## Module Install

```bash
npm install @beetween/nuxt-orval
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@beetween/nuxt-orval'],
})
```

Runtime base URL → `public.api.baseUrl` via `public/config.json` (see `runtime-config-static-spa`). **NEVER hardcode.**

---

## Auth Header Injection

`fetch.ts → buildHeaders()` reads the current access token from `@beetween/nuxt-auth` and attaches:

```
Authorization: Bearer <token>
```

This is **automatic** — every request made through `customInstance` carries the header.

**NEVER attach `Authorization` manually** in components, composables, or query functions.

Custom token provider (non-`@beetween/nuxt-auth` setups only):

```ts
// plugins/api-auth.client.ts
import { setTokenProvider } from '@beetween/nuxt-orval/client'
export default defineNuxtPlugin(() => {
  setTokenProvider(() => myTokenStore.accessToken)
})
```

---

## 401 Handling

`client.ts → fetchWithAuthRetry()` (delegates to `fetch.ts`):

1. Request returns 401 → call `signinSilent()` (silent renew).
2. Retry once with refreshed token.
3. If retry still 401 or refresh fails → logout + reject.

Consumers receive a rejected promise — handle via TanStack Query error boundary (see `tanstack-query-error-handling`). **Do NOT wrap `customInstance` to add your own retry.**

---

## Generated Client Structure

```
app/api/generated/         # read-only — gitignored
  schemas/                 # DTO types (interfaces, enums)
  <tag>/
    <tag>.ts               # generated raw functions + Orval query hooks (unused)
app/api/client.ts          # re-exports customInstance (mutator proxy)
```

**Never hand-edit `app/api/generated/`** — regenerated on every `npm run orval`.

---

## Consumption Pattern

Orval emits raw async functions. Wrap them in TanStack Query composables — **do NOT use Orval's built-in TanStack Query mode**.

```ts
// composables/use-candidate.ts
import { listCandidates } from '~/api/generated/candidate/candidate'
import type { Filters } from '~/api/generated/schemas'

export function useCandidates(filters: Ref<Filters>) {
  return useQuery({
    queryKey: ['candidates', filters],
    queryFn: () => listCandidates(filters.value),
  })
}
```

See `tanstack-query-patterns` for `useQuery` / `useMutation` conventions.

---

## Error Contract

`customInstance` rejects with a typed `ApiError`:

```ts
interface ApiError {
  status: number
  code: string
  message: string
  fieldErrors?: Record<string, string[]>
}
```

TanStack Query surfaces this as `error` in `useQuery` / `useMutation`. Classify + display via `error-classifier` — see `tanstack-query-error-handling`.

---

## Request Hook Extension (Rare)

For cross-cutting concerns (tracing, correlation IDs), expose a `defineNuxtPlugin` adding `beforeRequest` hooks rather than editing `customInstance`:

```ts
// plugins/api-tracing.client.ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:beforeRequest' as never, (request: Request) => {
    request.headers.set('X-Correlation-Id', crypto.randomUUID())
  })
})
```

---

## Mocking

Mocking operates at network layer (MSW) — `@beetween/nuxt-orval` is unaware. See `api-mock-strategy-msw`.

---

## Anti-Patterns

| Pattern | Why Forbidden |
|---|---|
| Manual `Authorization` header in component/composable | `buildHeaders()` already injects — duplicates or overwrites |
| Hand-editing `app/api/generated/` | Overwritten on next codegen run |
| Raw `$fetch` / `useFetch` bypassing `customInstance` | Skips auth injection + 401 retry |
| Hardcoding `baseUrl` | Must come from `public/config.json` → `runtime-config-static-spa` |
| Using Orval's built-in TanStack Query mode | We wrap manually for full query control |
| Per-request token attachment in components | Auth is the runtime's responsibility |

---

## Cross-Links

- `orval-openapi-codegen` — codegen config, `orval.config.ts`, regeneration
- `tanstack-query-patterns` — `useQuery` / `useMutation` conventions
- `tanstack-query-error-handling` — error classification, toast feedback
- `iam-oidc-setup` — OIDC provider, `@beetween/nuxt-auth` wiring
- `runtime-config-static-spa` — `public/config.json`, `apiBaseUrl` resolution
- `api-mock-strategy-msw` — MSW network-layer mocking
