---
name: vue-composable-testing-patterns
description: Vitest patterns for testing Vue composables and components in Nuxt 4 SPA — layers, MSW, TanStack Query, fakes, anti-patterns.
---

# Vue Composable & Component Testing Patterns

## Stack

| Package                | Role                                                   |
| ---------------------- | ------------------------------------------------------ |
| `vitest`               | Test runner + coverage                                 |
| `@vue/test-utils`      | Mount components, trigger events                       |
| `@nuxt/test-utils`     | `mountSuspended`, Nuxt-aware runtime                   |
| `@testing-library/vue` | Optional — user-centric assertions (`getByRole`, etc.) |
| `msw` (node)           | HTTP interception — see `api-mock-strategy-msw`        |

---

## Test File Co-location (Rule E)

Per `structure-components` rule E: `<name>.test.ts` lives next to `<name>.ts` / `<name>.vue`. One test file per folder. No `__tests__/` directories.

```
candidate-list-table/
├── candidate-list-table.vue
├── candidate-list-table.use-filters.ts
└── candidate-list-table.test.ts
```

---

## Three Test Layers

| Layer        | Tool                                         | When                          |
| ------------ | -------------------------------------------- | ----------------------------- |
| Pure utility | Vitest `describe`/`it`                       | No reactivity, no DOM         |
| Composable   | Vitest + `effectScope` / `mountSuspended`    | Reactive logic, no DOM needed |
| Component    | `@vue/test-utils` `mount` / `mountSuspended` | DOM + user interactions       |

---

## MANDATORY: Exhaustive Unit Tests for Utils, Helpers, and Composables

**RULE**: Every utility function, helper, and composable MUST have unit tests covering:

1. **Happy path** — normal inputs, expected outputs
2. **Boundary conditions** — edge cases (empty, null, undefined, max length, zero, etc.)
3. **Error states** — invalid inputs, type coercion failures
4. **Type safety** — null/undefined handling, type narrowing
5. **Output invariants** — return type, length, structure consistency

**File location**: `<name>.test.ts` colocated with the utility/helper/composable file. No `__tests__/` directories.

### Pure Utility Test Template

```ts
import { describe, it, expect } from "vitest";
import { yourUtility } from "./your-utility";

describe("yourUtility", () => {
  describe("happy path", () => {
    it("handles normal input", () => {
      expect(yourUtility("valid")).toBe("expected");
    });
  });

  describe("boundary conditions", () => {
    it("handles empty string", () => {
      expect(yourUtility("")).toBe("");
    });

    it("returns sensible default for null", () => {
      expect(yourUtility(null)).toBe("default");
    });

    it("returns sensible default for undefined", () => {
      expect(yourUtility(undefined)).toBe("default");
    });
  });

  describe("type invariants", () => {
    it("always returns string", () => {
      expect(typeof yourUtility("test")).toBe("string");
    });

    it("output respects length constraint", () => {
      expect(yourUtility("very long input").length).toBeLessThanOrEqual(100);
    });
  });
});
```

### Composable Test Template (with reactivity)

```ts
import { effectScope } from "vue";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useYourComposable } from "./use-your-composable";

describe("useYourComposable", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("initializes with default state", () => {
    const scope = effectScope();
    scope.run(() => {
      const { state } = useYourComposable();
      expect(state.value).toBe("initial");
    });
    scope.stop();
  });

  it("handles reactive updates", async () => {
    const scope = effectScope();
    scope.run(() => {
      const { state, setState } = useYourComposable();
      setState("new");
      expect(state.value).toBe("new");
    });
    scope.stop();
  });

  it("cleans up on scope stop", () => {
    const scope = effectScope();
    scope.run(() => {
      const { onCleanup } = useYourComposable();
      expect(onCleanup).toBeDefined();
    });
    scope.stop();
  });
});
```

**Non-negotiable minimum**: Every exported utility/helper/composable MUST have a colocated `.test.ts` file with at least 15–20 test cases covering happy path, boundaries, type safety, and invariants. No exceptions.

---

## Composable Test Pattern

```ts
import { effectScope } from "vue";
import { describe, it, expect, vi, afterEach } from "vitest";

describe("useDebouncedSearch", () => {
  afterEach(() => vi.useRealTimers());

  it("debounces query updates", async () => {
    vi.useFakeTimers();
    const scope = effectScope();
    scope.run(() => {
      const { query, setQuery } = useDebouncedSearch(100);
      setQuery("a");
      setQuery("ab");
      expect(query.value).toBe(""); // not flushed yet
      vi.advanceTimersByTime(100);
      expect(query.value).toBe("ab");
    });
    scope.stop(); // always stop — prevents reactive leaks
  });
});
```

---

## TanStack Query in Tests

Fresh `QueryClient` per test — never reuse. Cross-link: `tanstack-query-patterns`, `tanstack-query-error-handling`.

