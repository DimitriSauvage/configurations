# Discovery Patterns — Nuxt / Vue Frontend Structure Detection

Used by the `document-frontend-code` skill during **Phase 0** to auto-detect the project's
structure, tech stack, and conventions — without requiring manual config.

---

## Step 1 — Detect project type

Check for the following signals in order:

| Signal | Project type |
|--------|-------------|
| `nuxt.config.ts` exists | **Nuxt 4** (or 3) |
| `vite.config.ts` + no `nuxt.config.ts` | **Plain Vue 3 SPA** |
| Neither found | Unknown — ask the user |

For Nuxt: read `nuxt.config.ts` for:
- `compatibilityDate` → Nuxt version
- `modules` → detect: `@pinia/nuxt`, `@nuxtjs/i18n`, `@primevue/nuxt-module`, `@nuxt/image`

---

## Step 2 — Map folder structure

### Nuxt 4 project layout
```
app/
  pages/           ← route-based pages (Nuxt auto-routing)
  layouts/         ← layout wrappers (default.vue, admin.vue…)
  components/      ← shared UI components (auto-imported)
  composables/     ← reusable logic (auto-imported)
  stores/          ← Pinia stores (auto-imported if @pinia/nuxt)
  plugins/         ← Nuxt plugins (client/server)
  middleware/      ← route guards
  utils/           ← pure utility functions (not composables)
assets/            ← styles, fonts, images
public/            ← static files
```

### Nuxt 3 (legacy) project layout
Same as above but with `components/`, `composables/` at root level (not under `app/`).

### Plain Vue 3 SPA layout
```
src/
  views/           ← equivalent of pages/
  components/      ← shared UI
  composables/     ← reusable logic
  stores/          ← Pinia stores
  router/          ← Vue Router config
  utils/           ← utility functions
```

---

## Step 3 — Detect tech stack from package.json

Read `package.json` dependencies for:

| Package | What to note in docs |
|---------|---------------------|
| `primevue` | Identify PrimeVue components used in templates |
| `tailwindcss` | Note Tailwind classes drive styling (no scoped CSS by default) |
| `pinia` | Document stores separately in stores section |
| `@tanstack/vue-query` | Document `useQuery`/`useMutation` async patterns |
| `@vueuse/core` | Note VueUse composables (they are not documented — reference vueuse.org) |
| `@nuxtjs/i18n` or `vue-i18n` | Note `$t()` / `useI18n()` usage in component docs |
| `@playwright/test` | Note: E2E tests are documented in the frontend plugin's `e2e-playwright-critical-flows` skill |

---

## Step 4 — Enumerate components

```bash
find app/components -name "*.vue" | sort          # Nuxt 4
find src/components -name "*.vue" | sort          # Plain Vue
```

Group components by first-level subfolder (= feature area):
```
components/
  common/          → area: "common"
  workflow/        → area: "workflow"
  request/         → area: "request"
```

Count components per area. Ask user which area(s) to document if > 5 areas.

---

## Step 5 — Enumerate composables

```bash
find app/composables -name "use*.ts" | sort       # Nuxt 4
find src/composables -name "use*.ts" | sort       # Plain Vue
```

For each composable, extract:
- Function name and parameters from the function signature
- Return type from the `return { ... }` statement
- Whether it is async or uses TanStack Query

---

## Step 6 — Enumerate Pinia stores

```bash
find app/stores -name "*.ts" | sort               # Nuxt 4
find src/stores -name "*.ts" | sort               # Plain Vue
```

For each store, detect the definition pattern:
- `defineStore('name', { state, getters, actions })` → Options API store
- `defineStore('name', () => { ... })` → Setup store (treat returned values as composable)

---

## Step 7 — Build the discovery summary

At the end of Phase 0, produce an internal summary (not written to docs):

```
DISCOVERY SUMMARY
=================
Project type  : Nuxt 4
Stack         : Vue 3, PrimeVue, Tailwind, Pinia, TanStack Query, i18n
Structure     : app/ layout
Pages         : 12 files (pages/)
Components    : 34 files across 5 areas (common, workflow, request, dashboard, auth)
Composables   : 18 files (composables/)
Stores        : 4 stores (stores/)
```

Then ask: "I've detected [N] components across [M] areas. Shall I document all, or start with a specific area?"

---

## When to ask the user (vs. infer)

| Situation | Action |
|-----------|--------|
| Folder structure matches expected Nuxt/Vue layout | Infer everything |
| Component uses `$t()` but no i18n package found | Ask: "Is i18n configured outside package.json?" |
| A composable calls an endpoint with no type definition | Ask: "What does `<endpoint>` return? I can't find the response type." |
| Store has complex setup pattern (plugin injection, shared cross-store state) | Flag: "Non-standard store pattern — documenting as-is, please review." |
| `// TODO` or `// FIXME` on a key component prop or composable return value | Flag: "Found a TODO on `<name>` in `<file>`. Document as-is or wait for fix?" |
| Component in `components/` has no clear area subfolder | Group under "common" unless > 10 such components; then ask for grouping |
