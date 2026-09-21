---
name: api-mock-strategy-msw
description: MSW-based API mocking for Nuxt 4 SPA — decision matrix, handler authoring with Orval-generated DTOs, browser/Vitest activation, TanStack Query compatibility.
---

# API Mock Strategy — MSW

## Decision Matrix

| Condition | Use |
|---|---|
| Endpoint reachable + contract confirmed | **Real backend** |
| Endpoint not yet built | Mock (MSW) |
| Parallel FE/BE dev, contract drafted | Mock (MSW) |
| Deterministic E2E / demo data needed | Mock (MSW) |
| CI without live backend | Mock (MSW) |

**Default**: prefer real backend whenever reachable. Mock is a temporary layer, not a permanent abstraction.

---

## MSW Setup

**Install** (dev dep only):

```bash
npm install --save-dev msw
npx msw init public/ --save
```

**Layout**:

```
mocks/
  handlers/
    <feature>.handlers.ts   # one file per domain/feature
  browser.ts                # setupWorker(...)
  node.ts                   # setupServer(...) for Vitest
  index.ts                  # re-exports handlers[]
```

---

## Handler Authoring

Use `http` + `HttpResponse` from `msw`. Type request/response with DTOs from `app/api/generated` (Orval — read-only, gitignored).

```ts
// mocks/handlers/candidates.handlers.ts
import { http, HttpResponse } from 'msw'
import type { CandidateDto } from '@/api/generated'

export const candidatesHandlers = [
  http.get('/api/candidates', () => {
    const data: CandidateDto[] = [{ id: '1', name: 'Alice' }]
    return HttpResponse.json(data)
  }),

  http.get('/api/candidates/:id', ({ params }) => {
    if (params.id === 'not-found') return new HttpResponse(null, { status: 404 })
    const data: CandidateDto = { id: String(params.id), name: 'Alice' }
    return HttpResponse.json(data)
  }),
]
```

```ts
// mocks/index.ts
import { candidatesHandlers } from './handlers/candidates.handlers'
export const handlers = [...candidatesHandlers]
```

```ts
// mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './index'
export const worker = setupWorker(...handlers)
```

```ts
// mocks/node.ts
import { setupServer } from 'msw/node'
import { handlers } from './index'
export const server = setupServer(...handlers)
```

**Error handlers replicate the backend error envelope exactly** — every field the backend serializes (`timestamp`, `status`, `error`, `path`, `code`, `message`). The frontend `ApiError` narrows its message from that shape; a hand-waved `{ message: 'x' }` fixture hides real parsing bugs:

```ts
http.get('/api/candidates', () =>
  HttpResponse.json(
    {
      timestamp: '2026-01-01T12:00:00Z',
      status: 422,
      error: 'Unprocessable Entity',
      path: '/api/candidates',
      code: 'CANDIDATE_INVALID',
      message: 'Email already in use.',
    },
    { status: 422 },
  ),
)
```

---

## Lightweight Alternative — vi.mock of the Generated Module (unit tests)

For pure unit tests of composable mapping/unwrap logic (query key, `enabled` gating, status-union → `ApiError` conversion), network-layer mocking is overkill. Vitest may instead mock the **generated client module boundary**:

```ts
import { searchRecipes } from '~/api/generated/recipes/recipes'

vi.mock('~/api/generated/recipes/recipes', () => ({
  searchRecipes: vi.fn(),
}))

// Response factories build the full Orval envelope:
vi.mocked(searchRecipes).mockResolvedValue({
  status: 200 as const,
  data: responseDto,
  headers: new Headers(),
})
```

- Mock the generated module, **never DTOs** — fixtures stay typed against the real generated schemas.
- Scope: composable unit tests only. MSW remains the default for component/integration tests, browser demo mode, and any test where the network layer itself matters.

---

## Browser Activation (Nuxt 4 SPA)

Gate behind `NUXT_PUBLIC_MSW_ENABLED=true` runtime config. Config read from `public/config.json` at runtime.

```ts
// app/plugins/msw.client.ts
export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  if (!config.public.mswEnabled) return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'warn' })
})
```

Plugin runs **before** any TanStack Query call — Nuxt plugin order guarantees this.

`nuxt.config.ts`:
```ts
runtimeConfig: {
  public: { mswEnabled: false }
}
```

`public/config.json` (local dev override, gitignored):
```json
{ "mswEnabled": true }
```

---

## Vitest Activation

```ts
// vitest.setup.ts
import { server } from '@/mocks/node'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

Use `server.use(...)` inside a test to override a handler for that test only.

---

## TanStack Query Compatibility

MSW intercepts at network layer. `useQuery` / `useMutation` composables are **unchanged** — no code branching on mock-vs-real.

```ts
// composable unchanged regardless of mock or real
const { data } = useQuery({
  queryKey: candidateKeys.list(),
  queryFn: () => fetchCandidates(),
})
```

---

## Future-Proof for OpenAPI (Orval)

Handlers consume Orval-generated DTOs from `app/api/generated`. Replacing mock with real endpoint:

1. Delete the handler file.
2. Remove conditional worker start (or keep for other features).
3. Point composable at generated hook — no shape changes needed.

**No bespoke mock-client abstractions.** No parallel composable trees.

---

## Anti-Patterns

| ❌ Pattern | ✅ Fix |
|---|---|
| `if (USE_MOCKS)` branching in composables | MSW intercepts network — composable stays clean |
| Inline mock data in components | Centralise in `mocks/handlers/<feature>.handlers.ts` |
| `vi.fn().mockResolvedValue(...)` for full flow | Use MSW `server.use(...)` override |
| Untyped mock responses | Must satisfy Orval DTOs from `app/api/generated` |
| Only happy-path handlers | Cover 4xx/5xx per `tanstack-query-error-handling` |
| Worker start committed without env gate | Gate with `NUXT_PUBLIC_MSW_ENABLED` |
| Permanent mock layer alongside real API | Mock is temporary — delete on API readiness |

---

## Cross-Links

- `tanstack-query-error-handling` — 4xx/5xx handler patterns
- `nuxt-orval-runtime` — Orval codegen, DTO types, query hooks
- `runtime-config-static-spa` — `public/config.json` runtime config pattern
- `vue-composable-testing-patterns` — composable unit tests with MSW node server
- `e2e-playwright-critical-flows` — E2E with deterministic MSW data
