---
name: style-tailwind
description: Tailwind v4 CSS styling conventions for Beetween — semantic tokens, class composition order, mobile-first responsive design, dark mode, and hard bans. Do NOT use for raw CSS/SCSS.
---

# Beetween Tailwind v4 Conventions

## Foundation — Tailwind v4 + @theme ONLY

Apps consume Tailwind through `@beetween/design-system-ui`.

```css
/* app/assets/css/app.css */
@import "@beetween/design-system-ui/tailwind.css";
@theme {
  /* app-level token overrides only when DS tokens are insufficient */
}
```

- NO `tailwind.config.js` — v4 uses `@theme {}`.
- NO PostCSS plugins — DS shared config handles transformation.
- NO `<style>` blocks of ANY kind (scoped, module, plain) in `.vue`.
- NO SCSS, Sass, Less, Stylus.
- NO CSS modules (`*.module.css`).
- NO standalone `.css` files in apps beyond `app.css`.

---

## Hard Bans

| Pattern                                                   | Rule                              |
| --------------------------------------------------------- | --------------------------------- |
| `<style scoped>` / `<style module>` / `<style>` in `.vue` | ❌ Utilities replace all          |
| SCSS, Sass, Less, Stylus, PostCSS plugins                 | ❌ DS config sufficient           |
| `*.module.css`                                            | ❌ Utility-first replaces modules |
| `tailwind.config.js`                                      | ❌ v4 uses `@theme {}`            |
| `@apply` outside DS package                               | ❌ Stack utilities directly       |
| Inline `style="..."`                                      | ❌ Tailwind expresses everything  |
| Custom Tailwind plugins in apps                           | ❌ DS owns plugin config          |

**Exception:** Inline `:style` is permitted ONLY to set a CSS custom property for runtime data-driven color via `resolveColorToken()`. The actual color is applied through a Tailwind class that consumes the custom property, e.g. `:style="{ '--bt-x-color': resolveColorToken(value) }"` with a class like `bg-[var(--bt-x-color)]`.

---

## Semantic Tokens — No DS Primitives

**GOLDEN RULE**: ALWAYS use semantic tokens. NEVER reference DS primitive colors (`bg-blue-500`, `text-gray-700`). Semantic tokens auto-adapt to light/dark mode.

### Semantic Token Scale (Preferred)

| Category        | Semantic Tokens                                                      | Light Value | Dark Value  |
| --------------- | -------------------------------------------------------------------- | ----------- | ----------- |
| **Surfaces**    | `surface-0` · `surface-50` · ... · `surface-950`                     | Lightest→   | →Darkest    |
| **Text**        | `text-color` · `text-muted-color` · `text-surface-800` (state)       | Auto-flip   | Auto-flip   |
| **Content**     | `bg-content` · `border-content` · `text-content-strong`              | Auto-flip   | Auto-flip   |
| **States**      | `hover:text-surface-800` `dark:hover:text-surface-0`                 | Paired      | Paired      |
| **Interactive** | `bg-primary` · `bg-success` · `bg-danger` · `bg-info` · `bg-warning` | Brand color | Brand color |

### When to Use Each Scale

**Role Tokens** (auto-flip light↔dark):

- `text-color`, `text-muted-color` — body text, labels
- `bg-content`, `border-content` — overlays, cards, form fields
- `text-surface-800`, `text-surface-0` — state pairs (hover, selected)

**Scale Tokens** (fixed palette that inverts):

- `surface-0` through `surface-950` — backgrounds with intentional brightness levels
- `primary`, `success`, `danger`, `info`, `warning` — brand colors, status indicators
- Pair explicitly with `dark:` variant: `bg-surface-50 dark:bg-surface-900`

### Anti-Pattern — Never Do This

| ❌ Primitive / Hardcoded              | ✅ Semantic Token                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `bg-blue-500`                         | `bg-primary`                                                                                     |
| `text-gray-700`                       | `text-color`                                                                                     |
| `hover:bg-sky-50 hover:text-gray-900` | `hover:bg-surface-50 hover:text-surface-800 dark:hover:bg-surface-800 dark:hover:text-surface-0` |
| `border-blue-300`                     | `border-primary`                                                                                 |
| `dark:text-gray-100`                  | `text-muted-color` (role token handles dark mode)                                                |

