---
name: orval-openapi-codegen
description: Orval CLI config and workflow to generate typed DTOs and fetch client functions from backend OpenAPI specs in Beetween Nuxt apps.
---

# Orval OpenAPI Codegen

## Scope

Covers Orval CLI setup, `orval.config.ts` authoring, generated file layout, and CI integration. Runtime fetch behaviour (auth, 401 retry, error normalisation) lives in `nuxt-orval-runtime` — cross-link there.

---

## Install

```bash
npm install --save-dev orval
```

Add script to `package.json`:

```json
{
  "scripts": {
    "api:generate": "orval",
    "prebuild": "npm run api:generate"
  }
}
```

---

## Config — `orval.config.ts`

One file at repo root. One target per backend service.

```ts
import { defineConfig } from 'orval'

export default defineConfig({
  recruitment: {
    // Pinned spec artifact dumped from the backend — never generate against a live server.
    input: './openapi/api.json',
    output: {
      target: 'app/api/generated/recruitment',
      client: 'fetch',
      mode: 'tags-split',
      // Path-only URLs; the base URL is injected at runtime by the mutator.
      baseUrl: '',
      override: {
        // Stable generated function names (orval 8 requires operationName as a
        // function, not a string): vi.mock targets and composable imports stay
        // readable and stable across backend renames of tags/paths.
        operations: {
          list: { operationName: () => 'listCandidates' },
        },
        mutator: {
          path: '@beetween/nuxt-orval/runtime/utils/fetch',
          name: 'beetweenFetch',
        },
      },
    },
  },
})
```

Add more top-level keys for additional services. NEVER create separate config files per service.

---

## Generated Layout (`mode: 'tags-split'`)

```
app/api/generated/<service>/
  schemas/<dto>.ts
  <tag>/<tag>.ts
  <tag>/<tag>.msw.ts   # optional MSW handlers
```

---

## `app/api/generated/` Policy

- **READ-ONLY** — NEVER hand-edit.
- **NEVER commit** — add to `.gitignore`:
  ```
  app/api/generated/
  ```
- Regenerated on `npm run api:generate`, on `prebuild`/`postinstall`, and on CI.
- Disable linting/formatting:
  ```
  # .eslintignore
  app/api/generated/

  # .prettierignore
  app/api/generated/
  ```

---

## Spec Source per Environment

**The input is always a PINNED spec artifact** (e.g. `openapi/api.json` committed or downloaded from the backend pipeline). NEVER wire a live server URL into `orval.config.ts` — dev, CI, or prod. A live URL makes every generation non-reproducible and couples frontend builds to a running backend.

To refresh the artifact, dump it from the local backend (`GET /v3/api-docs` → save to `openapi/api.json`) and re-run generation. CI/Prod use the versioned artifact; NEVER generate against a live prod backend.

| Env | Spec source |
|---|---|
| Dev | Local backend dump refreshed manually into `openapi/api.json` |
| CI | Versioned/pinned spec artifact (backend pipeline output) |
| Prod build | Same pinned artifact as CI |

---

## Mutator Hookup

`override.mutator` points to `beetweenFetch` from `@beetween/nuxt-orval`. It adds:

- Bearer token injection
- 401 retry with token refresh
- Normalised error shape

See `nuxt-orval-runtime` for full mutator contract. Do NOT inline custom fetch logic.

---

## Client Choice

- `client: 'fetch'` — always.
- ❌ NEVER `axios`.
- ❌ NEVER Orval's React Query / Vue Query output mode — wrap generated functions manually via TanStack Query composables (cross-link `tanstack-query-patterns`).

---

## MSW Handler Generation

Enable per target for stable demo and test data:

```ts
recruitment: {
  // ...
  output: { /* ... */ mock: true },
}
```

Generated `*.msw.ts` files export MSW handlers. Import in your MSW setup file. Cross-link `api-mock-strategy-msw`.

---

## Backend OpenAPI Quality Requirements

Generated code quality is bounded by spec quality. Surface gaps as backend tickets — do NOT patch in frontend.

| Requirement | Why |
|---|---|
| `operationId` on every endpoint | Drives generated function name |
| `tags` populated | Drives folder split |
| Required vs optional fields explicit | Generated DTO precision |
| Error response schemas (4xx, 5xx) | Typed error narrowing |
| `nullable` distinct from optional | Type correctness |

---

## CI Workflow

```
1. npm ci
2. npm run api:generate   # against pinned spec artifact
3. npm run typecheck      # catches schema drift
4. npm run test
5. npm run build
```

---

## DTO Source of Truth

- **DTOs come ONLY from the generated schemas** (`app/api/generated/**/client.schemas` or `schemas/`). App code NEVER re-declares API shapes — no duplicated interfaces, no hand-typed mirrors. Component prop interfaces import the generated DTO types (`CandidateDto`, etc.).
- Generated code is **regenerated before every consumer**, not just builds: `build`, `test`, and `test:e2e` scripts must all run generation first (`"build": "npm run api:generate && nuxt build"`, same prefix for `test` and `test:e2e`) — tests/e2e import the generated modules, so a stale artifact breaks them.

---

## Anti-Patterns

| ❌ | Why |
|---|---|
| Commit `app/api/generated/` | Generated artefact; causes merge conflicts |
| Hand-edit generated DTOs | Overwritten on next `api:generate` |
| Hardcode fetch logic outside `beetweenFetch` | Auth + retry not applied |
| Use Orval's React/Vue Query output mode | We wrap manually — cross-link `tanstack-query-patterns` |
| Multiple `orval.config.ts` files per service | Single config at root, one key per service |
| Generate against a live server (any env) | Use the pinned spec artifact — reproducibility |
| Re-declare API DTO shapes in app code | Generated schemas are the single source of truth |

---

## Cross-Links

- `nuxt-orval-runtime` — `beetweenFetch` mutator, auth, retry
- `tanstack-query-patterns` — composable wrapping of generated functions
- `tanstack-query-error-handling` — typed error handling
- `api-mock-strategy-msw` — MSW handler usage
- `typescript-vue-conventions` — TypeScript conventions in Beetween apps
