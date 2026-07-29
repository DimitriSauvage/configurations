
# Analyze Feature Architecture

## Purpose

Run AFTER `design-ux-direction`, BEFORE any implementation. Produces a single architecture decision doc that eliminates ambiguity for the implementer.

**Pipeline:**
```
PRD → design-ux-direction → analyze-feature-architecture → implementation → validate-quality-gates
```

Inputs: PRD/spec + completed UX direction doc.
Outputs: infra checklist, component map, API strategy, state decisions, translation audit, ordered task list.

---

## Infrastructure Checklist

| Item | Decision | Reference |
|---|---|---|
| Auth required? | Yes/No | `iam-oidc-setup` |
| New API endpoints? | List Orval IDs | `orval-openapi-codegen` |
| Existing endpoints sufficient? | Yes/No | `nuxt-orval-runtime` |
| New translation keys? | List paths | `i18n-nuxt-translation-usage` |
| New runtime-config keys? | List keys | `runtime-config-static-spa` |
| New DS component needed? | Propose ticket | `scaffold-design-system-component` (cross-repo) |

Any "Yes" with no existing solution → create a blocking infra task before feature tasks.

---

## Component Classification

Place every new component via the selection ladder (`ui-component-selection-ladder`). Output a file tree:

```
feature/<name>/
  <name>-page.vue              (route entry — thin, imports root)
  components/
    <name>-list/               (route-scoped)
    <name>-filters/            (route-scoped)
  composables/
    use-<feature>.ts
  types.ts
common/<name>-empty/           (promoted only if ≥2 routes reuse it)
```

Route-scoped components → explicit import, never auto-imported. See `structure-components`.

---

## API Strategy Decision

| Backend state | Strategy | Reference |
|---|---|---|
| Endpoints ready + stable | Real endpoints | `tanstack-query-patterns` |
| Endpoints in dev, contract frozen | MSW handlers | `api-mock-strategy-msw` |
| Endpoints unstable / parallel BE work | MSW handlers | `api-mock-strategy-msw` |
| E2E flow | Real backend (test env) | `e2e-playwright-critical-flows` |

Never hand-roll fetch. Always go through Orval-generated hooks. See `nuxt-orval-runtime`.

---

## State Decision Matrix

| State type | Tool |
|---|---|
| Server state | TanStack Query (`useQuery` / `useMutation`) |
| Form state | composable + `reactive` refs |
| URL state (tabs, filters) | route hash/query — `hash-tab-routing-pattern` |
| Cross-route / cross-tab / cross-component | Pinia — last resort only |
| Component-local | `ref` / `reactive` |

Decide per data slice. Document rationale in the deliverable.

---

## Translation Audit

Before coding: list every new i18n key path. Format: `<feature>.<section>.<key>`.

- Do NOT author keys here — defer to `i18n-nuxt-translation-usage`.
- Missing keys = PR blocker.
- Never edit generated `translations.json`.

---

## Ordered Task Decomposition

Produce a numbered list. Execution order:

1. Infra tasks (blocking, if any)
2. Translation tasks
3. API / MSW handler tasks
4. Component + page tasks
5. Tests + `validate-quality-gates`

Each task must include: **acceptance criteria**, **dependencies**, **risk flag** (high/med/low).

---

## Architecture Decision Deliverable Template

```
# <feature> — architecture

## Infrastructure checklist
<!-- table: Item | Decision | Ref -->

## Component map
<!-- file tree -->

## API strategy
<!-- table: Backend state | Strategy | Ref -->

## State decisions
<!-- table: State type | Tool | Rationale -->

## Translation keys
<!-- list: feature.section.key -->

## Ordered tasks
<!-- numbered list with AC + deps + risk -->

## Risks & open questions
<!-- blockers for BE, design, product -->
```

Deliver as ticket comment or markdown file in feature branch before coding starts.

---

## Anti-Patterns

| Pattern | Problem |
|---|---|
| Coding before this doc exists | Rework guaranteed |
| Ad-hoc state library choice per feature | Inconsistent infra |
| Skipping translation audit | Untracked keys block PR |
| Skipping component ladder | Wrong tier, rework |
| Hidden new deps (runtime-config, env vars) | Breaks CI/CD |
| Bypassing Orval for HTTP | Breaks contract, loses type safety |
| Ignoring `validate-quality-gates` | Ships broken build |

---

## Cross-Links

`design-ux-direction` · `structure-components` · `ui-component-selection-ladder` · `tanstack-query-patterns` · `api-mock-strategy-msw` · `nuxt-orval-runtime` · `orval-openapi-codegen` · `i18n-nuxt-translation-usage` · `runtime-config-static-spa` · `iam-oidc-setup` · `hash-tab-routing-pattern` · `validate-quality-gates` · `e2e-playwright-critical-flows`
