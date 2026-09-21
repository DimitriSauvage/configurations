# BtKpiCard

## Overview

KPI metrics grid. Renders an auto-fit CSS grid of metric tiles. Each tile displays a colored icon square, a bold numeric value, and a muted label. Use for dashboard summary sections showing key performance indicators.

## TypeScript Interfaces

```typescript
// From bt-kpi-card.types.ts
export interface KpiItem {
  value: number;
  label: string;
  icon: string; // PrimeIcons class, e.g. 'pi pi-users'
  iconBg: string; // Background color for the icon square, e.g. '#e0f2fe'
  iconColor: string; // Icon color, e.g. '#0369a1'
}
```

## Props

| Prop      | Type        | Default     | Description                                                                    |
| --------- | ----------- | ----------- | ------------------------------------------------------------------------------ |
| `items`   | `KpiItem[]` | —           | **Required.** Array of KPI metric objects to render                            |
| `columns` | `number`    | `undefined` | Fixed column count. Omit for auto-fit (`minmax(200px, 1fr)`) responsive layout |

## Emits

None.

## Slots

None.

## Exposed

None.

## Usage Example

```vue
<script setup lang="ts">
import { BtKpiCard } from "@beetween/design-system-ui";
import type { KpiItem } from "@beetween/design-system-ui";

const kpis: KpiItem[] = [
  {
    value: 142,
    label: "Active candidates",
    icon: "pi pi-users",
    iconBg: "#e0f2fe",
    iconColor: "#0369a1",
  },
  {
    value: 8,
    label: "Open positions",
    icon: "pi pi-briefcase",
    iconBg: "#fef9c3",
    iconColor: "#a16207",
  },
  {
    value: 31,
    label: "Interviews today",
    icon: "pi pi-calendar",
    iconBg: "#dcfce7",
    iconColor: "#15803d",
  },
];
</script>

<template>
  <!-- Auto-fit: fills row, wraps when narrow -->
  <BtKpiCard :items="kpis" />

  <!-- Fixed 3-column grid -->
  <BtKpiCard :items="kpis" :columns="3" />
</template>
```

## Notes & Constraints

- No interactivity — purely presentational.
- `icon` accepts any PrimeIcons class string (`pi pi-*`).
- Omit `columns` for responsive auto-fill; pass it only when a fixed layout is required.
- `iconBg` and `iconColor` accept any valid CSS color value (hex, rgb, CSS variable).
