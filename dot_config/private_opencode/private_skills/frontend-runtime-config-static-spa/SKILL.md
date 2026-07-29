---
name: runtime-config-static-spa
description: Runtime config pattern for Nuxt 4 static SPA — single bundle promoted across envs via public/config.json, no build-time env vars.
---

# Runtime Config — Static SPA

## Problem

Beetween apps ship as **static SPA bundles**. Same artifact promotes dev → staging → prod.
Build-time env vars are **FORBIDDEN** — they bake URLs into the bundle and require a rebuild per env.

---

## Solution

`public/config.json` fetched at runtime **before** Nuxt boots. Each environment serves its own
`config.json` from the static host. The JS bundle is identical across all envs.

---

## Layout

```
public/
  config.json          # committed — DEV defaults
  config.local.json    # gitignored — local overrides (optional)
deploy/
  config.json.dev
  config.json.staging
  config.json.prod     # injected by deploy pipeline
```

---

## Schema

`app/types/runtime-config.ts`:

```ts
export interface RuntimeConfig {
  api: { baseUrl: string }
  iam: {
    issuer: string
    clientId: string
    redirectUri: string
    postLogoutRedirectUri: string
    scopes: string[]
  }
  msw?: { enabled?: boolean }
  features?: Record<string, boolean>
}
```

---

## Bootstrap — Plugin Pattern (recommended for Nuxt 4)

`app/plugins/00.runtime-config.client.ts` — `enforce: 'pre'` + `00.` prefix forces first-run order:

```ts
import type { RuntimeConfig } from '~/types/runtime-config'
import { validateRuntimeConfig } from '~/utils/runtime-config-guard'

export default defineNuxtPlugin({
  enforce: 'pre',
  async setup(nuxt) {
    const cfg = await $fetch<RuntimeConfig>('/config.json')
    validateRuntimeConfig(cfg) // throws on missing fields
    Object.assign((nuxt.$config.public as Record<string, unknown>), cfg)
  },
})
```

---

## Validation

Validate at boot. **Fail loud** — display fatal screen on missing required fields.
Never silently default to dev URLs.

```ts
// app/utils/runtime-config-guard.ts
import type { RuntimeConfig } from '~/types/runtime-config'

export function validateRuntimeConfig(cfg: unknown): asserts cfg is RuntimeConfig {
  if (!cfg || typeof cfg !== 'object') throw new Error('[runtime-config] not an object')
  const c = cfg as Record<string, unknown>
  if (!c.api || !(c.api as Record<string, unknown>).baseUrl)
    throw new Error('[runtime-config] missing api.baseUrl')
  if (!c.iam || !(c.iam as Record<string, unknown>).issuer)
    throw new Error('[runtime-config] missing iam.issuer')
}
```

---

## Consumption

```ts
const { public: { api, iam } } = useRuntimeConfig()
```

**NEVER** `process.env.*` in app code. **NEVER** `import.meta.env.VITE_*`.

---

## Feature Flags

Stored under `features.*`. Boolean only.

```ts
// app/composables/useFeatureFlag.ts
export function useFeatureFlag(key: string): boolean {
  const { public: { features } } = useRuntimeConfig()
  return (features as Record<string, boolean> | undefined)?.[key] ?? false
}
```

Usage: `useFeatureFlag('newSearch')`.

---

## Local Dev

`public/config.json` holds committed dev defaults.
Override via `public/config.local.json` (gitignored) — loader checks both, local wins.

```ts
// extend plugin setup if local override needed
const base = await $fetch<Partial<RuntimeConfig>>('/config.json')
const local = await $fetch<Partial<RuntimeConfig>>('/config.local.json').catch(() => ({}))
const cfg = { ...base, ...local }
```

---

## Caching Rules

| Asset | Cache-Control |
|---|---|
| `config.json` | `no-cache` — must never be stale |
| JS/CSS bundles | `immutable` — per build hash, aggressive caching OK |

---

## CI / Deploy

| Stage | config.json source |
|---|---|
| Local | `public/config.json` (dev defaults) + optional `config.local.json` |
| Build | `npm run build` — config NOT baked, bundle only |
| Deploy dev | `deploy/config.json.dev` → served `/config.json` |
| Deploy staging | `deploy/config.json.staging` → served `/config.json` |
| Deploy prod | `deploy/config.json.prod` → served `/config.json` |

---

## Anti-Patterns

| ❌ | Why |
|---|---|
| `process.env.*` in app code | Bakes value at build time |
| `import.meta.env.VITE_*` in app code | Same — build-time bake |
| Rebuild bundle per env | Defeats single-artifact promotion |
| Fetch config after Nuxt boots | Race condition with other plugins |
| `Cache-Control: max-age` on config.json | Stale config served to users |
| Secrets in config.json | Ships to browser — public values only |
| Silent default to dev URLs on missing keys | Hides misconfiguration in prod |

---

## Cross-Links

- `nuxt4-spa-conventions` — Nuxt 4 SPA baseline rules
- `iam-oidc-setup` — OIDC client config wiring
- `nuxt-orval-runtime` — Orval client consuming `api.baseUrl`
- `api-mock-strategy-msw` — MSW toggle via `msw.enabled`
- `typescript-vue-conventions` — TypeScript strictness rules
