---
version: alpha
name: Beetween ATS Design System
description: Design tokens and component guidance for the Beetween ATS design system — a desktop-first, data-dense B2B SaaS recruitment platform for the French public sector. Built on PrimeVue 4 (Aura preset) + Tailwind CSS v4. Token architecture is primitive → semantic → component. The default theme is light; a dark theme is activated via the `.p-dark` class on the document root. When generating code, ALWAYS prefer semantic tokens (e.g. `{colors.primary}`, `{colors.surface-ground}`) over raw primitives or hex so that light/dark switching is automatic.
colors:
  primary-50: '#fafdff'
  primary-100: '#def0fc'
  primary-200: '#9bd1f8'
  primary-300: '#6bbbf5'
  primary-400: '#3ba6f2'
  primary-500: '#108fea'
  primary-600: '#0c72ba'
  primary-700: '#09558b'
  primary-800: '#084673'
  primary-900: '#06375a'
  primary-950: '#04263f'
  neutral-0: '#ffffff'
  neutral-50: '#f6f7f8'
  neutral-100: '#eff1f3'
  neutral-200: '#e8ecf1'
  neutral-300: '#d3d9de'
  neutral-400: '#b8c1c9'
  neutral-500: '#9caab4'
  neutral-600: '#728695'
  neutral-700: '#5a6c7a'
  neutral-800: '#4a5966'
  neutral-900: '#3a4752'
  neutral-950: '#2a343e'
  green-50: '#f9fafb'
  green-100: '#e7f8f7'
  green-200: '#d3f3f0'
  green-300: '#bfedea'
  green-400: '#abe7e3'
  green-500: '#9ce3de'
  green-600: '#88ddd7'
  green-700: '#74d8d1'
  green-800: '#4ecdc4'
  green-900: '#36b4ac'
  green-950: '#2fa29a'
  red-50: '#ffffff'
  red-100: '#fff0f3'
  red-200: '#ffe0e6'
  red-300: '#ffc7d2'
  red-400: '#ffadbd'
  red-500: '#ff94a8'
  red-600: '#ff7a94'
  red-700: '#ff617f'
  red-800: '#ff476a'
  red-900: '#ff2d55'
  red-950: '#cc2444'
  yellow-50: '#ffffff'
  yellow-100: '#fff9f0'
  yellow-200: '#ffefd6'
  yellow-300: '#ffe6bd'
  yellow-400: '#ffdca3'
  yellow-500: '#ffd28a'
  yellow-600: '#ffc971'
  yellow-700: '#f4b855'
  yellow-800: '#e0a640'
  yellow-900: '#cc942b'
  yellow-950: '#b88316'
  primary: '{colors.primary-900}'
  primary-hover: '{colors.primary-700}'
  primary-active: '{colors.primary-800}'
  primary-inverse: '{colors.primary-50}'
  surface: '{colors.neutral-0}'
  surface-ground: '{colors.neutral-100}'
  surface-card: '{colors.primary-50}'
  surface-overlay: '{colors.neutral-0}'
  surface-border: '{colors.neutral-300}'
  surface-disabled: '{colors.neutral-300}'
  on-surface: '{colors.neutral-950}'
  on-surface-muted: '{colors.neutral-700}'
  highlight: '{colors.primary-100}'
  highlight-focus: '{colors.primary-200}'
  highlight-text: '{colors.primary-900}'
  form-field-border: '{colors.neutral-500}'
  form-field-border-hover: '{colors.neutral-600}'
  form-field-icon: '{colors.neutral-500}'
  form-field-invalid-border: '{colors.red-400}'
  success: '{colors.green-800}'
  success-hover: '{colors.green-600}'
  success-active: '{colors.green-700}'
  success-inverse: '{colors.neutral-0}'
  warning: '{colors.yellow-600}'
  warning-hover: '{colors.yellow-400}'
  warning-active: '{colors.yellow-500}'
  warning-inverse: '{colors.neutral-950}'
  danger: '{colors.red-900}'
  danger-hover: '{colors.red-700}'
  danger-active: '{colors.red-800}'
  danger-inverse: '{colors.neutral-0}'
  info: '{colors.primary-500}'
  info-hover: '{colors.primary-300}'
  info-active: '{colors.primary-400}'
  info-inverse: '{colors.neutral-0}'