Token gaps: extend via `@theme` in `app.css`. DS owns canonical tokens — see `design-system-tokens-source-of-truth`.

---

## Class Composition Order

Group utilities: **layout → box → typography → color → state → animation**.

1. **Layout** — `flex`, `grid`, `block`, `hidden`, `relative`
2. **Box** — `w-`, `h-`, `p-`, `m-`, `gap-`, `z-`, `overflow-`
3. **Typography** — `text-`, `font-`, `leading-`, `tracking-`, `text-balance`
4. **Color** — `bg-`, `text-`, `border-`, `shadow-`, `ring-`
5. **State** — `hover:`, `focus-visible:`, `disabled:`, `aria-*:`, `data-*:`
6. **Animation** — `transition-`, `animate-`, `duration-`, `ease-`

Use `clsx` or template ternaries — never string concatenation.

---

## Mobile-First Responsive

Unprefixed = all sizes. Override upward via `sm:`/`md:`/`lg:`/`xl:`/`2xl:`.

| Prefix | Min-width |
| ------ | --------- |
| `sm:`  | 640px     |
| `md:`  | 768px     |
| `lg:`  | 1024px    |
| `xl:`  | 1280px    |
| `2xl:` | 1536px    |

Avoid custom breakpoints unless DS tokens force it.

```vue
<div class="flex flex-col gap-4 md:flex-row md:gap-8">
  <aside class="w-full md:w-64 lg:w-80">...</aside>
  <main class="min-w-0 flex-1">...</main>
</div>
```

### Mobile Full-Screen Overlay Pattern

For overlay/panel components (chat widgets, nav popovers) that should become full-screen on phones, use the DS-shipped composable `useTailwindBreakpoints()` (from `@beetween/composables`, exposes `isSmartphone` (<md) / `isTablet` (md–lg) / `isDesktop` (≥lg)):

```vue
<script setup lang="ts">
import { useTailwindBreakpoints } from "@beetween/composables";
const { isSmartphone, isTablet, isDesktop } = useTailwindBreakpoints();
</script>

<template>
  <div
    :class="{
      'fixed inset-0 h-dvh w-screen': isSmartphone,
      'w-[90vw] max-w-[480px]': isTablet,
      'w-96': isDesktop,
    }"
  >
    <!-- content -->
    <Button v-if="isSmartphone" icon="pi pi-times" @click="close" />
  </div>
</template>
```

**Warning**: avoid fixed `min-w-[480px]` on a popover — it overflows a 375px phone viewport. Use breakpoint-aware widths instead.

---

## Variants — ARIA/Data over JS Classes

Prefer native CSS variants over JS-managed state classes.

| Preferred                      | Avoid                                       |
| ------------------------------ | ------------------------------------------- |
| `aria-selected:bg-brand-solid` | `:class="{ 'bg-brand-solid': isSelected }"` |
| `data-active:ring-2`           | `:class="activeClass"`                      |
| `disabled:opacity-50`          | JS-toggled `opacity-50`                     |

Available: `hover:`, `focus-visible:`, `disabled:`, `aria-*:`, `data-*:`, `group-*:`, `peer-*:`.

---

## Dark Mode

DS preset uses `.p-dark` class on `<html>` for dark mode. Two token classes exist — they behave differently:

### Role Tokens (auto-flip light↔dark)

Role tokens (`text-color`, `text-muted-color`, `border-surface`, `bg-content`, `content-background`, overlay backgrounds) auto-flip between light and dark ONLY if the preset defines corresponding semantic tokens in BOTH `colorScheme.light` AND `colorScheme.dark`. If the preset omits them, they fall back to Aura base values that resolve to light colors even in dark mode (e.g. navy `#2a343e`) — resulting in invisible text or light popovers.

**KEY LEARNING: Overlay Component-CSS Specificity Trap**

PrimeVue component CSS (`.p-popover`, `.p-dialog`, `.p-select`, `.p-menu`) sets overlay backgrounds via component tokens (`--p-overlay-popover-background`, etc.) with HIGHER specificity than Tailwind utilities. Putting `bg-content` on a `.p-popover` element is futile — it gets overridden. Fix: add an `overlay` semantic block to the preset (select/popover/modal, each with `{background, borderColor, color}`) bound to role tokens, in BOTH `colorScheme.light` and `.dark`. Utilities cannot beat component CSS specificity.

