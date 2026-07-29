---
name: structure-components
description: Beetween Nuxt 4 component hierarchy, folder-per-component layout, script setup region order, lifecycle hook isolation, and auto-import rules.
---

# structure-components Skill

You are an automated architectural guardrail for Vue 3 and Nuxt 4 codebase integrity. Your mission is to enforce strict engineering boundaries across `app/components/`. You must isolate templates from processing business logic, guarantee correct Nuxt auto-import behaviors, maintain structural consistency within `<script setup>` blocks, and prevent unrecoverable runtime lifecycle failures.

## When to Use This Skill

- Creating a new Vue component or page
- Moving a component between routes or promoting to `common/`
- Configuring `nuxt.config.ts` component auto-imports
- Structuring `<script setup>` blocks
- Deciding where a component lives in the hierarchy

---

## Three-Tier Hierarchy

| Tier             | Directory                                                  | Purpose                                                                                       | May Fetch? | May Use Composables? |
| ---------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------- | -------------------- |
| **Layout**       | `layout/`                                                  | Global structural wrappers (default-layout, auth-layout). Slot-driven.                        | ❌         | ❌                   |
| **Common**       | `common/`                                                  | Cross-route shared widgets (AppHeader, AppSidebar, AppToastContainer). Consume DS components. | ❌         | ❌                   |
| **Route-scoped** | `pages/<route>/components/` or `app/<feature>/components/` | Single-route components. May fetch + use composables.                                         | ✅         | ✅                   |

- **Layout** — app chrome. No business logic, no data fetch.
- **Common** — promoted when ≥2 distinct routes need the same widget. Expose simple props/emits API. No business logic.
- **Route-scoped** — single-use per route. NOT auto-imported (explicit import for traceability).

DS components (`@beetween/design-system-ui`) follow a separate structure skill (`scaffold-design-system-component` in DS repo). This skill covers app-tier only.

---

## DS Library Structure (separate from Nuxt app tier)

**CRITICAL: This section applies ONLY to `@beetween/design-system-ui` package components. Nuxt app components follow the "Blockade of index.ts" rule above (no index.ts in app component folders).**

In the DS library, component structure differs:

- **Public `index.ts`** exports TYPES ONLY (never the `.vue` file). Example: `export type { BtTableProps, BtTableEmits } from './bt-table.types'`
- **Private subcomponents** extracted during refactor live in a `parts/` subfolder: `src/components/<name>/parts/*.vue`. These are NEVER exported from the public `index.ts`.
- **Generic SFC renderers**: when a component is a generic SFC (`<script setup generic="T ...">`, e.g. a typed DataTable), keep the generic `<T>` cell renderers + the DataTable INLINE in the parent. Pushing `<T>` through a child SFC's props destroys type inference AND breaks `vue-component-meta` docgen. Extract only NON-generic chrome (toolbar, selection bar, results badge, empty state, footer) into `parts/`. Canonical examples: `BtTable/parts/` and `BtChatWidget/parts/`.
- **Colocated parts typing**: when a component has a `parts/` folder, each part's prop/emit types live in a SIBLING `parts/<part-name>.types.ts` file (colocated), NOT hoisted into the parent component's `<name>.types.ts`. Part type names stay component-prefixed (e.g. `BtTableSkeletonProps`).

---

## File Layout Rule E (NON-NEGOTIABLE)

Each component in its own kebab-case `<name>/` folder. All files inside share the folder name as prefix:

```
<name>/
├── <name>.vue                    ← SFC
├── <name>.types.ts               ← Props/Emits interfaces + exported types
├── <name>.constants.ts           ← local constants (NOT enums in .vue)
├── <name>.utils.ts               ← pure functions
├── composables/                  ← only when component has ≥1 composable
│   └── <use-name>/
│       ├── <use-name>.ts
│       └── <use-name>.test.ts
├── <name>.test.ts                ← Vitest unit/component tests
└── index.ts                      ← named exports only (library/DS); pages allowed default
```