**Composables using `useQuery` run inside a minimal mounted host component** (an inline `defineComponent` that calls the composable) — `effectScope` alone misses query lifecycle (suspense, cleanup). Hosts are unmounted in `afterEach` to stop queries and clear subscriptions.

```ts
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";

it("renders results", async () => {
  const testClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = await mountSuspended(CandidateList, {
    global: { plugins: [[VueQueryPlugin, { queryClient: testClient }]] },
  });
  await flushPromises();
  expect(
    wrapper.findAll('[data-testid="candidate-row"]').length,
  ).toBeGreaterThan(0);
});
```

Query resolution is asynchronous: assert with `vi.waitFor(() => { ... })` (real timers) after mounting, not immediately.

---

## HTTP Mocking — MSW

Node server in `vitest.setup.ts`. Per-test overrides via `server.use(...)`. NEVER stub `fetch`/`axios` manually. Cross-link: `api-mock-strategy-msw`.

```ts
// vitest.setup.ts
export const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// per-test override
server.use(http.get("/api/candidates", () => HttpResponse.error()));
```

---

## Lightweight Alternative — vi.mock of the Generated API Module

For unit tests that target composable mapping/unwrap logic (query key, `enabled` gating, status-union handling), network-layer mocking via MSW is heavier than needed. **Mock the GENERATED MODULE boundary, never DTOs**:

```ts
import { searchRecipes } from "~/api/generated/recipes/recipes";

vi.mock("~/api/generated/recipes/recipes", () => ({
  searchRecipes: vi.fn(),
}));

// beforeEach
vi.mocked(searchRecipes).mockReset();
```

- The mock replaces the generated function — DTO types stay real (imported from `client.schemas`), so response factories remain type-checked.
- Mock ONE generated file per test file, at its import path; assertion goes through `vi.mocked(fn)`.
- **Never mock DTO types/schemas themselves** — that erases the contract being tested.
- MSW stays the default for integration-flavoured component tests; `vi.mock` of the generated module is the accepted lighter alternative for pure composable unit tests.
- Only the fetch-layer unit itself (`client.ts` mutator) stubs `fetch` — via `vi.stubGlobal("fetch", ...)`, never by mocking DTOs.

---

## Response & Fixture Factories

**Response factories build the full Orval envelope** — all three fields, with the literal status:

```ts
vi.mocked(searchRecipes).mockResolvedValue({
  status: 200 as const,
  data: okSearchResponse(),
  headers: new Headers(),
});
```

- `status: N as const` (never a bare `number`) so the union discriminates in test scope too; `headers: new Headers()` always present.
- **Error fixtures replicate the backend error envelope exactly** — every field (`timestamp`, `status`, `error`, `path`, `code`, `message`) — because the fetch layer narrows `message` from that shape:

```ts
vi.mocked(getRecipe).mockResolvedValue({
  status: 404,
  data: {
    timestamp: "2026-09-04T10:00:00Z",
    status: 404,
    error: "Not Found",
    path: "/api/recipes/999",
    code: "RECIPE_NOT_FOUND",
    message: "Recipe not found",
  },
  headers: new Headers(),
});
```

**DTO test data via an `item(overrides: Partial<Dto>)` factory** spread over one full valid object — every new field keeps compiling; tests only name the fields they vary:

```ts
function item(overrides: Partial<RecipeSearchItemDto> = {}): RecipeSearchItemDto {
  return {
    id: "1", name: "Pancakes", totalIngredients: 3,
    matchedIngredients: 3, missingIngredients: [], readyToCook: true,
    ...overrides,
  };
}
```

---

## Mocking nuxt-auth

Prefer plugin injection (avoids hoisting). Mock only the API surface used. Cross-link: `iam-oidc-setup`.

```ts
const stubAuth = { user: { id: "1", name: "Test" }, isAuthenticated: true };
await mountSuspended(MyComponent, {
  global: { provide: { "nuxt-auth": stubAuth } },
});
// or: vi.mock('@beetween/nuxt-auth', () => ({ useAuth: () => stubAuth }))
```

---

## Module-Singleton Composables

Module-level singleton state (e.g. a shared store composable with localStorage persistence) leaks between tests. Test via `vi.resetModules()` + dynamic re-import to simulate a fresh page load:

```ts
// The singleton must re-import to reset its module state.
async function freshList() {
  const mod = await import("./use-ingredient-list");
  return mod.useIngredientList();
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.resetModules();
});
```

---

## Mocking i18n

Return key as-is. Assert on keys, not translated text. Cross-link: `i18n-nuxt-translation-usage`.

```ts
vi.mock("@beetween/nuxt-translation", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
```

---

## Component Test Pattern

