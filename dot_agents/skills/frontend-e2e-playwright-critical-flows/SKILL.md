
# E2E Playwright — Critical Flows Only

## Philosophy

E2E covers **critical user flows only**. Not every page. Not every variant.

- Variants, validation rules, empty/loading/error states → Vitest + composable tests (see `vue-composable-testing-patterns`)
- Visual regression → Storybook in DS repo (no snapshot diffing)

## What Qualifies as Critical

| Flow | Critical? |
|---|---|
| Auth login + logout | YES |
| Impersonation start / stop | YES |
| Each domain primary create + edit + delete | YES |
| Payment / contract signing | YES |
| Search / filter UX variants | NO — Vitest |
| Form field validation rules | NO — Vitest on composable |
| Empty / loading / error visual states | NO — Storybook + Vitest |

## File Layout

```
e2e/
  tests/
    <feature>/
      <flow-name>.spec.ts
  fixtures/
    <feature>.fixture.ts   # typed DTO constants named by scenario + builders
    test.fixture.ts        # base test (console-error policy) + shared a11y helper
  page-objects/
    <feature>-page.ts
  mocks/
    api.ts                 # route handler modules returning recorded-call handles
  playwright.config.ts
```

- Specs grouped by user-facing feature; `describe` = scenario, `test` = user behavior in one sentence.

## Page Object Model (Mandatory)

Locators + actions in `page-objects/`. Specs read like business prose.

**Action methods assert their own postcondition** — a call that "succeeded" without the UI showing it is a false green:

```ts
/** Type a prefix and pick `name` from the catalog suggestions. */
async addIngredient(prefix: string, name: string): Promise<void> {
  await this.page.getByLabel("Add an ingredient").fill(prefix);
  await this.page.getByRole("option", { name, exact: true }).click();
  await expect(this.chip(name)).toBeVisible(); // self-asserting
}
```

Locators are role-based getters, scoped to landmarks when possible (`this.resultsRegion.getByRole("link")`).

```ts
// page-objects/auth-page.ts
export class AuthPage {
  constructor(private page: Page) {}
  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email)
    await this.page.getByLabel('Password').fill(password)
    await this.page.getByRole('button', { name: 'Sign in' }).click()
  }
}

// tests/auth/login.spec.ts — reads as prose
test('user can log in', async ({ page }) => {
  const auth = new AuthPage(page)
  await auth.login('user@example.com', 'secret')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
```

NEVER `page.locator('.css-class')` in spec files.

## Selector Priority

1. `getByRole(...)` — a11y wins
2. `getByLabel(...)` — form fields
3. `getByText(...)` — visible text
4. `data-testid` — only when above fail, sparingly
5. **NEVER** CSS class selectors — brittle

## A11y Assertions

Every critical spec MUST run axe — **one axe test per page state**, via a shared `checkPageA11y` helper:

```ts
export async function checkPageA11y(page: Page): Promise<void> {
  // Waits for the SPA to mount: in ssr:false mode the shell has no title,
  // main landmark or heading until the client app boots, and axe would
  // otherwise flag the empty shell.
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page).toHaveTitle(/My App/);
  await injectAxe(page);
  await checkA11y(page, { exclude: A11Y_EXCLUDE }); // documented exclusions
}
```

Failures **block CI**. See `enforce-a11y`.

## Console Error Policy

Zero console errors tolerated — enforced in the BASE FIXTURE, not per-spec: errors are collected during the test and fail it at teardown. The favicon is stubbed (SPA ships none; its 404 would surface as a console error):

```ts
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    const allowedStatuses = new Set<number>();
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const status = /status of (\d+)\b/.exec(message.text());
      if (status && allowedStatuses.has(Number(status[1]))) return;
      errors.push(message.text());
    });
    const testPage = Object.assign(page, {
      allowResourceError: (status: number) => allowedStatuses.add(status),
    }) as TestPage;
    await testPage.route("**/favicon.ico", (route) => route.fulfill({ status: 204 }));
    await use(testPage);
    if (errors.length > 0) throw new Error(`Console error(s) during test:\n${errors.join("\n")}`);
  },
});
```

**Escape hatch, never a policy change**: tests that deliberately provoke a failing status declare `page.allowResourceError(422)` — Chromium logs "Failed to load resource: the server responded with a status of N" as a console error. Per-test declaration instead of weakening the policy globally.