- **layout/** — app chrome, used by layouts only, `App` prefix (e.g. `AppSidebar`)
- **common/** — promoted here when a second distinct route needs it; `pathPrefix: false`
- **{route-name}/** — route-scoped; sub-routes become nested folders (`recruitment/[id]/`)

### Route & Sub-Route Mapping Directory Rules

- Sub-routes: Map directly to nested folders inside the parent: `/analytics/sources` $\rightarrow$ `analytics/sources/`.
- Dynamic Segments: Use matching Nuxt bracket configurations: `/recruitment/{id}` $\rightarrow$ `recruitment/[id]/`.
- Prefix Isolation: Components inside route folders drop the route prefix internally (e.g., `home/components/RecruitmentsWidget/` instead of `HomeRecruitmentsWidget`).

---

## 2. Hard Architectural Gates & Engineering Constraints

### CRITICAL GUARDRAIL 1: Explicit Page Root Imports

Page root components (`{RouteName}Page.vue`) live at the root of a route directory. This directory is never registered for auto-import in `nuxt.config.ts`.

- Action: Whenever you generate or wire up a file in pages//\*.vue, you must write a hard, explicit static import statement pointing directly to the component.
- Reasoning: Omitting the import statement causes a fatal runtime layout breach: [Vue warn]: Failed to resolve component: XxxPage.
- Correct Execution Example:

```Vue
<script setup lang="ts">
  import HomePage from '~/components/home/HomePage.vue' // CRITICAL STATIC IMPORT REQUIRED
  definePageMeta({ layout: 'default' })
</script>
<template><HomePage/></template>
```

### CRITICAL GUARDRAIL 2: Complete Lifecycle Hook & Watcher Isolation

- Absolute Prohibition: You must never import watch, watchEffect, onMounted, onUnmounted, or onBeforeUnmount from 'vue' inside a .utils.ts module, and you must never call them within a composable hook.
- Reasoning: Vue 3's withAsyncContext tracking engine only binds instances cleanly during top-level execution sequences inside <script setup>. Calling lifecycle methods or watchers inside an asynchronous composable file after an await boundary will drop the callback registration or cause permanent memory leaks (watchers fail to unmount).
- Enforcement Action: The .utils.ts sidecar composable must only return raw functions, reactive data properties, and derived states. The .vue presentational file retains exclusive, explicit ownership over lifecycle hook and watcher registrations.
- Correct Execution Example:

```Typescript
// 📄 ComponentName.utils.ts
  export function useFeatureActions(props: Props) {
    const data = ref(null)
    async function load() { data.value = await api.get() }
    function handleStateChange(newVal: string) { /* ... */ }
    return { data, load, handleStateChange } // Returns callbacks cleanly
  }
```

```Vue
<!-- 📄 ComponentName.vue -->
  <script setup lang="ts">
  const { data, load, handleStateChange } = useFeatureActions(props)
  onMounted(load) // ✅ Hooks registered exclusively in presentational view
  watch(() => props.active, handleStateChange)
  </script>
