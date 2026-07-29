# BtModulesNav

## Overview

Module launcher popover showing a grid of Beetween app module cards. Wraps PrimeVue `Popover`. Responsive: fullscreen drawer on mobile, 480px floating panel on desktop. Grid layout adapts to 2 columns when the number of modules exceeds `columnsThreshold`.

## TypeScript Interfaces

```typescript
// From bt-modules-nav.types.ts
import type { BadgeVariant } from "@beetween/design-system-ui";

export interface Module {
  key: string;
  name: string;
  desc?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  iconBg?: string;
  icon?: string;
}
```

## Props

| Prop               | Type       | Default     | Description                                                      |
| ------------------ | ---------- | ----------- | ---------------------------------------------------------------- |
| `modules`          | `Module[]` | `[]`        | List of module objects to display in the grid                    |
| `headingText`      | `string`   | `undefined` | Section heading rendered above the module grid                   |
| `manageText`       | `string`   | `undefined` | Label for the "manage modules" link at the bottom of the panel   |
| `columnsThreshold` | `number`   | `3`         | Switch to 2-column grid when `modules.length > columnsThreshold` |
| `closeAriaLabel`   | `string`   | `undefined` | Accessible label for the close button (mobile fullscreen mode)   |

## Emits

None.

## Slots

| Slot          | Scoped Props                        | Description                                 |
| ------------- | ----------------------------------- | ------------------------------------------- |
| `module-item` | `{ module: Module, index: number }` | Override the default rendering of each tile |

## Exposed

| Name     | Type                     | Description                                              |
| -------- | ------------------------ | -------------------------------------------------------- |
| `toggle` | `(event: Event) => void` | Toggle popover open/closed, anchored to the event target |
| `hide`   | `() => void`             | Programmatically close the popover                       |

## Usage Example

```vue
<script setup lang="ts">
import { BtModulesNav } from "@beetween/design-system-ui";
import type { Module } from "@beetween/design-system-ui";

const navRef = ref();

const modules: Module[] = [
  {
    key: "ats",
    name: "ATS",
    desc: "Applicant tracking",
    icon: "pi pi-users",
    iconBg: "#e0f2fe",
  },
  {
    key: "crm",
    name: "CRM",
    desc: "Client management",
    icon: "pi pi-briefcase",
    iconBg: "#fef9c3",
  },
];
</script>

<template>
  <button @click="navRef.toggle($event)">Apps</button>

  <BtModulesNav
    ref="navRef"
    :modules="modules"
    heading-text="Your modules"
    manage-text="Manage"
    close-aria-label="Close app launcher"
  />
</template>
```

## Notes & Constraints

- Trigger the popover by calling `navRef.toggle($event)` from any button — the popover anchors to the event target.
- On mobile (< `md` breakpoint) the panel renders as a fullscreen overlay with its own close button.
- Use the `module-item` slot to inject custom routing (e.g. `<RouterLink>`) per tile instead of the default markup.
- `badge` + `badgeVariant` on a `Module` render a `BtBadge` chip in the tile corner.