typography:
  xs:
    fontSize: 0.75rem
    lineHeight: 1rem
  sm:
    fontSize: 0.875rem
    lineHeight: 1.25rem
  base:
    fontSize: 1rem
    lineHeight: 1.5rem
  lg:
    fontSize: 1.125rem
    lineHeight: 1.75rem
  xl:
    fontSize: 1.25rem
    lineHeight: 1.75rem
  2xl:
    fontSize: 1.5rem
    lineHeight: 2rem
  3xl:
    fontSize: 1.875rem
    lineHeight: 2.25rem
  4xl:
    fontSize: 2.25rem
    lineHeight: 2.5rem
  label:
    fontSize: 0.75rem
    lineHeight: 1rem
    fontWeight: 600
    letterSpacing: 0.02em
  xs-bold:
    fontSize: 0.6875rem
    lineHeight: 1rem
    fontWeight: 700
spacing:
  '0': 0rem
  '1': 0.25rem
  '2': 0.5rem
  '3': 0.75rem
  '4': 1rem
  '5': 1.25rem
  '6': 1.5rem
  '8': 2rem
  '10': 2.5rem
  '12': 3rem
  '16': 4rem
  '20': 5rem
  '24': 6rem
rounded:
  none: '0'
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  panel: 16px
  full: 9999px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-inverse}'
    rounded: '{rounded.lg}'
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
  button-primary-active:
    backgroundColor: '{colors.primary-active}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.primary}'
    rounded: '{rounded.lg}'
  button-success:
    backgroundColor: '{colors.success}'
    textColor: '{colors.success-inverse}'
    rounded: '{rounded.lg}'
  button-danger:
    backgroundColor: '{colors.danger}'
    textColor: '{colors.danger-inverse}'
    rounded: '{rounded.lg}'
  button-info:
    backgroundColor: '{colors.info}'
    textColor: '{colors.info-inverse}'
    rounded: '{rounded.lg}'
  button-warn:
    backgroundColor: '{colors.warning}'
    textColor: '{colors.warning-inverse}'
    rounded: '{rounded.lg}'
  button-smart:
    backgroundColor: linear-gradient(to right, {colors.primary-500}, {colors.green-800})
    textColor: '{colors.primary-inverse}'
    rounded: '{rounded.sm}'
  inputtext:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.md}'
  textarea:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.md}'
  select:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.md}'
  card:
    backgroundColor: '{colors.surface-card}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.xl}'
  dialog:
    backgroundColor: '{colors.surface-overlay}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.xl}'
  datatable:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
  checkbox:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.sm}'
---

# Beetween ATS Design System

## Overview

Beetween is a **B2B SaaS Applicant Tracking System (ATS)** built for the French
public sector. The interface is **desktop-first** and **data-dense**: long
candidate lists, multi-column data grids, status pipelines, and KPI dashboards
are the primary surfaces. The visual character is **calm, institutional, and
professional** — it should feel trustworthy and efficient rather than playful,
and it must stay legible when packed with information.

The brand is anchored by an **institutional navy** (`primary`) with a
**teal accent** reserved for AI/assistive features (smart search, the chat
assistant) and a **bright signal red** used only for notifications and
destructive actions. Surfaces are a cool, blue-tinted slate; visual separation
is achieved through **background contrast rather than borders**, and the UI is
deliberately **flat** — elevation is minimal and shadows are never stacked.

Token architecture is layered **primitive → semantic → component**:

- **Primitive** tokens are the raw color ramps (e.g. `primary-900`). They are
  the only place hex values appear.
- **Semantic** tokens map intent to primitives (e.g. `primary`,
  `surface-ground`, `danger`). They are theme-aware.
- **Component** tokens style specific atoms from the semantic layer.

The **default theme is light.** A **dark theme** is enabled by adding the
`.p-dark` class to the document root (`<html>`); the `useColorScheme()`
composable manages `light` / `dark` / `system` and persists the choice. The
`colors-dark` token group documents the dark values for every semantic role.

> **Directive for code generation:** always prefer **semantic** tokens
> (`{colors.primary}`, `{colors.surface-ground}`, `{colors.danger}`) over
> primitives or raw hex. Semantic tokens resolve to the correct light or dark
> value automatically, so semantic-first code is theme-correct by construction.

## Colors

The palette is built from five primitive ramps. Semantic roles below reference
these primitives; **use the semantic roles in code**.

