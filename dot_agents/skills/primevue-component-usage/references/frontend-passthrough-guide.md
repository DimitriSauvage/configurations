# PrimeVue PassThrough (PT) Guide — Beetween

Use `:pt` only for **structural or per-instance** overrides that the `BeetweenPrimePreset` cannot express via tokens.

---

## When to Use `:pt`

- Layout/class adjustments (e.g., `root: { class: 'w-full justify-start' }`)
- Structural overrides that differ per instance
- **Never** for colors or states — those belong in the preset

---

## Named Constant Pattern (Required)

Always define `:pt` configs as **named constants** in `<script setup>`. This ensures a stable object reference and avoids unnecessary re-renders.

```ts
// ✅ Named constant — stable reference, defined once
const menuButtonPt = {
  root: { class: "w-full justify-start" },
  label: { class: "text-left" },
} as const;
```

```vue
<Button
  :pt="menuButtonPt"
  label="Modifier"
  icon="pi pi-pencil"
  text
  severity="secondary"
/>
```

---

## Inline Anti-Pattern (Forbidden)

Inline object literals create a **new reference on every render cycle**, forcing PrimeVue to re-merge the PassThrough on each render. This causes unnecessary DOM updates and degrades performance, especially in lists.

```vue
<!-- ❌ New object every render — triggers full merge pass each cycle -->
<Button :pt="{ root: { class: 'w-full' } }" label="..." />

<!-- ❌ Same problem in a loop — N new objects per render -->
<Button
  v-for="item in items"
  :key="item.id"
  :pt="{ root: { class: 'justify-start' } }"
  :label="item.label"
/>
```

Fix: extract to a constant outside the loop.

```ts
const listItemPt = {
  root: { class: "justify-start" },
} as const;
```

```vue
<Button
  v-for="item in items"
  :key="item.id"
  :pt="listItemPt"
  :label="item.label"
/>
```

---

## Secondary Button — Border Behavior

The `BeetweenPassThrough` **inverts** the default PrimeVue secondary button behavior:

| State          | Background             | Border      |
| -------------- | ---------------------- | ----------- |
| Default        | Filled light-blue      | No border   |
| Hover / Active | Transparent background | Navy border |

This is applied via CSS variable injection in `BeetweenPassThrough`. **Do not override it manually** with border or background utility classes.

---

## Outlined Buttons — No Border on Hover

All outlined buttons remove their border on hover/active. This is a Beetween UX convention enforced by component-level CSS in the preset.

**Do not** add `border` classes to counteract this behavior — it is intentional.

---

## Rules Summary

1. Keep the preset as the **source of truth** for colors and states
2. Use `:pt` **only** for layout/class structural adjustments
3. **Always** define `:pt` as a named constant — never inline
4. Never override secondary button border or outlined hover behavior manually