### Scale Tokens (fixed palette steps that invert)

Scale tokens (`surface-0` … `surface-950`) are FIXED palette steps that INVERT between modes:

| Mode  | `surface-0` | `surface-50` | `surface-900` | `surface-950` |
| ----- | ----------- | ------------ | ------------- | ------------- |
| Light | `#ffffff`   | `#f6f7f8`    | `#2a343e`     | `#1a1f26`     |
| Dark  | `#2a343e`   | `#1a1f26`    | `#f6f7f8`     | `#ffffff`     |

Because the ramp inverts, identical `{surface.N}` token references resolve correctly per-scheme. A surface used as a mode-adaptive background MUST pair an explicit `dark:` variant (e.g. `bg-surface-0 dark:bg-surface-900`) — OR better, use a role token (`bg-content`) that flips on its own.

### Canonical Fix Pattern

Author DS surfaces against ROLE tokens (`bg-content`, `text-color`, `text-muted-color`, `border-surface`). Ensure the preset defines `text`, `content`, AND `overlay` semantic blocks in both colorSchemes. After the preset fix, role tokens auto-flip DS-wide and per-component `dark:` is rarely needed. Pair `dark:` with SCALE tokens ONLY where a deliberately-fixed step is wanted.

```vue
<!-- ✅ Correct: role token auto-flips -->
<div class="bg-content text-color">...</div>

<!-- ✅ Correct: scale token with explicit dark: -->
<div class="bg-surface-0 dark:bg-surface-900">...</div>

<!-- ❌ Wrong: overlay background via utility (specificity trap) -->
<div class="p-popover bg-content"><!-- gets overridden --></div>
```

---

## Arbitrary Values

❌ **Forbidden** except behind a 1-line `// FIXME: token-gap <issue-link>` comment.

```vue
<!-- ✅ Acceptable with issue link -->
<div class="w-[calc(100%-2rem)]">
  <!-- FIXME: token-gap BTW-XXXX -->
```

No bare `w-[347px]`, `text-[13px]`, `bg-[#123456]` without an issue link.

---

## No Arbitrary Values — Use Built-In Equivalents

**Rule**: Never use `class-[value]` Tailwind arbitrary syntax except for viewport units (vh/dvh/vw), CSS custom property values, and complex multi-value expressions with no built-in equivalent.

Tailwind v4 ships with a dense scale. Check the built-in first:

| Arbitrary               | Tailwind v4 built-in |
| ----------------------- | -------------------- |
| `w-[30px]`              | `w-7.5`              |
| `w-[32px]`              | `w-8`                |
| `h-[34px]`              | `h-8.5`              |
| `w-[36px]` / `h-[36px]` | `w-9` / `h-9`        |
| `w-[60px]` / `h-[60px]` | `w-15` / `h-15`      |
| `h-[7px]` / `w-[7px]`   | `h-1.75` / `w-1.75`  |
| `ml-[2px]` / `w-[2px]`  | `ml-0.5` / `w-0.5`   |
| `translate-y-[1px]`     | `translate-y-px`     |
| `min-w-[20px]`          | `min-w-5`            |
| `min-w-[60px]`          | `min-w-15`           |
| `max-w-[140px]`         | `max-w-35`           |
| `max-w-[280px]`         | `max-w-70`           |
| `max-w-[320px]`         | `max-w-80`           |
| `max-w-[~84%]`          | `max-w-5/6` (83.33%) |
| `w-[220px]`             | `w-55`               |
| `bottom-[80px]`         | `bottom-20`          |
| `rounded-[7-10px]`      | `rounded-lg`         |
| `rounded-[14px]`        | `rounded-xl`         |
| `rounded-[20px]`        | `rounded-2xl`        |
| `text-[0.75rem]`        | `text-xs`            |
| `text-[~11-12px]`       | `text-xs` (12px)     |
| `text-[0.8-0.9rem]`     | `text-sm`            |
| `gap-[5px]`             | `gap-1.25`           |
| `h-[100dvh]`            | `h-dvh`              |

For truly unique layout sizes with no built-in equivalent: extract to `@theme` CSS custom property in the component's `index.css`.

---

## Approximate Named Values

When no exact native equivalent exists, use the nearest named value. Document the delta with a comment ONLY when the visual difference exceeds ~5%.

