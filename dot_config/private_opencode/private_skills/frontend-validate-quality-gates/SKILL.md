---
name: validate-quality-gates
description: Pre-PR gate sequence, triage map for common failures, and frontend delivery pipeline from UX direction through code review.
---

# Validate Quality Gates

## Frontend Delivery Pipeline

Every feature follows this sequence. Each stage MUST complete before the next. Failures bounce to the earliest stage capable of fixing.

| # | Stage | Skill |
|---|---|---|
| 1 | **UX direction** — layout, component map, states decided | `design-ux-direction` |
| 2 | **Architecture analysis** — infra checks, API strategy, task breakdown | `analyze-feature-architecture` |
| 3 | **Implementation** — components, types, queries, translations | `structure-components`, `typescript-vue-conventions`, `style-tailwind`, `enforce-a11y`, `primevue-component-usage`, `i18n-nuxt-translation-usage`, `tanstack-query-patterns`, `nuxt-orval-runtime` |
| 4 | **Quality gates** — this skill | — |
| 5 | **Code review** | `review-vue-code-quality` |
| 6 | **E2E** (critical flows only) | `e2e-playwright-critical-flows` |

---

## Gate Sequence

Run in order. Stop on first red.

| # | Command | Purpose | Skill |
|---|---|---|---|
| 1 | `npm ci` | Reproducible deps | — |
| 2 | `npm run lint` | ESLint + flat config | `beetween-eslint-prettier-shared-config` |
| 3 | `npm run format:check` | Prettier verification | `beetween-eslint-prettier-shared-config` |
| 4 | `npm run typecheck` | `vue-tsc --noEmit` | `typescript-vue-conventions` |
| 5 | `npm run test:unit` | Vitest unit + composable | `vue-composable-testing-patterns` |
| 6 | `npm run build` | Production build sanity | `nuxt4-spa-conventions` |
| 7 | `npm run test:e2e` *(critical flows only)* | Playwright | `e2e-playwright-critical-flows` |

---

## CI vs Local

| Step | Local pre-PR | CI |
|---|---|---|
| 1–4 | lint-staged on changed files | Full repo |
| 5 | Affected workspace | Full suite |
| 6 | First push | Required |
| 7 | If relevant | Required for critical flows |

Husky pre-commit: lint + format + typecheck on staged files.
Husky pre-push: full unit test.
CI is authoritative.

`npm audit` runs separately in CI; high/critical severity blocks merge. See `security-frontend-baseline`.

---

## Triage Map

| Failure | Cause | Fix |
|---|---|---|
| ESLint `no-explicit-any` | Bad type | Narrow / `unknown` + guard → `typescript-vue-conventions` |
| ESLint `vue/no-v-html` | Raw `v-html` | Use `v-safe-html` (DS) → `security-frontend-baseline` |
| Prettier diff | Unformatted | `npm run format` |
| `vue-tsc` template error | Macro / prop typing | Move types to `<name>.types.ts` → `typescript-vue-conventions` |
| Vitest snapshot mismatch | Component output changed | Update intentionally OR fix regression |
| Vitest "Cannot read undefined" | Missing mock | Add MSW handler → `api-mock-strategy-msw` |
| `npm run build` "missing env" | Runtime config not wired | → `runtime-config-static-spa` |
| Build chunk over budget | Heavy dep in route | Dynamic import → `optimize-rendering` |
| Playwright flaky | Race on data setup | Page Object + deterministic seed → `e2e-playwright-critical-flows` |
| i18n missing key warning | Untracked key | Add to all locales → `i18n-nuxt-translation-usage` |
| Orval generated drift | OpenAPI changed | Regenerate → `orval-openapi-codegen` |

---

## Anti-Patterns

| ❌ | Why |
|---|---|
| `--no-verify` to bypass hooks | Hides real failures |
| Disabling failing tests | Masks regression |
| Ignoring Prettier diff | CI will fail |
| Committing without typecheck | Deferred pain |
| Running build only in CI | Slow feedback loop |
| Snapshot updates without inspection | Silent breakage |
| Allowing flaky E2E without quarantine | Erodes trust |
| Ignoring i18n missing-key warnings | Runtime errors in prod |

---

## Cross-Links

`design-ux-direction` · `analyze-feature-architecture` · `structure-components` · `typescript-vue-conventions` · `style-tailwind` · `enforce-a11y` · `primevue-component-usage` · `i18n-nuxt-translation-usage` · `tanstack-query-patterns` · `tanstack-query-error-handling` · `api-mock-strategy-msw` · `nuxt-orval-runtime` · `orval-openapi-codegen` · `runtime-config-static-spa` · `nuxt4-spa-conventions` · `vue-composable-testing-patterns` · `e2e-playwright-critical-flows` · `review-vue-code-quality` · `optimize-rendering` · `security-frontend-baseline` · `beetween-eslint-prettier-shared-config`
