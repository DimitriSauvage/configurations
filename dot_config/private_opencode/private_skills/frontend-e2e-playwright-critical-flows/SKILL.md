
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
    <feature>.fixture.ts
  page-objects/
    <feature>-page.ts
  mocks/
  playwright.config.ts
```

## Page Object Model (Mandatory)

Locators + actions in `page-objects/`. Specs read like business prose.

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

Every critical spec MUST run axe:

```ts
import { checkA11y, injectAxe } from 'axe-playwright'

test.beforeEach(async ({ page }) => { await injectAxe(page) })

test('login page is accessible', async ({ page }) => {
  await checkA11y(page)
})
```

Failures **block CI**. See `enforce-a11y`.

## Console Error Policy

Zero console errors tolerated during critical flow:

```ts
test.beforeEach(async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') throw new Error(`Console error: ${msg.text()}`)
  })
})
```

## Network Mocking

| Profile | Strategy |
|---|---|
| `npm run test:e2e:integration` | Real backend, known-state test data |
| CI / offline | `page.route(...)` intercepts |

MSW is for unit tests. E2E prefers real backend or `page.route`. See `api-mock-strategy-msw`.

## CI Integration

```ts
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: { headless: true },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  ],
  reporter: [['html'], ['github']],
})
```

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