| Arbitrary                | Nearest Native    | Notes                             |
| ------------------------ | ----------------- | --------------------------------- |
| `leading-[1.5–1.6]`      | `leading-relaxed` | 1.625 — ±0.075 from typical range |
| `tracking-[0.05–0.06em]` | `tracking-wider`  | 0.05em — imperceptible            |
| `text-[11px]`            | `text-xs` (12px)  | 1px diff — imperceptible          |
| `text-[13px]`            | `text-sm` (14px)  | 1px diff — imperceptible          |
| `delay-[180ms]`          | `delay-200`       | 20ms diff — imperceptible         |
| `delay-[360ms]`          | `delay-300`       | 60ms diff — acceptable            |

---

## Duration Scale

Only these values are in the Tailwind v4 default scale — round non-standard values to the nearest:

`75` · `100` · **`150`** · `200` · `300` · `500` · `700` · `1000` ms

❌ `duration-120` → ✅ `duration-150` (30ms diff; imperceptible)

---

## PrimeVue Color Variables

Never `text-[var(--p-*)]`. Always use the `tailwindcss-primeui`-generated semantic class:

| Arbitrary                          | Semantic class     |
| ---------------------------------- | ------------------ |
| `text-[var(--p-text-color)]`       | `text-color`       |
| `text-[var(--p-text-muted-color)]` | `text-muted-color` |
| `bg-[var(--p-surface-0)]`          | `bg-surface-0`     |
| `border-[var(--p-surface-border)]` | `border-surface`   |

The full list of generated classes lives in the `tailwindcss-primeui` package output.

---

## `@theme` Token Patterns

For values with no native TW equivalent, extract to `@theme` — never leave a bare arbitrary value.

### Shadow tokens

```css
@theme {
  --shadow-card: 0 1px 3px rgba(6, 55, 90, 0.05);
}
/* Usage: shadow-card */
```

Prefer TW built-ins (`shadow-sm`, `shadow-md`, `shadow-xl`) when a brand tint is not required.

### Z-index tokens

```css
@theme {
  --z-chat-fab: 140; /* above page, below PrimeVue overlays (1000+) */
}
/* Usage: z-chat-fab */
```

Always add a comment documenting the layering intent. Aspirational: use `calc(var(--p-overlay-z-index) - N)` when PrimeVue exposes overlay z-indices as CSS variables.

### Animation tokens

```css
@theme {
  --animate-typing-dot: bounce 1.2s ease-in-out infinite;
}
/* Usage: animate-typing-dot — reuses TW-shipped bounce @keyframes */
```

Reuses Tailwind-shipped `@keyframes` (`bounce`, `pulse`, `spin`) — no `@keyframes` redefinition needed.

---

## Em-Unit Exception

`gap-[*em]`, `px-[*em]`, `py-[*em]`, `h-[*em]` on inline text/code elements are **intentional** and must NOT be replaced with `rem`/`px` equivalents. Em units scale proportionally with the surrounding font size.

```vue
<code class="gap-[0.2em] px-[0.45em] py-[0.15em] text-xs">
  <!-- ponytail: em unit — scales with font-size; no px equiv -->
```

Mark with `<!-- ponytail: em unit — scales with font-size -->` to signal intentional use.

---

## Utility Plugins

Only plugins bundled by `@beetween/design-system-ui` shared config. Apps DO NOT add their own.

---

## Do Not

| ❌                                        | Why                                   |
| ----------------------------------------- | ------------------------------------- |
| Reference DS primitives (`bg-blue-500`)   | Breaks theming; use semantic aliases  |
| Write `<style>` blocks in `.vue`          | Tailwind utilities cover everything   |
| Use `@apply` in app code                  | DS package-only; apps stack utilities |
| Inline `style="..."`                      | Maintenance debt                      |
| Design desktop-first and override down    | Mobile-first is the convention        |
| Arbitrary values without FIXME comment    | Untracked token gap                   |
| Custom Tailwind plugins in apps           | DS owns plugin configuration          |
| String-concat classes (`class="a " + b`)  | Use `clsx` or ternaries               |
| Override PrimeVue internals with Tailwind | Use `:pt` or DS tokens                |
| Add custom breakpoints without need       | Stick to DS breakpoints               |

---