## Network Mocking — Hermetic by Default

E2E is **hermetic**: network mocked via `page.route` (no MSW in e2e). Playwright boots the dev server with the API base pointed at itself:

```ts
// playwright.config.ts
webServer: {
  command: 'npm run dev',
  env: { NUXT_PUBLIC_API_BASE: 'http://localhost:3000' },
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
}
```

**Mock helpers live in `mocks/`, typed against the generated DTOs, and return handles recording calls** so tests assert traffic, not just UI:

```ts
// mocks/api.ts
export async function mockRecipeSearch(
  page: Page,
  respond: (request: SearchRequest) => RecipeSearchResponseDto,
): Promise<SearchMock> {
  const calls: SearchRequest[] = [];
  await page.route("**/api/recipes/search**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const request: SearchRequest = { ingredients: params.get("ingredients") ?? "" /* ... */ };
    calls.push(request);
    return fulfillJson(route, respond(request));
  });
  return { calls };
}
```

```ts
// spec: assert traffic with expect.poll (async, not snapshot timing)
const search = await mockRecipeSearch(page, () => searchResponse([]));
await page.getByLabel("Add an ingredient").fill("chick");
await expect.poll(() => search.calls.map((c) => c.ingredients)).toContain("chick");
```

**Canary pattern for "no network call" invariants** — inline route counter + zero assertion, with a why-comment:

```ts
// Typing state changes must NOT trigger a detail lookup.
let recipeApiCalls = 0;
await page.route("**/api/recipes/**", (route) => { recipeApiCalls++; return route.continue(); });
// ... user actions ...
expect(recipeApiCalls).toBe(0);
```

| Profile | Strategy |
|---|---|
| Default / CI / offline | `page.route(...)` intercepts (hermetic) |
| Explicit real-backend profile | Known-state test data, opt-in only |

MSW is for unit tests. E2E uses `page.route`. See `api-mock-strategy-msw`.

## Fixtures — Typed DTO Constants

Fixtures in `fixtures/` are **typed DTO constants named by scenario** (`READY_PANCAKES`, `PARTIAL_OMELETTE`, `STAPLE_RICE`) plus **builders mirroring the UI page size** (re-declare `SEARCH_PAGE_SIZE` with a comment that it mirrors the composable constant; slice results per requested page):

```ts
/** 14 ready recipes — more than one page of 12. */
export const PAGED_RESULTS: RecipeSearchItemDto[] = Array.from({ length: 14 }, (_, i) => ({
  id: String(i + 1), name: `Paged Recipe ${String(i + 1).padStart(2, "0")}`,
  totalIngredients: 1, matchedIngredients: 1, missingIngredients: [], readyToCook: true,
}));

export function pagedSearchResponse(request: { page: number }): RecipeSearchResponseDto {
  const start = request.page * SEARCH_PAGE_SIZE;
  return searchResponse(PAGED_RESULTS.slice(start, start + SEARCH_PAGE_SIZE), PAGED_RESULTS.length, request.page);
}
```

Images use a data-URL pixel (`data:image/gif;base64,...`) so `<img>` rendering is exercised with zero network requests.

## CI Integration

```ts
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { headless: true, trace: { mode: 'on-first-retry' } },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  ],
  reporter: [['html'], ['github']],
})
```

Reference standard: **chromium-only** project, `fullyParallel`, trace on-first-retry, CI retries 2 — add firefox/webkit only if it earns its CI minutes.

Trace + video recorded on failure only (`on: 'on-first-retry'`).

## Anti-Patterns

| Anti-pattern | Why |
|---|---|
| Spec covers filter / variant UX | Belongs in Vitest |
| `data-testid` on every element | Selector overuse — use roles first |
| `page.waitForTimeout(N)` | Flaky — use `waitForSelector` / assertions |
| CSS class selectors in specs | Brittle to style changes |
| Asserting querystring shape | Assert UX outcome, not implementation |
| Console errors ignored | Masks real regressions |
| No Page Object Model | Specs become unmaintainable |
| Snapshot / visual diffing | Use Storybook in DS repo |

## Cross-Links

- `api-mock-strategy-msw`
- `vue-composable-testing-patterns`
- `enforce-a11y`
- `tanstack-query-error-handling`
- `iam-oidc-setup`
- `validate-quality-gates`
