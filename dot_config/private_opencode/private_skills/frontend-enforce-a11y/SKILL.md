---
name: enforce-a11y
description: Beetween accessibility (a11y) conventions — useId(), semantic HTML, ARIA, forms, focus, dialogs, WCAG 2.2 AA and RGAA 4.1.2. Use when implementing any interactive component.
---

# Beetween Accessibility Conventions

WCAG 2.2 AA + RGAA 4.1.2 — stricter criterion wins.

## `useId()` — Mandatory

Call `useId()` in every interactive component. Never hand-roll IDs.

```
const id = useId()
// use: :id="`${id}-{purpose}`"
```

| Element | Required |
|---|---|
| Buttons, links, menu triggers, tab items | ✅ |
| Form controls, `Dialog`/`Drawer` roots | ✅ |
| Landmarks, aria-referenced elements | ✅ |

## Semantic HTML First

Correct HTML before ARIA. ARIA supplements, never replaces.

| Landmark | Element |
|---|---|
| Main | `<main id="main-content">` |
| Navigation | `<nav aria-label="...">` |
| Header / Footer | `<header>` / `<footer>` |
| Complementary | `<aside aria-label="...">` |
| Search | `<search>` / `role="search"` |

Exactly one `<main>`. Headers/nav/footer/aside use implicit roles.

## Accessible Names

```
<label :for="`${id}-name`">Full name</label>
<InputText :id="`${id}-name`" v-model="name" />
<Button icon="pi pi-close" :aria-label="t('Action.CloseDialog')" />
<img :src="url" :alt="`${user.name} picture`" />
<img src="/decoration.svg" alt="" aria-hidden="true" />
```

## Dynamic ARIA State

| Attribute | When |
|---|---|
| `aria-expanded` | Collapsible / dropdowns |
| `aria-selected` / `aria-checked` | Tab / list / toggle |
| `aria-disabled` / `aria-busy` | Disabled / loading |
| `aria-live="polite"` / `"assertive"` | Status / errors |
| `aria-hidden="true"` | Decorative / duplicate |

## Forms

Every input MUST have a label (`<label for>` / `aria-labelledby` / `aria-label`). Placeholder is NEVER a label.

```
<label :for="`${id}-email`">Email <span aria-hidden="true">*</span></label>
<InputText :id="`${id}-email`" v-model="email" type="email" required
  :aria-describedby="emailError ? `${id}-email-error` : undefined" :invalid="!!emailError" />
<small v-if="emailError" :id="`${id}-email-error`" role="alert">{{ emailError }}</small>
```

Errors via `aria-describedby`. Required: native `required` or `aria-required="true"`. RGAA 4.1.2: suggest correction format on errors.

## Focus & Skip Link

- Visible focus indicator on every interactive element
- Tab order matches visual (DOM) order
- `:focus-visible` for keyboard-only ring — never `outline: none` without equivalent
- Skip link (RGAA 4.1.2) — first focusable element in every layout

```
.my-button:focus-visible {
  outline: 2px solid var(--p-primary-500);
  outline-offset: 2px;
}
<a href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
         focus:px-4 focus:py-2 focus:bg-primary-900 focus:text-white focus:rounded">
  Skip to main content
</a>
```

## Color & Contrast

| Element | Ratio |
|---|---|
| Body text | ≥ 4.5:1 |
| Large text (≥18px bold / ≥24px) | ≥ 3:1 |
| UI components + focus indicators | ≥ 3:1 |

Verify against DS tokens (`@beetween/design-system-ui`). Never use color alone to convey meaning.

## Keyboard

- Every interactive element reachable + activatable via keyboard
- ESC closes overlays, dialogs, popovers
- Arrow keys for composite widgets (tabs, lists, menus)
- `tabindex` > 0 forbidden

## Dialogs & Modals

- Trap focus on open. Return focus to trigger on close.
- `aria-modal="true"`, `role="dialog"`, labelled via `aria-labelledby`
- PrimeVue `Dialog` handles its own focus trap — do NOT add another

## Live Regions & Reduced Motion

| Scenario | Attribute |
|---|---|
| Status updates | `aria-live="polite"` |
| Errors / timeouts | `aria-live="assertive"` |

```
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

## PrimeVue a11y Specifics

| Component | Detail |
|---|---|
| `RadioButton` / `Checkbox` | Use `:inputId`, not `:id` |
| `Dialog` | Ships own focus trap — no second trap |
| `Button` | `:aria-label` for icon-only |
| `InputText` | `:id` + `<label for>` or `aria-labelledby` |

Set `pt` overrides only when PrimeVue defaults break a11y.

## RGAA 4.1.2 Specifics

- Explicit `lang` on `<html>` (`<html lang="fr">`)
- Breadcrumb on every deep page
- Skip-link as first focusable element
- Error correction suggestions on validation failures
- `<span lang="...">` for language changes in content

## Cross-Reference

- `primevue-component-usage` / `structure-components` / `style-tailwind`
- `design-ux-direction` / `security-frontend-baseline`

## Anti-Patterns

| Anti-pattern | Why |
|---|---|
| `tabindex` > 0 | Breaks DOM tab order |
| `aria-hidden` on focusable | Hidden from AT, still in tab order |
| Click-only handlers | Keyboard cannot activate |
| Color-only state | Invisible to color-blind users |
| Placeholder as label | Fails WCAG 1.3.1 |
| `<div role="button">` | No native keyboard events |
| Omit `alt` on `<img>` | `alt=""` for decorative, never absent |
| Scrim-only close (no ESC) | Keyboard users trapped |

## Do Not

- `<div>`/`<span>` for interactive elements
- Placeholder as only label
- `display:none` on accessible content — use `sr-only`
- Omit `useId()` in interactive components
- Loop index as element `id` part
- Build modals / tooltips from scratch — use PrimeVue
- Omit `id` on form elements
- Remove `alt` — `alt=""` for decorative, never absent
