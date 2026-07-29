---
name: nuxt4-spa-conventions
description: Nuxt 4 SPA-only conventions for Beetween apps — CSR, directory structure, routing, plugins, runtime config, anti-patterns.
---

# Nuxt 4 SPA-Only Conventions

## Foundation

Beetween apps run **Nuxt 4 in SPA-only mode**. CSR-only. No SSR, no server routes, no Nitro server handlers consumed by frontend logic.

---

## `nuxt.config.ts` Essentials

```ts
export default defineNuxtConfig({
  ssr: false,
  app: { rootId: 'app' },
  future: { compatibilityVersion: 4 },
  modules: ['@beetween/nuxt-auth', '@beetween/nuxt-orval', '@beetween/nuxt-translation'],
  runtimeConfig: { public: { /* loaded from public/config.json at runtime */ } },
  experimental: { /* opt in deliberately */ },
})
```

---

## Directory Structure (Nuxt 4 `app/` root)

```
app/
  app.vue
  pages/
  layouts/
  components/        # auto-imported
  composables/       # auto-imported
  utils/             # auto-imported
  plugins/           # *.client.ts only
  middleware/
  assets/
  api/generated/     # Orval, gitignored
public/
  config.json        # runtime config (cross-link runtime-config-static-spa)
```

---

## No `server/` Directory

`server/` is **forbidden**. If found — it is accidental. Delete it.

---

## Plugins

Filename MUST end `.client.ts`. CSR-only means NEVER `.server.ts`.

```ts
// app/plugins/my-plugin.client.ts
export default defineNuxtPlugin(() => { /* ... */ })
```

---

## Routing

File-based via `pages/`. Dynamic segments: `[id].vue`. Catch-all: `[...slug].vue`.
NO programmatic route registration outside `pages/`.

---

## Middleware

- **Global**: `middleware/<name>.global.ts` — cross-cutting concerns (auth provided by `@beetween/nuxt-auth`).
- **Per-page**: `definePageMeta({ middleware: 'name' })`.

---

## Layouts

`layouts/default.vue` + named layouts. Switch via `definePageMeta({ layout: 'name' })`.

---

## Auto-Imports

| Folder | Auto-import |
|---|---|
| `components/` | Components (file name → PascalCase) |
| `composables/` | Named exports (`use-*` convention) |
| `utils/` | Named exports |
| `app.vue`, `error.vue` | Special entry files |

Configure exclusions in `nuxt.config.ts` if needed (see `structure-components` for per-folder co-location rules).

---

## Build & Deploy

```
npm run build   # generates .output/public/ — static assets only
```

Deploy `.output/public/` to any static host. NO Node server.
`nuxi generate` for static prerendering is **NOT used** — we serve a single `index.html` with client-side routing.

---

## Runtime Config

NEVER use `process.env` in app code. Always `useRuntimeConfig().public.*` reading values injected from `public/config.json` at runtime.

Cross-link → `runtime-config-static-spa`.

---

## `useFetch` / `useAsyncData`

Avoid for server state. Server state belongs to **TanStack Query** (cross-link `tanstack-query-patterns`).
Use Nuxt fetch helpers only for static asset loads.

---

## Error Page

`app/error.vue` handles 404 + uncaught errors. For in-page error states cross-link → `tanstack-query-patterns`.

---

## Head Management

`useHead()` / `useSeoMeta()` per page. Titles localised — cross-link → `i18n-nuxt-translation-usage`.

---

## CSS Pipeline

Tailwind v4 only — cross-link → `style-tailwind`. NO global stylesheets beyond the `tailwind.css` entry.

---

## Anti-Patterns

| Pattern | Reason |
|---|---|
| `ssr: true` | SPA-only — SSR forbidden |
| `server/` directory | No Nitro server in frontend apps |
| `.server.ts` plugins | CSR-only — server plugins forbidden |
| `useFetch` for server state | Use TanStack Query |
| `process.env` in app code | Use `useRuntimeConfig().public.*` |
| Hardcoded `baseUrl` strings | Always read from runtime config |
| `nuxi generate` prerendering | Single `index.html` + CSR routing only |
| Programmatic route registration | File-based `pages/` only |
| Global CSS beyond Tailwind entry | Tailwind v4 utilities only |
| SSR-only composables (`useRequestEvent`) | Unavailable in SPA mode |

---

## Cross-Links

- `structure-components` — component hierarchy, folder layout, auto-import config
- `style-tailwind` — Tailwind v4, tokens, `<style>` ban
- `runtime-config-static-spa` — `public/config.json` loading pattern
- `iam-oidc-setup` — auth module configuration
- `nuxt-orval-runtime` — generated API client conventions
- `tanstack-query-patterns` — useQuery/useMutation, server state
- `i18n-nuxt-translation-usage` — `@beetween/nuxt-translation`, MF2, `useTranslation()`
- `typescript-vue-conventions` — strict TypeScript, Props/Emits interfaces
