---
name: primevue-component-usage
description: PrimeVue 4 PassThrough/pt syntax, Beetween token usage, DS integration rules, and 11 ⭐ component patterns. Use when configuring PrimeVue props or overriding styles. For component selection order, use ui-component-selection-ladder first.
---

# PrimeVue — Component Usage

`BeetweenPrimePreset` (Aura-extended) + `BeetweenPassThrough` configured in `nuxt.config.ts`. Components render with brand tokens automatically.

---

## Component Selection Ladder

See `ui-component-selection-ladder` for the canonical priority order (DS → PrimeVue → custom). Never skip rungs.

---

## Beetween Critical Tokens

| Token                                 | Value     | Usage                   |
| ------------------------------------- | --------- | ----------------------- |
| `--p-primary-color`                   | `#06375a` | Primary color           |
| `--p-primary-hover-color`             | `#09558b` | Primary hover           |
| `--p-text-color`                      | `#5a6c7a` | Body text               |
| `--p-text-muted-color`                | `#9caab4` | Muted / placeholder     |
| `--p-surface-50`                      | `#f6f7f8` | App background          |
| `--p-content-background`              | `#ffffff` | Content surface         |
| `--p-content-border-color`            | `#e8ecf1` | Borders                 |
| `--p-form-field-border-color`         | `#e5e5e5` | Input border            |
| `--p-form-field-focus-border-color`   | `#06375a` | Input focus             |
| `--p-form-field-focus-ring-width`     | `0`       | **Focus ring DISABLED** |
| `--p-form-field-invalid-border-color` | `#ffadbd` | Error                   |
| `--p-border-radius-md`                | `6px`     | Form fields             |
| `--p-border-radius-lg`                | `8px`     | Buttons                 |
| `--p-overlay-modal-border-radius`     | `12px`    | Modals                  |

Full token reference + color palette: `../design-ux-direction/references/DESIGN.md`

---

## 11 ⭐ Beetween Components

Visual specs in `../design-ux-direction/references/DESIGN.md` (YAML `components:` section).

| Component                         | Key Beetween Pattern                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Button** `/button/`             | Primary via `:pt` `#06375a` — **never** `severity="primary"`. IA teal via `.btn-ia` class              |
| **SelectButton** `/selectbutton/` | **Default for all tabs** — always with `.btw-panel-tabbar` wrapper (16px radius + shadow)              |
| **Tag** `/tag/`                   | 5 variants: chip teal `#d3f3f0` · status badge `#cae7fb` · kbd shortcut · statut dot · pipeline bubble |
| **IconField** `/iconfield/`       | Header search: dual InputIcon + `top:45%` fix + Ctrl+K Tag                                             |
| **Toolbar/SlimBar** `/toolbar/`   | 56px sticky, **no border-bottom**, `.btn-ia` + `.notif-dot` + Avatar                                   |
| **Drawer** `/drawer/`             | 3 variants: AppSidebar 285px · Filter Sidebar 265px · Candidate Panel 265px                            |
| **Popover** `/popover/`           | Column settings 240px — custom toggle `#4ECDC4` + custom checkbox `#4ECDC4`                            |
| **ProgressBar** `/progressbar/`   | Jury cards 6px · track `#d0e9f8` · fill `#0F8FEA` · `:show-value="false"`                              |
| **Avatar** `/avatar/`             | 3 variants: bell+dot 32px `#f0f4f8` · initials 28px `#06375a` · topbar 30px `#0F8FEA`                  |
| **Card** `/card/`                 | KPI colors via `var(--p-*)` only — **never hex**. 3 views: list/grid/kanban                            |
| **Paginator** `/paginator/`       | **Never native** — always `.bwc-pagination` custom footer                                              |

---

## Layout Rules

- `aside.sidebar` → **no `border-right`** — separation via background contrast (`#fff` on `#f6f7f8`)
- `header.slimbar` → **no `border-bottom`** — same principle
- All lists use `ats-table-card` pattern

---

## Required Component States

Every interactive component must handle:

`default` · `hover` · `focus` (border `#06375a`, ring none) · `disabled` (opacity 0.5) · `error` (border `#ffadbd`) · `empty` · `loading` (Skeleton)

---

## PassThrough Rules

### When Allowed (only these)

- a11y attribute injection PrimeVue doesn't expose
- Narrow Beetween brand styling not covered by tokens
- Structural fix for known PrimeVue bug

### Forbidden

- Full restyling — use DS tokens + preset overrides
- Behaviour replacement — use PrimeVue props/events
- Slot replacement — use PrimeVue slots

### PT Hygiene

