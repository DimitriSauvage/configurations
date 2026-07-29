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
import { defineConfig } from "orval";

export default defineConfig({
  recruitment: {
    input: { target: "http://localhost:8080/v3/api-docs" },
    output: {
      target: "app/api/generated/recruitment",
      client: "fetch",
      mode: "tags-split",
      override: {
        mutator: {
          path: "@beetween/nuxt-orval/runtime/utils/fetch",
          name: "beetweenFetch",
        },
      },
    },
  },
});
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

| Env        | Spec source                                                                      |
| ---------- | -------------------------------------------------------------------------------- |
| Dev        | Local backend `http://localhost:<port>/v3/api-docs`                              |
| CI         | Versioned spec artifact from backend service (pinned URL or downloaded artifact) |
| Prod build | Same pinned artifact as CI                                                       |

Pin spec in CI to prevent drift. NEVER generate against a live prod backend in CI.

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

| Requirement                          | Why                            |
| ------------------------------------ | ------------------------------ |
| `operationId` on every endpoint      | Drives generated function name |
| `tags` populated                     | Drives folder split            |
| Required vs optional fields explicit | Generated DTO precision        |
| Error response schemas (4xx, 5xx)    | Typed error narrowing          |
| `nullable` distinct from optional    | Type correctness               |

---

## Streaming Endpoints (SSE) — Not Orval-Generated

Orval's `client: 'fetch'` generates request/response JSON functions only. It cannot generate a consumer for Server-Sent Events (SSE) or chunked text-stream endpoints (`EventSource`, `@microsoft/fetch-event-source`).

Additionally, streaming endpoints are often absent from the OpenAPI spec entirely — backends frequently omit `text/event-stream` operations — so Orval sees nothing to generate.

**Convention:** For a streaming endpoint, hand-roll a thin module that:

1. Owns a path-builder helper (e.g. `buildSupportStreamPath(sessionId)`) built off the shared API-prefix constant.
2. Defines the SSE payload/event TypeScript types locally (they are app-owned because the endpoint isn't in the spec).
3. Uses `@microsoft/fetch-event-source` or native `EventSource` with the same Bearer-token provider the generated client uses.

Keep auth/token handling consistent with the generated `customInstance` mutator — inject the same access token.

**Boundary:** Only the streaming endpoint is hand-rolled. All standard REST endpoints in the same service (that ARE in the spec) must still use the Orval-generated functions. Do NOT hand-roll path builders for those — that duplicates what Orval already produces.

**Real example:** `@beetween/ai-assistant-support-widget` — `src/api/support-endpoints.ts` keeps `SUPPORT_API_PREFIX` + `buildSupportStreamPath`; `src/api/stream-message.ts` implements the SSE consumer; the two REST endpoints (`createSession`, `getSessionHistory`) use the Orval-generated client.

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

## Anti-Patterns

| ❌                                                               | Why                                                            |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Commit `app/api/generated/`                                      | Generated artefact; causes merge conflicts                     |
| Hand-edit generated DTOs                                         | Overwritten on next `api:generate`                             |
| Hardcode fetch logic outside `beetweenFetch`                     | Auth + retry not applied                                       |
| Use Orval's React/Vue Query output mode                          | We wrap manually — cross-link `tanstack-query-patterns`        |
| Multiple `orval.config.ts` files per service                     | Single config at root, one key per service                     |
| Generate against live prod backend in CI                         | Use pinned spec artifact                                       |
| Hand-rolling path builders for endpoints Orval already generates | Duplicates generated code; only streaming endpoints are exempt |

---

## Cross-Links

- `nuxt-orval-runtime` — `beetweenFetch` mutator, auth, retry, token provider for streaming endpoints
- `tanstack-query-patterns` — composable wrapping of generated functions
- `tanstack-query-error-handling` — typed error handling
- `api-mock-strategy-msw` — MSW handler usage
- `typescript-vue-conventions` — TypeScript conventions in Beetween apps