```ts
import { mountSuspended } from "@nuxt/test-utils/runtime";
import CandidateCard from "./candidate-card.vue";

it("emits select on click", async () => {
  const wrapper = await mountSuspended(CandidateCard, {
    props: { candidate: fixture },
  });
  await wrapper.get('[data-testid="select-btn"]').trigger("click");
  expect(wrapper.emitted("select")?.[0]).toEqual([fixture]);
});
```

**Assert user-visible output** — text, `href`, `alt`, `aria-*` attributes, `loading="lazy"`/`decoding="async"` — never internal state or props plumbing:

```ts
expect(wrapper.find("img").attributes("alt")).toBe("Omelette");
expect(wrapper.find('a[href="/recipes/r1"]').exists()).toBe(true);
expect(wrapper.find("input[type='checkbox']").attributes("aria-label")).toBeDefined();
```

**Call-level assertions** on the mocked generated function, with the second arg (options/signal) matched loosely:

```ts
expect(searchRecipes).toHaveBeenLastCalledWith(
  expect.objectContaining({ ingredients: "egg,milk", page: 0 }),
  expect.anything(),
);
```

**Pages / dynamic routes**: simulate the route at mount time — `await mountSuspended(RecipeDetailPage, { route: "/recipes/42" })` — and assert the param-driven behavior, not the URL.

**Regression tests get a `// Regression:` comment naming the bug class** (e.g. `// Regression: shallow-ref watch misses in-place push() mutation`). Environment quirks (spy scope, localStorage prototype, timer interplay) get an explanatory comment so the next reader doesn't "fix" them.

---

## Selector Priority (cross-link: `e2e-playwright-critical-flows`)

1. `getByRole` — semantic, most resilient
2. `getByLabelText` — form inputs
3. `getByText` — visible text
4. `data-testid` — last resort
5. **NEVER** CSS classes

---

## Accessibility Assertion

`axe-core` via `@axe-core/vue` in component tests. Cross-link: `enforce-a11y`.

```ts
const results = await axe(wrapper.element);
expect(results.violations).toHaveLength(0);
```

---

## Fake Timers & Async

```ts
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers()); // always restore — leak breaks other tests
```

- Debounce tests: fake timers + `await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)` (async variant flushes queued microtasks too), then assert.
- **Retry/backoff tests use REAL timers** + `vi.waitFor` with an elevated timeout (4000ms) and a why-comment — the query's ~1s retry backoff exceeds the default 1s `waitFor` timeout:

```ts
// One retry with ~1s backoff: the error state lands just past the default
// 1s waitFor timeout, so give it room.
await vi.waitFor(() => {
  expect(wrapper.text()).toContain("Recipe not found");
}, { timeout: 4000 });
```

- `await flushPromises()` after state changes to flush microtasks / query resolution
- Always `await mountSuspended(...)` — resolves async setup + Suspense boundary

---

## Coverage

`vitest run --coverage`. Thresholds in `vitest.config.ts` per app.

| Glob                 | Floor          |
| -------------------- | -------------- |
| `app/composables/**` | 70% statements |
| `app/utils/**`       | 70% statements |

---

## Snapshot Policy

| Target                                    | Allowed?            |
| ----------------------------------------- | ------------------- |
| Component DOM tree                        | ❌ BANNED — brittle |
| Small text output (formatted date, label) | ✅ OK               |

---

## Anti-Patterns

| Pattern                              | Why Forbidden                             |
| ------------------------------------ | ----------------------------------------- |
| Testing TanStack Query internals     | Test composable behavior, not the library |
| CSS-class selectors                  | Break on refactor                         |
| DOM snapshot tests                   | Brittle, mask regressions                 |
| Hand-stubbed `fetch`/`axios`         | Use MSW — only exception: the fetch-layer unit itself stubs `fetch` via `vi.stubGlobal` |
| Mocking DTO types/schemas            | Mock the generated module boundary, never the DTOs — type-checked fixtures keep the contract real |
| Partial Orval envelopes in mocks     | Build all three fields: `{ status: N as const, data, headers: new Headers() }` |
| Realistic-shape-but-wrong error fixtures | Error fixtures replicate the backend error envelope exactly |
| Fake timers for retry-backoff tests  | Backoff uses real delays — real timers + `vi.waitFor({ timeout: 4000 })` |
| Leaking timers across tests          | `vi.useRealTimers()` in `afterEach`       |
| Not calling `scope.stop()`           | Reactive leak into next test              |
| Not unmounting query hosts           | Queries keep polling after the test ends  |
| Mocking entire `@beetween/*` package | Stub at API surface only                  |
| Real network in tests                | All HTTP via MSW node server (or `vi.mock` of the generated module) |

---

## Cross-Links

- `tanstack-query-patterns`, `tanstack-query-error-handling`
- `api-mock-strategy-msw`, `iam-oidc-setup`
- `enforce-a11y`, `structure-components`
- `i18n-nuxt-translation-usage`, `typescript-vue-conventions`
- `e2e-playwright-critical-flows`
