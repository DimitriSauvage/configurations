# BtKpiCard

**Package:** `@beetween/design-system-ui`
**Import:** `import { BtKpiCard } from '@beetween/design-system-ui'`
**Source:** `src/components/bt-kpi-card/`

## Overview

Auto-fill tile grid displaying numeric KPI metrics. Each tile shows an icon, label, and numeric value with configurable color. Uses CSS Grid with responsive auto-fit — automatically adjusts column count based on viewport and `minWidth` constraint. Purely presentational; no calculations or state management.

## TypeScript Interfaces

```typescript
export interface BtKpiCardKpiItem {
  value: number;
  label: string;
  icon: string;
  iconColor: string;
}

export type BtKpiCardProps = BaseComponentProps & {
  items: BtKpiCardKpiItem[];
  columns?: number;
};
```

## Props

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `items` | `BtKpiCardKpiItem[]` | — | **Yes** | Array of KPI cards to render. Each has `value`, `label`, `icon`, and `iconColor`. |
| `columns` | `number` | `auto-fit` | No | Fixed number of columns. When omitted, grid uses `auto-fit` with 200px minimum column width. |

## Data Structures

### BtKpiCardKpiItem

| Field | Type | Description |
|-------|------|-------------|
| `value` | `number` | Numeric metric value (e.g., `42`, `1234.56`). No formatting applied by component. |
| `label` | `string` | Human-readable metric name (e.g., `"Open Positions"`, `"Conversion Rate"`). |
| `icon` | `string` | PrimeIcons CSS class (e.g., `"pi-briefcase"`, `"pi-chart-bar"`). |
| `iconColor` | `string` | CSS color value for the icon (e.g., `"#4caf50"`, `"rgb(76, 175, 80)"`, `"var(--beetween-success)"`). |

## Usage Example

```vue
<script setup lang="ts">
import { BtKpiCard } from '@beetween/design-system-ui';

const kpis = [
  { value: 24, label: 'Open Positions', icon: 'pi-briefcase', iconColor: '#3b82f6' },
  { value: 156, label: 'Active Candidates', icon: 'pi-users', iconColor: '#8b5cf6' },
  { value: 42, label: 'Interviews This Week', icon: 'pi-calendar', iconColor: '#ec4899' },
  { value: 8, label: 'Offers Pending', icon: 'pi-check-circle', iconColor: '#10b981' },
];
</script>

<template>
  <!-- Auto-fit: responsive columns based on viewport -->
  <BtKpiCard :items="kpis" />

  <!-- Fixed 2 columns -->
  <BtKpiCard :items="kpis" :columns="2" />
</template>
```

## Notes & Constraints

- **Auto-fit responsiveness:** When `columns` is omitted, grid uses `grid-auto-fit` with 200px min-width. Grid automatically shrinks to 1 column on very narrow viewports.
- **No number formatting:** Raw `value` is rendered as-is. Format large numbers (e.g., `1000` → `"1K"`) in consuming app before passing.
- **Icon color:** Use CSS values (hex, rgb, custom properties). PrimeIcons are uncolored by default — `iconColor` applies via inline style.
- **Tile height:** Tiles auto-size to content. All tiles in a row have equal height via CSS Grid.
- **a11y:** Each tile is a semantic `<article>`. Icon has `aria-hidden="true"` (decorative). Label is visible text.