```

### CRITICAL GUARDRAIL 3: The Blockade of index.ts

- Absolute Prohibition: Do not create an index.ts or barrel export file inside any component folder.
- Reasoning: Nuxt auto-imports .vue files directly based on configured directories. Creating an index.ts that re-exports a .vue file forces Nuxt to register the component twice, throwing a duplicate name collision block at compilation time.

### CRITICAL GUARDRAIL 4: Nuxt Config Prefix Balancing

When adjusting configurations inside `nuxt.config.ts`:

- If sub-components inside a folder are already named with the prefix (e.g., AnalyticsChart.vue inside analytics/components/), the declaration must use pathPrefix: false. Do NOT use prefix: 'Analytics' as this creates duplicate registrations like `<AnalyticsAnalyticsChart />`.

## 3. Folder-Per-Component File Matrix

Every component that is not a trivial, single-purpose presentational leaf must be split into a dedicated directory matching the PascalCase name of the component, containing these isolated single-responsibility modules:

```text
ComponentName/
├── ComponentName.vue        ← Presentational layer only. Ultra-thin <script setup>, maps sidecar logic.
├── ComponentName.utils.ts   ← Pure TypeScript layer. High-density composable factories and calculations.
├── ComponentName.types.ts   ← TypeScript-only file. Explicit interfaces (Created for non-trivial props/emits).
└── ComponentName.css        ← Custom CSS. Allowed ONLY for third-party overrides or complex pseudo-selectors.
```

### Component Size Gates

- `<script setup>` Bounds: Max 50 lines. If exceeded, business logic extraction to .utils.ts is broken.
- Template Bounds: Max 150 lines. If exceeded, the view must be split into focused child components.
- Performance Constraints: Do not call functions per-row inline inside template interpolation blocks (e.g., {{ formatLabel(row.x) }}). All loop iterations must resolve variables instantly via O(1) lookups pointing to a pre-computed computed Map array configured inside .utils.ts.

## 4. Script Setup Structural Code Guidelines

### Import Categorization Order

When compiling the block header of a .vue file, organize explicit external imports in this exact order. Never import framework properties (ref, computed, useRoute) since Nuxt handles them auto-reactively.

1. PrimeVue Primitives: import type { PageState } from 'primevue/paginator'
2. Auto-Generated API Composables: import { useList1 } from '~/api/generated/...'
3. Auto-Generated API Types: import type { Dto } from '~/api/generated/model/...'
4. Shared Shared Composables: import { useSidebar } from '~/composables/useSidebar'
5. Sibling Layout Components: import Card from '~/components/common/Card.vue'
6. Local Composable sidecars: import { useMyComponent } from './MyComponent.utils'
7. Local Type Interfaces: import type { MyComponentProps } from './MyComponent.types'

Framework auto-imports (`ref`, `computed`, `useRouter`) are NEVER explicitly imported.

### Explicit Compiler Region Layout Block

Organize the body of your `<script setup>` or `.utils.ts` file into these strict region blocks using matching #region and #endregion syntax parameters. Never use imperative versions of compiler macros; always use the type-safe implementations (`defineProps<Props>`(), `defineEmits<Emits>()`).

```Plaintext
// #region Interfaces
// #region Page meta (Used exclusively within target files in pages/)
// #region Props
// #region Emits
// #region Model
// #region Composables
// #region Constants
// #region State
// #region Computed
// #region Watchers
// #region Guards
// #region Methods
// #region Handlers
```

Never create empty regions. Each region label is unique per file.

## 5. Output Verification Ledger

When structural refactoring or creation loops are concluded, return an architectural layout summary utilizing this structure:

```Markdown
### 1. Architectural File Mapping Ledger
- **Presentational Matrix**: `app/components/.../{ComponentName}/{ComponentName}.vue`
- **Extracted Logic Sidecar**: `app/components/.../{ComponentName}/{ComponentName}.utils.ts`
- **Type Definitions Scope**: `app/components/.../{ComponentName}/{ComponentName}.types.ts`

### 2. High-Priority Guardrail Checklist
- [ ] **Explicit Page Linkage**: Confirmed manual import statements exist inside target `pages/` files for all modified page roots.
- [ ] **Lifecycle Hook Isolation**: Verified zero hooks (`onMounted`, `watch`, etc.) exist within the `.utils.ts` module.
- [ ] **Auto-Import Compatibility**: Confirmed no `index.ts` files were added or checked into the feature directory.
- [ ] **Performance Boundary Check**: Confirmed zero inline functions are called inside template iterations; all row lookups use pre-computed O(1) Map variables.

### 3. Script Setup Code Structuring
- **Lines Count Summary**: Script Setup lines count: `[X]/50`, Template lines count: `[Y]/150`.
- **Region Layout Applied**: Confirmed compiler macros follow the exact `#region` execution block order.
```

## Forbidden

| Pattern                                              | Reason                                         |
| ---------------------------------------------------- | ---------------------------------------------- |
| `<style>` blocks in `.vue`                           | Tailwind utilities replace all                 |
| Component >300 LOC                                   | Extract into composables/sub-components        |
| Inline composable definition                         | Always extract — `<name>.<composable>.ts`      |
| Anonymous default export of `.vue`                   | Named export from `index.ts`                   |
| Default export from `common/` / `layout/` `index.ts` | Must be named                                  |
| Route-scoped implicit auto-import                    | Explicit import required                       |
| `Pinia` usage                                        | Discouraged — use TanStack Query + composables |

---

## Cross-Links

- `style-tailwind` — Tailwind v4, `<style>` ban, responsive, tokens
- `enforce-a11y` — ARIA, landmarks, form labelling, WCAG 2.2
- `primevue-component-usage` — DS PrimeVue preset, PassThrough, component selection
- `vue-composable-testing-patterns` — Vitest tests for extracted composables
- `tanstack-query-patterns` — useQuery/useMutation conventions
- `scaffold-design-system-component` — DS-side counterpart (cross-repo)