- Define as named `const` — inline objects re-merge every render
- Tailwind utilities only — no inline CSS, no `<style>`
- `as const` for type-safe stable ref

```ts
const menuPt = { root: { class: "w-full justify-start" } } as const;
```

---

## Beetween Preset + Tailwind Cohabitation

- PrimeVue `unstyled: true` (project default) — never override
- DS preset (`BeetweenPrimePreset`) owns component tokens
- Tailwind `bt-*` tokens for app-level layout/spacing
- Never set `unstyled: false`

---

## Locale

```ts
import { useTranslation } from "@beetween/nuxt-translation";
import { usePrimeVueLocale } from "@beetween/design-system-ui";

const { locale } = useTranslation();
usePrimeVueLocale(locale); // drives PrimeVue locale from i18n
```

**Never hand-roll PrimeVue locale strings.**

---

## Theming

Never edit preset object at runtime. Only per-tenant runtime color overrides allowed — see `runtime-preset-color-overrides` (DS repo, cross-repo).

---

## Semantic Tokens — Always Use, Never Primitives

**GOLDEN RULE**: ALWAYS use semantic tokens in PrimeVue components and Tailwind utilities. NEVER use primitive palette colors (`bg-blue-500`, `text-gray-700`). Semantic tokens ensure dark mode auto-flips correctly.

### Available Semantic Token Scales

| Scale        | Range                                     | Usage                            |
| ------------ | ----------------------------------------- | -------------------------------- |
| **Surfaces** | `surface-0` · ... · `surface-950`         | Backgrounds, cards, overlays     |
| **Text**     | `text-color` · `text-muted-color`         | Body text, labels, muted content |
| **Primary**  | `bg-primary` · `text-primary`             | Main actions, highlights         |
| **States**   | `success` · `info` · `warning` · `danger` | Status colors, badges, alerts    |
| **Content**  | `bg-content` · `border-content`           | Form fields, popovers, cards     |

### Pattern — Semantic Everywhere

```vue
<!-- ✅ Correct: all semantic tokens -->
<button
  class="bg-primary hover:bg-primary-hover text-primary-on"
>Primary</button>
<div
  class="bg-surface-50 text-color dark:bg-surface-800 dark:text-surface-0"
>Content</div>
<span class="text-muted-color">Secondary text</span>

<!-- ❌ Wrong: palette colors leak through -->
<button class="bg-blue-600 hover:bg-blue-700">Bad contrast in dark mode</button>
<div class="bg-gray-100 text-gray-900">Invisible in dark mode</div>
```

### Scale Reference — Light vs Dark

Scale tokens (`surface-N`, `primary`, `success`, etc.) invert between modes:

| Token        | Light Mode | Dark Mode | Pair with `dark:`                                 |
| ------------ | ---------- | --------- | ------------------------------------------------- |
| `surface-0`  | `#ffffff`  | `#2a343e` | Yes — use `dark:surface-900` if fixed step needed |
| `surface-50` | `#f6f7f8`  | `#1a1f26` | Yes — use `dark:surface-800`                      |
| `primary`    | `#06375a`  | `#4db8ff` | Handled by preset (no `dark:` needed)             |
| `text-color` | `#5a6c7a`  | `#a8b8ca` | Role token (auto-flips, no `dark:` needed)        |

---

## tailwindcss-primeui Utility Classes

**Rule**: Never use `text-[color:var(--p-XXX)]` — use `text-XXX` directly. These classes are auto dark-aware via the DS preset. Only exception: custom colors not in the preset (e.g. IA teal `#4ECDC4`) can be defined as CSS variables + used via `text-[color:var(--p-ia-teal)]`.

Use `tailwindcss-primeui` classes instead of arbitrary `text-[color:var(--p-*)]` expressions. Examples :

- bg-primary → background: var(--p-primary-color)
- text-muted-color → color: var(--p-text-muted-color)
  Refer to PrimeVue tokens for the full list of available classes.

---

## Button Severity Mapping

| Intent        | Method                                           | Color          | Use Case                      |
| ------------- | ------------------------------------------------ | -------------- | ----------------------------- |
| Primary       | `:pt` `background:'#06375a', borderRadius:'8px'` | Navy           | Créer, Sauvegarder, Soumettre |
| IA / AI       | `:pt` `class:'btn-ia'` + `.btn-ia` CSS           | Teal `#4ECDC4` | "+ Recherche IA" uniquement   |
| Secondary     | `severity="secondary" variant="outlined"`        | Outlined navy  | Modifier, Exporter            |
| Destructive   | `severity="danger" variant="outlined"`           | Outlined red   | Archiver, Supprimer           |
| Informational | `severity="info"`                                | Blue `#108fea` | Info actions                  |
| Caution       | `severity="warn"`                                | Amber          | Warnings                      |

