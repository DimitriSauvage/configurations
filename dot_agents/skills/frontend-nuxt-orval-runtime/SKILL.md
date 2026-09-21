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

## Base URL Injection

Base URL ALWAYS comes from Nuxt runtime config — NEVER hardcoded, NEVER read from `import.meta.env`.

**Beetween default**: `public.api.baseUrl` via `public/config.json` (see `runtime-config-static-spa`).

**No-auth projects (module-state mutator)**: the mutator keeps the base URL in module state, set once at app boot by a `.client.ts` plugin — this keeps `client.ts` importable OUTSIDE a Nuxt context (tests, workers):

```ts
// app/plugins/api.client.ts
import { setApiBase } from '~/api/client'

export default defineNuxtPlugin(() => {
  setApiBase(useRuntimeConfig().public.apiBase)
})
```

```ts
// app/api/client.ts (excerpt)
let apiBase = 'http://localhost:8080' // default matching runtimeConfig.public.apiBase
export function setApiBase(base: string): void {
  apiBase = base
}
```

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

**DTO source of truth**: DTOs come ONLY from the generated schemas (`client.schemas` / `schemas/`). App code NEVER re-declares API shapes; component prop interfaces import generated DTO types. AbortSignal from `QueryFunctionContext` is always forwarded to the generated function.

For projects using the status-union mutator contract (below), the composable layer follows a 3-export pattern: a `fetchX(params, signal?)` wrapper that unwraps the status union, a pure `xQueryOptions(params)` factory, and a thin `useX(params)` binding `useQuery`. Cross-link `tanstack-query-patterns`.

---

## Mutator Response Contract (hand-written fetch client)

Non-`@beetween/nuxt-orval` projects (no auth runtime) hand-write the mutator. Two valid contracts — pick one per project, document it in `client.ts`'s header comment:

**Contract A — typed rejection (Beetween default)**: `customInstance` throws a typed `ApiError` on HTTP errors; consumers catch via TanStack Query. See Error Contract below.

**Contract B — status union, never throw on HTTP errors** (Orval fetch convention, no-auth projects):

```ts
export const customInstance = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${apiBase}${url}`, options)
  // 204/205/304 have no body → null; present-but-unparseable JSON (e.g. an
  // nginx 502/504 HTML error page) yields data: null so the STATUS survives —
  // never reject with a raw SyntaxError.
  const body = [204, 205, 304].includes(response.status) ? null : await response.text()
  let data: unknown = {}
  if (body) {
    try {
      data = JSON.parse(body)
    } catch {
      data = null
    }
  }
  // The single `as T` cast is justified: T is the Orval-generated union of
  // success and error shapes, undiscriminatable without the status the caller
  // checks.
  return { data: data as T, status: response.status, headers: response.headers }
}
```

- Network failures still reject (native fetch). HTTP error statuses are RETURNED inside the typed result; callers discriminate on `status`.
- The composable's fetch layer converts to the error type: `if (response.status !== 200) throw new ApiError(response.status, response.data)` — status-discriminated unions are consumed exactly there, never in components.
- The `as T` cast must carry a justification comment (Orval union can't be discriminated without the status the caller checks).

---

## ApiError Shape (Contract B)

```ts
export class ApiError extends Error {
  /** HTTP status code of the failed response. */
  readonly status: number
  constructor(status: number, data: unknown) {
    // Server envelope message extracted via unknown-narrowing; the body is a
    // trust boundary (can be null/empty/HTML) — fallback keeps a usable text.
    super(readServerMessage(data) ?? `Request failed with status ${status}`)
    this.status = status
  }
}

function readServerMessage(data: unknown): string | undefined {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const { message } = data
    if (typeof message === 'string') return message
  }
  return undefined
}
```

- `status` is `readonly`; the constructor takes the parsed body as `unknown` and narrows explicitly.

See `tanstack-query-patterns` for `useQuery` / `useMutation` conventions.

---

## Error Contract (Contract A)

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
| Re-declaring API DTO shapes in app code | Generated schemas are the single source of truth |
| Throwing from the mutator on HTTP error (Contract B) | Status must survive in the typed result for union discrimination; errors are thrown by the fetch layer |
| Base URL from `import.meta.env` or hardcoded constants | Runtime config + one-time plugin injection only |

---

## Cross-Links

- `orval-openapi-codegen` — codegen config, `orval.config.ts`, regeneration
- `tanstack-query-patterns` — `useQuery` / `useMutation` conventions
- `tanstack-query-error-handling` — error classification, toast feedback
- `iam-oidc-setup` — OIDC provider, `@beetween/nuxt-auth` wiring
- `runtime-config-static-spa` — `public/config.json`, `apiBaseUrl` resolution
- `api-mock-strategy-msw` — MSW network-layer mocking
