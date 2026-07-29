---
name: optimize-rendering
description: Vue 3 + PrimeVue rendering performance rules — measure first, then v-for, DataTable, lazy load, bundle, Web Vitals.
---

# Optimize Rendering

## Philosophy

Default Vue 3 + PrimeVue is fast enough. Optimise only after profiler or Web Vitals data justifies it. Never apply `v-memo`, `shallowRef`, or `markRaw` speculatively.

---

## v-for / List Rendering

| Rule | Why |
|---|---|
| Stable `:key` from data ID — never index | DOM reuse correctness |
| No nested `v-for` O(N²); pre-compute in composable | Re-render cost |
| Heavy item content → extract child component | Vue skips unchanged children |
| Virtual-scroll when >100 visible items | DOM node cost |

```ts
// ❌ key="index" breaks on sort/filter
<div v-for="(item, i) in items" :key="i">

// ✅ stable ID
<div v-for="item in items" :key="item.id">
```

---

## PrimeVue DataTable

- `:dataKey="'id'"` always — required for row identity.
- Static `<Column>` in template — avoid `v-for` over columns (slower change detection).
- Server-side pagination/sort/filter via TanStack Query for >100 rows. See `tanstack-query-patterns`.
- Lazy mode (`lazy`, `@page`, `@sort`, `@filter`) for server-paginated data.
- Avoid `<template #body>` per cell unless needed — default cell rendering is faster.

```vue
<DataTable
  :value="rows"
  dataKey="id"
  lazy
  @page="onPage"
  @sort="onSort"
>
  <Column field="name" header="Name" sortable />
  <Column field="status" header="Status" />
</DataTable>
```

See `primevue-component-usage` for `:pt` PassThrough conventions.

---

## Lazy Loading

- **Route-level**: Nuxt auto code-splits per page.
- **Component-level**: `defineAsyncComponent` for modals, dialogs, charts.
- **Module-level**: dynamic `import()` for libs used in one path (PDF, chart).

```ts
const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))
const pdf = await import('pdfmake')
```

---

## Bundle Analysis

```bash
npm run build && npm run analyze   # nuxi analyze
```

**Budgets** (gzipped):

| Chunk | Limit |
|---|---|
| Per route | ≤200 KB |
| Vendor | ≤350 KB |
| Total initial | ≤500 KB |

Offenders → source-map-explorer. See `validate-quality-gates`.

---

## Web Vitals Targets

| Metric | Good |
|---|---|
| LCP | <2.5 s |
| CLS | <0.1 |
| INP | <200 ms |
| TTFB | <800 ms |

---

## Re-render Reduction

```ts
const rows = shallowRef<Item[]>([])        // large frozen lists ≥1000 items
const config = Object.freeze(rawConfig)    // never-mutated prop data
const chart = markRaw(new ChartInstance()) // class instances
```

- `computed` over recomputing in template.
- `v-once` for static blocks (legal, footer).
- `v-memo="[deps]"` for expensive sub-trees — profile first, rare.

---

## Image / Asset

```vue
<NuxtImg
  src="/hero.jpg"
  width="800"
  height="450"
  loading="lazy"
  provider="ipx"
/>
```

- Explicit `width`/`height` — prevents CLS.
- `loading="lazy"` for below-fold.
- Icons via DS `Icon` component — never inline `<svg>` blobs per use.

---

## CSS / Tailwind

- JIT only what's used (default in v4).
- No arbitrary-value sprawl — promote to design tokens. See `style-tailwind` and cross-repo `design-system-tokens-source-of-truth`.
- No CSS-in-JS at runtime.

---

## Composables

Long-lived reactive subscriptions → clean up via `onScopeDispose` / `tryOnScopeDispose` (vueuse). See `vueuse-composable-usage`.

---

## Profiling Workflow

1. Reproduce slow path with CPU throttle 4×.
2. Chrome DevTools Performance trace.
3. Identify long tasks >50 ms.
4. Vue DevTools timeline for component re-renders.
5. Fix smallest root cause.
6. Re-measure.
7. Commit only if measurable improvement.

---

## Anti-Patterns

| ❌ Pattern | Problem |
|---|---|
| `key="index"` | Breaks DOM reuse on sort/filter |
| Inline objects/functions in props | New reference every render |
| `v-for` over `<Column>` definitions | Slower change detection |
| Missing `dataKey` on DataTable | Row identity broken |
| `shallowRef`/`v-memo` everywhere | Premature — profile first |
| Hand-rolled virtualization | DataTable handles it |
| Importing entire icon libs | Bundle bloat |
| Eager-loading heavy modals | Delays initial parse |
| Missing image dimensions | CLS regression |

---

## Cross-Links

- `primevue-component-usage` — DataTable `:pt`, PassThrough, component rules
- `tanstack-query-patterns` — server-side pagination/sort/filter integration
- `vueuse-composable-usage` — `tryOnScopeDispose`, reactive utilities
- `nuxt4-spa-conventions` — route code-splitting, Nuxt config
- `style-tailwind` — Tailwind v4 token usage, class ordering
- `validate-quality-gates` — bundle budget enforcement, Lighthouse CI
- `design-system-tokens-source-of-truth` *(cross-repo)* — canonical DS tokens
