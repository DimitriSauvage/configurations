---
name: ui-component-selection-ladder
description: Decision tree for choosing between DS, PrimeVue, and custom components in Beetween apps. Use before every component implementation to prevent stack fragmentation and duplicated DS work.
---

# UI Component Selection Ladder

**Purpose.** Single authoritative decision tree: "which component do I use?" Every other skill references this. Prevents reinventing primitives, avoids stack fragmentation, keeps DS adoption consistent.

---

## The Ladder (stop at first match)

| Step | Source                            | Use when                                                                                                                                                                                                                                          |
| ---- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `@beetween/design-system-ui` (DS) | DS exports a matching component                                                                                                                                                                                                                   |
| 2    | PrimeVue (bare)                   | PrimeVue has it AND default styling acceptable via DS preset; every element with a PrimeVue equivalent MUST compose the PrimeVue primitive (buttons, inputs, dialogs, cards/surfaces, tags/chips, badges, avatars, dividers) rather than raw HTML |
| 3    | PrimeVue + DS PassThrough         | Need light style overrides via tokens — NEVER override tokens locally                                                                                                                                                                             |
| 4    | App one-off composition           | One-of-a-kind feature UI built from existing primitives                                                                                                                                                                                           |
| 5    | Propose new DS component          | Pattern recurs across 2+ features OR 2+ apps                                                                                                                                                                                                      |

**Vocabulary Test principle:** If PrimeVue ships a primitive whose documented purpose IS this element's role, you must compose it. Bare `<div>`/`<span>` is reserved for layout geometry and inline text.

**Category rulings:**

- Layout container → native `<div>` + Tailwind
- Content surface → `Card` / `Panel`
- Status chip → `Tag`
- Count badge → `Badge` / `OverlayBadge`
- Decorative icon → native `<i>` + PrimeIcons
- Icon in colored container → `Avatar` (square)
- Interactive element → `Button`
- Colored text value → native `<span>` + CSS custom property

**Layout containers rule:** Pure generic layout containers (flex/grid wrappers) for which PrimeVue ships no primitive MAY remain native div + Tailwind.

---

## DS Component Catalog

| Component          | Purpose                                                                                               | Import                                                          | Docs                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------- |
| `BtChatWidget`     | AI chat support widget — floating popover or sidebar panel, controlled via `useAiPanel`               | `import { BtChatWidget } from '@beetween/design-system-ui'`     | [Docs](references/bt-chat-widget.md)     |
| `BtColumnSettings` | Column visibility toggle panel — checkbox list to show/hide table columns, supports `v-model:columns` | `import { BtColumnSettings } from '@beetween/design-system-ui'` | [Docs](references/bt-column-settings.md) |
| `BtKpiCard`        | KPI metrics grid — auto-fill tile grid of numeric KPIs with icon, label, and color config             | `import { BtKpiCard } from '@beetween/design-system-ui'`        | [Docs](references/bt-kpi-card.md)        |
| `BtModulesNav`     | Module launcher popover — grid of Beetween app modules                                                | `import { BtModulesNav } from '@beetween/design-system-ui'`     | [Docs](references/bt-modules-nav.md)     |
| `BtStatusPipeline` | Status pipeline — horizontal pipeline steps with item counts and status badge configs                 | `import { BtStatusPipeline } from '@beetween/design-system-ui'` | [Docs](references/bt-status-pipeline.md) |
| `BtTable`          | Generic data table — sort, filter, row selection, pagination, bulk actions, CSV export                | `import { BtTable } from '@beetween/design-system-ui'`          | [Docs](references/bt-table.md)           |

> When DS ships a new component: add a row here + create `references/<slug>.md` from `references/component-doc-template.md`. Notify DS reviewer (see `design-system-catalog-maintenance` in DS repo).

---

## How to Add a New Component Entry

1. Author `references/<slug>.md` from `references/component-doc-template.md`.
2. Add index row to the catalog table above.
3. Commit on DWT branch + notify DS reviewer.

---

## DS Layout Component Rules

DS layout components are **slot-driven, zero business logic**. They live in `@beetween/design-system-ui`.

### Authoring Rules

- Slot-driven only — no `onMounted`, no data fetching, no `useQuery`
- Import from `@beetween/design-system-ui` public barrel only
- No `<style>` blocks — Tailwind v4 utility classes only
- No i18n `t()` calls — layout components are language-agnostic
- Expose only semantic props (e.g. `tag`) where needed

### Doc Format

Each DS layout component needs `references/<kebab-name>.md` with:
Overview, TypeScript Interfaces, Props, Slots, Usage Example, Notes & Constraints.

---

## PrimeVue Discovery

Full PrimeVue component registry: https://primevue.org/llms/llms.txt

For PassThrough / `pt={}` syntax, tokens, Button severity mapping → see `primevue-component-usage`.

---

## Forbidden

| Forbidden                                                                | Why                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Installing a UI library (Nuxt UI, reka-ui, headlessUI, shadcn-vue, etc.) | Stack fragmentation                                          |
| Building a new modal/dropdown/button from scratch                        | Use DS or PrimeVue                                           |
| Forking DS components into the app                                       | Contribute back instead                                      |
| Overriding DS tokens locally                                             | Token gaps go to DS (`design-system-tokens-source-of-truth`) |
| Hand-rolling icons                                                       | Use DS icon component                                        |
| Business logic in DS layout components                                   | Layout components are pure wrappers                          |
| Wildcard imports from DS                                                 | Breaks tree-shaking                                          |

---

## Visual Customisation Policy

- **Layout + spacing**: Tailwind utility classes OK (cross-link `style-tailwind`).
- **Color + typography**: DS tokens only — `bt-*` token classes, never raw hex codes.
- **PassThrough**: Tailwind utilities only — no inline styles, no `<style>` blocks.

---

## When DS Doesn't Cover It

1. Need solid + reusable? → propose new DS component (cross-repo `scaffold-design-system-component`).
2. One-shot feature UI? → build in app under `app/components/<feature>/` per `structure-components`.
3. Token gap? → request token addition in DS. Do NOT inline custom colors.

---

## Anti-Patterns

| ❌ Anti-pattern                         | Why it matters                             |
| --------------------------------------- | ------------------------------------------ |
| Skipping step 1 (DS check)              | Duplicates work already done in DS         |
| Reaching step 5 too quickly             | One-shot features don't need DS components |
| Installing competing UI libs            | Splits the component model                 |
| Local token overrides                   | Breaks per-tenant theming                  |
| Business logic in DS layout components  | Layout components are pure wrappers        |
| Deprecating DS via app-side replacement | Creates silent divergence                  |
| Forking DS component into app           | Drift — contribute back instead            |

---

## Cross-Links

| Skill / Doc                                         | Purpose                                                   |
| --------------------------------------------------- | --------------------------------------------------------- |
| `primevue-component-usage`                          | PassThrough / pt syntax, Button severity, PrimeVue tokens |
| `structure-components`                              | Component hierarchy, folder conventions                   |
| `style-tailwind`                                    | Tailwind conventions, `bt-*` tokens                       |
| `enforce-a11y`                                      | `useId()`, labelling, ARIA                                |
| `ui-beetween-design-system` (cross-repo)            | DS component source + FormField                           |
| `design-system-tokens-source-of-truth` (cross-repo) | Token addition requests                                   |
| `scaffold-design-system-component` (cross-repo)     | Propose + scaffold new DS components                      |
| `design-system-catalog-maintenance` (cross-repo)    | DS component inventory SOT                                |
| `runtime-preset-color-overrides` (cross-repo)       | Per-tenant preset overrides                               |