## CSS Transitions & Animations — Native CSS over Vue `<Transition>`

Prefer always-mounted elements with CSS `transition` over Vue `<Transition>` + `v-if`.

**Why**: `<Transition>` requires JS orchestration (enter/leave hooks, v-if lifecycle). CSS `transition` on always-mounted elements is declarative, zero-JS, and easier to audit.

### Always-Mounted Visibility Pattern

```vue
<div
  class="transition-all"
  :class="
    isOpen
      ? 'opacity-100 translate-y-0 scale-100 duration-200 ease-out'
      : 'pointer-events-none opacity-0 translate-y-4 scale-95 duration-150 ease-in'
  "
  :inert="!isOpen ? '' : undefined"
>
  <!-- content always in DOM -->
</div>
```

- `pointer-events-none` — blocks mouse/touch when hidden
- `:inert="'' : undefined"` — removes from accessibility tree when hidden (`:inert="false"` is NOT the same as removing the attribute — always use `? '' : undefined`)
- Different durations/easings per direction: changing classes reactively applies the NEW transition immediately (200ms ease-out open, 150ms ease-in close)

### Overlay Panel Pattern (e.g. history drawer)

When hidden content should overlay other content (not replace it in flow):

```vue
<div class="relative flex min-h-0 flex-1 overflow-hidden">
  <!-- base content, always shown -->
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">...</div>

  <!-- overlay panel, always mounted -->
  <div
    class="absolute inset-0 flex flex-col bg-content transition-all duration-150"
    :class="showPanel
      ? 'opacity-100 translate-x-0 ease-out'
      : 'pointer-events-none opacity-0 -translate-x-3 ease-in'"
    :inert="!showPanel ? '' : undefined"
  >
    <MyPanel />
  </div>
</div>
```

`bg-content` on the overlay wrapper prevents the base content from showing through.

### DS Animation Tokens

`@beetween/design-system-ui/tailwind.css` ships reusable one-shot keyframe utilities for elements that play an entrance/exit animation (not state-toggle):

| Utility                  | Duration | Easing   | Motion                             |
| ------------------------ | -------- | -------- | ---------------------------------- |
| `animate-slide-up-in`    | 200ms    | ease-out | opacity + translateY(1rem) + scale |
| `animate-slide-up-out`   | 150ms    | ease-in  | reverse of above                   |
| `animate-slide-left-in`  | 150ms    | ease-out | opacity + translateX(-0.75rem)     |
| `animate-slide-left-out` | 150ms    | ease-in  | reverse of above                   |

These are CSS `animation` (one-shot). For state-toggled show/hide, use the `transition-all` pattern above.

### Decision Rule

| Scenario                                  | Use                                               |
| ----------------------------------------- | ------------------------------------------------- |
| Element toggled open/closed, stays in DOM | `transition-all` + class toggle + `inert`         |
| One-shot entrance on mount                | `animate-slide-up-in` / `animate-slide-left-in`   |
| One-shot exit before unmount              | `animate-slide-up-out` / `animate-slide-left-out` |
| Complex JS-orchestrated timing            | Vue `<Transition>` (last resort)                  |

---

- `design-system-tokens-source-of-truth` — DS .github/skills/ token reference
- `primevue-component-usage` — PrimeVue + Tailwind styling boundaries
- `ui-beetween-design-system` — DS package conventions
- `structure-components` — component hierarchy rules
- `enforce-a11y` — accessibility + Tailwind interaction patterns

## Common CSS Conflicts in v4 (SonarLint / IDE warnings)

In Tailwind CSS v4, both `outline-<width>` (e.g. `outline-2`) and `outline-<color>` (e.g. `outline-primary-focus`) as well as the bare `outline` class automatically apply `outline-style: solid`.
When composed together, IDEs and SonarQube will flag a CSS conflict (`cssConflict` - e.g., `'focus-visible:outline' applies the same CSS properties as 'focus-visible:outline-2'`).

**How to resolve outline conflicts:**

- **Avoid bare `outline`** when specifying a width or color. `outline-2 outline-transparent` correctly applies width, style, and color without redundancy. `outline outline-2 outline-transparent` throws a conflict.
- **Do not combine `border` and `border-solid`**. In v4, `border` applies `border-width: 1px` AND `border-style: solid`. Using `border border-solid` will throw a css conflict.
