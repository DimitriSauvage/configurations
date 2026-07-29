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
| Hand-stubbed `fetch`/`axios`         | Use MSW                                   |
| Leaking timers across tests          | `vi.useRealTimers()` in `afterEach`       |
| Not calling `scope.stop()`           | Reactive leak into next test              |
| Mocking entire `@beetween/*` package | Stub at API surface only                  |
| Real network in tests                | All HTTP via MSW node server              |

---

## Cross-Links

- `tanstack-query-patterns`, `tanstack-query-error-handling`
- `api-mock-strategy-msw`, `iam-oidc-setup`
- `enforce-a11y`, `structure-components`
- `i18n-nuxt-translation-usage`, `typescript-vue-conventions`
- `e2e-playwright-critical-flows`
