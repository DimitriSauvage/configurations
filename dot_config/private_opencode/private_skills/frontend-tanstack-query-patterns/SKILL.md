---
name: tanstack-query-patterns
description: TanStack Query conventions for Nuxt 4 SPA — query keys, composable wrappers, mutations, stale-time defaults, pagination, and anti-patterns.
---

# TanStack Query Patterns

## Scope

All server state goes through `@tanstack/vue-query`. No manual fetch in components. No Pinia for server state.
Error handling → `tanstack-query-error-handling`.

---

## Module Install

```bash
npm install @tanstack/vue-query
```

Setup plugin — CSR-only (`.client.ts` suffix mandatory):

```ts
// app/plugins/vue-query.client.ts
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  })
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
})
```

---

## Query Key Conventions

Always hierarchical broad → narrow. Enables surgical invalidation.

| Key shape | Use |
|---|---|
| `[domain, entity, 'list', filters]` | Paginated / filtered list |
| `[domain, entity, 'detail', id]` | Single entity |
| `[domain, entity, 'related', id, relation]` | Related collection |

---

## Composable Wrapper Pattern (mandatory)

NEVER call `useQuery` / `useMutation` directly in components. Wrap in `composables/use-<entity>.ts`.

```ts
// composables/use-candidates.ts
export function useCandidates(filters: Ref<Filters>) {
  return useQuery({
    queryKey: ['recruitment', 'candidates', 'list', filters],
    queryFn: () => listCandidates(filters.value),
    staleTime: 30_000,
  })
}
```

---

## Query Options Factory (recommended for type safety)

```ts
export const candidateQueries = {
  list: (filters: Ref<Filters>) =>
    ({
      queryKey: ['recruitment', 'candidates', 'list', filters],
      queryFn: () => listCandidates(filters.value),
    }) as const,
  detail: (id: string) =>
    ({
      queryKey: ['recruitment', 'candidates', 'detail', id],
      queryFn: () => getCandidate(id),
    }) as const,
}

export function useCandidates(filters: Ref<Filters>) {
  return useQuery(candidateQueries.list(filters))
}
```

---

## Mutations

```ts
export function useDeleteCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['recruitment', 'candidates', 'list'] }),
  })
}
```

**Optimistic update sequence** — `onMutate` snapshot + patch → `onError` rollback → `onSettled` invalidate:

```ts
export function useUpdateCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateCandidate,
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ['recruitment', 'candidates', 'detail', patch.id] })
      const snapshot = qc.getQueryData(['recruitment', 'candidates', 'detail', patch.id])
      qc.setQueryData(['recruitment', 'candidates', 'detail', patch.id], (old) => ({ ...old, ...patch }))
      return { snapshot }
    },
    onError: (_err, patch, ctx) => {
      qc.setQueryData(['recruitment', 'candidates', 'detail', patch.id], ctx?.snapshot)
    },
    onSettled: (_data, _err, patch) => {
      qc.invalidateQueries({ queryKey: ['recruitment', 'candidates', 'detail', patch.id] })
    },
  })
}
```

---

## Stale-Time Defaults

| Data character | `staleTime` |
|---|---|
| High-churn live (notifications) | `0` |
| Standard list (candidates, jobs) | `30_000` (30 s) |
| Slow-change config (lookups, dictionaries) | `300_000` (5 min) |
| Per-session immutable (user profile) | `Infinity` |

Set per query — do not rely solely on plugin default.

---

## Pagination

- **Infinite scroll** → `useInfiniteQuery`, `getNextPageParam` from `pageInfo.cursor`.
- **Page navigation** → `useQuery` with `placeholderData: keepPreviousData`.

```ts
export function useCandidatesInfinite(filters: Ref<Filters>) {
  return useInfiniteQuery({
    queryKey: ['recruitment', 'candidates', 'list', filters],
    queryFn: ({ pageParam }) => listCandidates({ ...filters.value, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.pageInfo.cursor ?? undefined,
  })
}
```

---

## Prefetch

Use `queryClient.prefetchQuery` on hover or route enter — limit to clear UX wins. NEVER blind-prefetch all routes.

```ts
const qc = useQueryClient()
function onRowHover(id: string) { qc.prefetchQuery(candidateQueries.detail(id)) }
```

---

## Cancellation

Pass `signal` from `queryFn` context through to fetch. `nuxt-orval` does this automatically.

```ts
queryFn: ({ signal }) => listCandidates(filters.value, { signal })
```

---

## DevTools

`@tanstack/vue-query-devtools` — enable in non-prod via `useRuntimeConfig().public.isProd` check inside a `.client.ts` plugin.

---

## Anti-Patterns

| Pattern | Why forbidden |
|---|---|
| `useQuery` directly in component | Bypasses composable contract; breaks reuse + testing |
| Flat query keys (`['candidates']` only) | No surgical invalidation possible |
| Missing `staleTime` | Defaults to `0` → waterfall re-fetches on every render |
| Mutation without invalidation | Stale cache served after write |
| Optimistic update without rollback | Silent data corruption on error |
| Pinia for server state | Duplicates cache; ownership ambiguity |
| Manual `setQueryData` without key contract | Key drift → ghost cache entries |
| Sharing `QueryClient` across browser tabs | Cross-tab state corruption |

---

## Cross-Links

- `tanstack-query-error-handling` — HTTP error classification, toast rules, four UI states
- `nuxt-orval-runtime` — generated hooks, client configuration
- `orval-openapi-codegen` — OpenAPI → typed fetch functions
- `typescript-vue-conventions` — strict typing, no-any, discriminated unions
- `vue-composable-testing-patterns` — Vitest patterns for query composables
- `nuxt4-spa-conventions` — CSR-only plugin rules, `.client.ts` suffix