- **Institutional Navy (#06375a):** `primary`. The core brand color — primary
  buttons, key emphasis, active states. Maps to `primary-900`.
- **Teal (#4ecdc4):** the AI / assistive accent (`green-800`). Active chips, the
  "ON" toggle state, the smart-search button, and `success`. Reserved for
  affordances that feel intelligent or confirmatory.
- **AI Blue (#108fea):** `info` (`primary-500`). Topbar avatar, progress bars,
  the sidebar logo, and the active nav item in dark mode.
- **Neutrals (#ffffff → #2a343e):** a cool, blue-tinted slate ramp
  (`neutral-0..950`) for surfaces, borders, and text. Body text is
  `on-surface` (`neutral-950`); muted text is `on-surface-muted`
  (`neutral-700`).
- **Signal Red (#ff2d55):** `danger` (`red-900`). Notifications and destructive
  actions. Note: form-invalid borders use the softer `#ffadbd` (`red-400`) —
  **never** the signal red.
- **Warning Amber (#ffc971):** `warning` (`yellow-600`).

Dark mode keeps the same semantic intent but shifts the primary to a brighter
`primary-400` (#3ba6f2) for contrast on dark surfaces, and uses translucent
`color-mix` highlights. Because the swap is driven by the semantic layer,
component code does not change between themes.

### Design Tokens

See the `colors` (light, default) and `colors-dark` groups in the frontmatter.
Primitive ramps carry hex definitions; semantic roles (`primary`, `surface*`,
`on-surface*`, `success` / `warning` / `danger` / `info`, `highlight*`,
`form-field-*`) reference them and are the intended API for generated code.

## Typography

The system inherits its font family from the host application's CSS (the
Beetween app ships **Inter** as a variable font). Type **sizes** follow the
**Tailwind v4 default scale** with a root of **1rem = 16px**, ranging from
`xs` (0.75rem) to `4xl` (2.25rem), each with its default line height.

Two brand-specific semantic roles sit on top of the scale:

- **`label`** — 0.75rem, weight 600, letter-spacing 0.02em. Used for DataTable
  column headers and small uppercase labels.
- **`xs-bold`** — 0.6875rem, weight 700. Used for pipeline-count bubbles and
  avatar initials. 0.6875rem (11px) is the **absolute minimum** font size.

### Design Tokens

See the `typography` group in the frontmatter (Tailwind default `fontSize` /
`lineHeight` steps plus the `label` and `xs-bold` roles).

## Layout

The product is **desktop-first** and optimized for **dense** data screens. The
canonical shell is a fixed left **sidebar** (≈285px expanded, ≈72px collapsed,
no `border-right`), a sticky top **slim bar** (≈56px, no `border-bottom`), and a
scrollable content region. **Separation between shell regions is done with
background contrast** (`surface` `#ffffff` vs `surface-ground` `#f6f7f8`),
never with borders. Lists use a consistent "table card" container pattern.

Spacing uses the **Tailwind v4 default spacing scale** (base unit 0.25rem = 4px;
e.g. `4` = 1rem, `6` = 1.5rem). Component padding and gaps are composed from
this scale. The fixed shell pixel metrics above are layout constants described
here in prose, not spacing tokens.

### Design Tokens

See the `spacing` group in the frontmatter (Tailwind default scale).

## Elevation & Depth

The interface is intentionally **flat**. Depth is conveyed with restraint and
**shadows are never stacked** — a single subtle shadow is enough for any panel.
Hierarchy comes primarily from background contrast and spacing.

| Level   | Value                                                             |
| ------- | ----------------------------------------------------------------- |
| `none`  | `none`                                                            |
| `sm`    | `0 1px 3px rgba(19,25,39,.06), 0 2px 8px rgba(19,25,39,.04)`      |
| `nav`   | `0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)`    |
| `modal` | `0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)` |

Panels and tab-bar wrappers use `sm`; modals/dialogs use `modal`. Elevation has
no dedicated token group in the schema — these values are applied via CSS.

## Shapes

Corner radius is meaningful and maps to component families:

- **`sm` (4px):** smart/AI button, keyboard (kbd) tags, custom checkboxes, nav
  items.
- **`md` (6px):** form fields (inputs, selects, textareas).
- **`lg` (8px):** standard buttons, SelectButton options, paginator buttons.
- **`xl` (12px):** modals/dialogs and KPI cards.
- **`panel` (16px):** SelectButton tab-bar wrapper and tab bars.
- **`full` (9999px):** tag pills, pipeline bubbles, the toggle switch, avatars.

### Design Tokens

See the `rounded` group in the frontmatter (Aura base `none`/`xs`/`sm`/`md`/`lg`/`xl`,
extended with the Beetween `panel` and `full`).

## Components

Beetween composes its UI from three layers, chosen in this order:

1. **Beetween design-system components** (`@beetween/design-system-ui`, the
   `Bt*` molecules) — first choice when one exists.
2. **Native PrimeVue 4 components** — used directly for everything else, styled
   with the theme tokens via `var(--p-*)` (and `pt` PassThrough + Tailwind when
   local adjustment is needed). The theme re-skins a subset of these atoms (see
   `components` tokens).
3. **Custom** — only when neither of the above fits.

**PrimeVue atom overrides / additions.** The theme re-themes these atoms via the
preset: `button` (severities `primary`, `secondary`, `success`, `danger`,
`info`, `warn`, plus the Beetween-authored **`smart`** gradient severity for AI
actions), `inputtext`, `textarea`, `select`, `card`, `dialog`, `datatable`, and
`checkbox`. The `smart` severity is delivered through a PassThrough that adds the
`smart-gradient` class (a left-to-right `primary-500 → green-800` gradient). All
other PrimeVue v4 components are used as shipped, themed only through
`var(--p-*)`.

**Custom Beetween components (`Bt*`).** These are presentational molecules that
compose PrimeVue atoms and the tokens above. They contain no business logic, no
API calls, and no hardcoded user-facing text (all strings are i18n keys; the
components self-register their MF2 locale bundles on first mount).

- **BtTable** — the primary data grid. Search, row selection, bulk actions,
  column formatting (text / badge / date / owner / number / custom), resizable
  columns, pagination, empty + loading states. Built on PrimeVue `DataTable` +
  `Column`.
- **BtColumnSettings** — a popover editor for column visibility. Built on
  `Popover` + `Checkbox`.
- **BtKpiCard** — a responsive grid of KPI tiles. Built on `Card` + `Avatar`.
  KPI variant colors must come from `var(--p-*)` tokens, never hardcoded hex.
- **BtModulesNav** — a popover app/module launcher with badge variants
  (`primary` / `success` / `warning` / `danger` / `info`). Built on `Popover`,
  `Avatar`, `Button`, `Tag`.
- **BtStatusPipeline** — status chips plus pipeline counts (the small round
  count bubbles). Built on `Tag` + `Badge`; bubble colors via `var(--p-*)`.
- **BtChatWidget** — the floating AI chat assistant shell (FAB + panel,
  streaming messages, prompt suggestions, conversation history). Built on
  `Card`, `Button`, `Avatar`, `Textarea`, `Message`, teleported to the body,
  with a global open/close state via the `useAiPanel` composable.

### Design Tokens

See the `components` group in the frontmatter for the re-themed PrimeVue atoms
and the `smart` button severity. The `Bt*` molecules consume the semantic and
component tokens above rather than defining their own.

## Do's and Don'ts

### Do

- **Do** use the **semantic** tokens (`{colors.primary}`, `{colors.danger}`,
  `{colors.surface-ground}`) in generated code so light/dark resolves
  automatically.
- **Do** reserve `primary` for the single most important action on a screen; use
  `secondary` for lower-emphasis actions.
- **Do** use the **`smart`** button severity (teal→blue gradient) for AI /
  smart-search actions, and the teal accent for active chips and toggles.
- **Do** ensure text meets **WCAG 2.2 AA** contrast (≥ 4.5:1 for body text).
- **Do** drive KPI-card and pipeline-bubble colors through `var(--p-*)` tokens.
- **Do** separate shell regions (sidebar / slim bar) by **background contrast**.
- **Do** use `red-400` (#ffadbd) for invalid form-field borders.

### Don't

- **Don't** hardcode hex values outside the primitive color definitions — use
  semantic tokens.
- **Don't** stack shadows; a single `sm` shadow is enough for panels.
- **Don't** add a `border-right` to the sidebar or a `border-bottom` to the
  slim bar.
- **Don't** use the signal red (`danger` / #ff2d55) for form-invalid borders.
- **Don't** convey meaning with color alone — pair it with an icon or text
  label.
- **Don't** rebuild an atom that PrimeVue already provides; prefer a `Bt*`
  component, then native PrimeVue.

> **Note (focus ring):** this package does not override the Aura default focus
> ring (width 1px, offset 2px, color `{colors.primary}`), so a visible focus
> ring is present by default. The broader Beetween application disables it
> (`--p-form-field-focus-ring-width: 0`); if you adopt that, ensure an
> alternative visible focus affordance remains for accessibility.
