
# TanStack Query Error Handling

Scope: CSR-only composables using `useQuery`/`useMutation`. NOT route handlers, NOT SSR.

---

## HTTP Error Classification

| Status | Category | UI Treatment |
|---|---|---|
| 0 / network | Network | DS `Banner` severity=error + retry CTA |
| 401 | Unauthenticated | Force re-auth via IAM (see `iam-oidc-setup`) |
| 403 | Forbidden | DS `EmptyState` "no access" — NO retry |
| 404 | Not found | DS `EmptyState` "not found" — NO retry |
| 409 | Conflict (optimistic lock) | Toast warn + refetch + re-prompt user |
| 422 | Validation | Inline field errors via `aria-describedby` |
| 5xx | Server | DS `Banner` severity=error + retry CTA |

---

## Error Classifier Helper

Pure function — `app/utils/error-classifier.ts`.

```ts
type ErrorKind = 'network' | 'unauthenticated' | 'forbidden' | 'notFound' | 'conflict' | 'validation' | 'server'

interface ClassifiedError {
  kind: ErrorKind
  status: number | null
  fieldErrors?: Record<string, string>
}

export function classifyError(err: unknown): ClassifiedError {
  if (!err || !(err instanceof Error)) return { kind: 'network', status: null }
  const status = (err as { status?: number }).status ?? null
  if (status === 401) return { kind: 'unauthenticated', status }
  if (status === 403) return { kind: 'forbidden', status }
  if (status === 404) return { kind: 'notFound', status }
  if (status === 409) return { kind: 'conflict', status }
  if (status === 422) return { kind: 'validation', status, fieldErrors: (err as any).fieldErrors }
  if (status && status >= 500) return { kind: 'server', status }
  return { kind: 'network', status: null }
}
```

---

## Four Required UI States

Every data-driven view MUST implement all four. A blank area is always a bug.

| State | Condition | Render |
|---|---|---|
| Loading | `isPending` | DS `Loader` or skeleton + `aria-busy="true"` |
| Empty | `isSuccess && data.length === 0` | DS `EmptyState` |
| Error | `isError` | DS `Banner` severity=error, message keyed by category |
| Success | data present | Rendered content |

Optional 5th: `isFetching && !isPending` → subtle indicator + `aria-busy="true"` (background refetch).

```vue
<template>
  <Loader v-if="isPending" aria-busy="true" />
  <Banner v-else-if="isError" severity="error" :message="t(errorKey)" @retry="refetch" />
  <EmptyState v-else-if="!items.length" />
  <template v-else>
    <span v-if="isFetching" class="sr-only" aria-busy="true" />
    <DataList :items="items" />
  </template>
</template>
```

---

## useQuery Pattern

```ts
const { data, isPending, isError, error, isSuccess, isFetching, refetch } = useQuery({
  queryKey: ['recruitment', 'candidates', filters],
  queryFn: () => candidateService.list(filters.value),
})

const errorState = computed(() => classifyError(error.value))
const errorKey = computed(() => `common.errors.${errorState.value.kind}`)
```

---

## useMutation Pattern

```ts
const toast = useToast()
const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: (payload: CreateCandidateDto) => candidateService.create(payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['recruitment', 'candidates'] })
    toast.add({ severity: 'success', summary: t('recruitment.candidate.createSuccess'), life: 3000 })
  },
  onError: (err) => {
    const { kind, fieldErrors } = classifyError(err)
    if (kind === 'validation') {
      // surface fieldErrors inline — NO toast
      applyFieldErrors(fieldErrors)
      return
    }
    if (kind === 'forbidden' || kind === 'notFound') return // route-level banner handles it
    toast.add({ severity: kind === 'conflict' ? 'warn' : 'error', summary: t(`recruitment.candidate.createError`), life: 5000 })
  },
})
```

`onError` MUST NOT be omitted. NEVER swallow silently.

---

## Toast Policy

| Outcome | Toast? | Severity |
|---|---|---|
| Mutation success | YES | `success` |
| Mutation transient error (5xx / network) | YES | `error` |
| Mutation 422 validation | NO — inline field errors | — |
| Mutation 403 / 404 | NO — route-level banner | — |
| Optimistic concurrency 409 | YES | `warn` |
| Query error | NO — UI state covers it | — |

Register `<Toast />` once in root layout. Call `useToast()` once at composable top — never inside handlers.

---

## i18n Key Naming

Cross-link: `i18n-nuxt-translation-usage`.

| Context | Pattern | Example |
|---|---|---|
| Mutation success/error toast | `{feature}.{entity}.{action}{Outcome}` | `recruitment.candidate.deleteSuccess` |
| Inline field error | `{feature}.{entity}.errors.{field}` | `recruitment.candidate.errors.email` |
| Generic kind fallback | `common.errors.{kind}` | `common.errors.server` |
| Ultimate fallback | `common.errors.unexpected` | — |

All keys added to ALL locale files in same commit.

---

## Anti-Patterns

| ❌ | Why |
|---|---|
| Silent `catch` / empty `onError` | User gets no feedback |
| Generic "Something went wrong" without category | Masks root cause |
| Toast for query errors | UI state covers reads — toast is for mutations |
| Missing loading or empty state | Blank screen on slow/empty data |
| Retry CTA on 403 / 404 | Retrying won't fix auth or missing resource |
| Swallowed 422 without inline errors | User can't fix form |
| Hardcoded error strings | Must be i18n keys through `t()` |
| `useToast()` inside handler | Must be called at composable top level |

---

## Cross-Links

- `tanstack-query-patterns` — queryKey conventions, optimistic updates
- `i18n-nuxt-translation-usage` — MF2 syntax, locale file structure
- `iam-oidc-setup` — re-auth flow for 401
- `nuxt-orval-runtime` — generated DTOs + typed error shapes
- `enforce-a11y` — `aria-busy`, `aria-describedby` for field errors
- `primevue-component-usage` — Toast, Banner, EmptyState component details