**Rule**: one primary action per zone. Never `severity="primary"` (wrong color). `severity="smart"` removed — use `btn-ia` class.

---

## Badge / Tag Contrast Requirements

**Rule**: All badges, tags, and chips must have a text-to-background contrast ratio ≥ 4.5:1.

FORBIDDEN: `bg-*/50`, `bg-*/100` alpha backgrounds inside any interactive (hover/focus) area — they become invisible.

Preferred patterns:

- High contrast dark: `bg-{color}-600 text-white`
- High contrast light: `bg-{color}-50 text-{color}-900`
- PrimeVue Tag severities with solid fills: 'success', 'info', 'warn', 'danger', 'secondary', 'contrast'

In dark mode: add explicit `dark:bg-{color}-700 dark:text-{color}-100` if semantic tokens don't auto-flip correctly.

Test requirement: badge must be readable on BOTH the default background AND any hover background.

---

## Forms — Labels + Validation

Pair PrimeVue inputs with `FormField` from DS if exists. Otherwise:

```vue
<label :for="nameId">{{ t('field.name') }}</label>
<InputText :id="nameId" v-model="name" :aria-describedby="nameErrorId" />
<p v-if="nameError" :id="nameErrorId" role="alert">{{ nameError }}</p>
```

Use `useId()` for unique element IDs (see `enforce-a11y`).

---

## Server-Side Data

DataTable >100 rows: lazy + paginated. See `optimize-rendering`. Never fetch all rows client-side.

---

## Anti-Patterns

| ❌ Wrong                          | ✅ Correct                                                              |
| --------------------------------- | ----------------------------------------------------------------------- |
| `severity="primary"` on Button    | `:pt="{ root: { style: { background:'#06375a', borderRadius:'8px' }}}"` |
| `severity="smart"`                | `:pt="{ root: { class: 'btn-ia' }}"` + `.btn-ia` scoped CSS             |
| `<Paginator>` native              | `.bwc-pagination` custom footer                                         |
| `border-right` on sidebar         | Background contrast only (`#fff` on `#f6f7f8`)                          |
| `border-bottom` on slimbar        | Background contrast only                                                |
| `<Tabs>` for view filters         | `<SelectButton>` with `.btw-panel-tabbar` wrapper                       |
| `<style>` overrides               | DS tokens + Tailwind `bt-*`                                             |
| `!important`                      | Find correct specificity path                                           |
| Deep selectors (`:deep()`)        | Preset or PT with Tailwind                                              |
| Mutating preset object at runtime | Per-tenant color overrides only                                         |
| `locale="fr-FR"` string           | `usePrimeVueLocale()` from DS                                           |
| Custom modal from divs            | `Dialog`                                                                |
| Custom tooltip                    | `v-tooltip` directive                                                   |
| `<select>` / `<input>` native     | `Select` / `InputText`                                                  |
| Inline `:pt`                      | Named const ref                                                         |
| `<RadioButton :id>`               | `<RadioButton :inputId>`                                                |

---

## Always Use PrimeVue Form Components

**Rule**: NEVER use raw HTML `<textarea>`, `<input>`, `<select>` in DS components or Beetween apps.

Always use: `<Textarea>` (primevue/textarea), `<InputText>` (primevue/inputtext), `<Select>` / `<Dropdown>` (primevue/select).

Reason: raw HTML elements bypass the primevue-theme preset, breaking dark mode and design token consistency automatically.

If something looks white/broken in dark mode, the first thing to check is: is there a raw HTML form element that should be a PrimeVue component?

---

## Cross-Links

| Skill / Doc                                   | Purpose                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `../design-ux-direction/references/DESIGN.md` | Full Beetween design tokens + 11 ⭐ component visual specs (source of truth) |
| https://primevue.org/llms/llms.txt            | All 91 PrimeVue components — canonical reference                             |
| `ui-beetween-design-system` (cross-repo)      | DS components, `FormField`, `usePrimeVueLocale`                              |
| `style-tailwind`                              | Tailwind conventions, `bt-*` tokens                                          |
| `enforce-a11y`                                | `useId()`, labelling, ARIA                                                   |
| `optimize-rendering`                          | DataTable lazy loading, pagination                                           |
| `runtime-preset-color-overrides` (cross-repo) | Per-tenant preset overrides                                                  |
| `tanstack-query-patterns`                     | Server data fetching                                                         |
