# BtStatusPipeline

## Overview

Horizontal status pipeline visualizer. Renders two rows: a top row of colored status badge pills and a bottom row of colored count bubbles with optional text labels. Use for pipeline funnel views in ATS/CRM dashboards (e.g. sourced → applied → interviewed → hired).

## TypeScript Interfaces

```typescript
// From bt-status-pipeline.types.ts
export interface StatutConfig {
  label: string;
  bg: string; // Background color for the status badge pill
  color: string; // Text/icon color
  border?: string; // Optional border color
}

export interface PipelineStep {
  key: string;
  label: string;
  color: string; // Text color for count bubble + label
  bg: string; // Background color for count bubble
  count: number; // Numeric value displayed in the bubble
}
```

## Props

| Prop         | Type             | Default | Description                                            |
| ------------ | ---------------- | ------- | ------------------------------------------------------ |
| `statuts`    | `StatutConfig[]` | `[]`    | Status badge definitions rendered in the top row       |
| `pipeline`   | `PipelineStep[]` | `[]`    | Pipeline step definitions rendered in the bottom row   |
| `showLabels` | `boolean`        | `true`  | Whether to display text labels below each count bubble |

## Emits

None.

## Slots

None.

## Exposed

None.

## Usage Example

```vue
<script setup lang="ts">
import { BtStatusPipeline } from "@beetween/design-system-ui";
import type { StatutConfig, PipelineStep } from "@beetween/design-system-ui";

const statuts: StatutConfig[] = [
  { label: "New", bg: "#dbeafe", color: "#1d4ed8" },
  { label: "In progress", bg: "#fef9c3", color: "#a16207" },
  { label: "Hired", bg: "#dcfce7", color: "#15803d" },
];

const pipeline: PipelineStep[] = [
  {
    key: "sourced",
    label: "Sourced",
    color: "#1d4ed8",
    bg: "#dbeafe",
    count: 84,
  },
  {
    key: "applied",
    label: "Applied",
    color: "#7c3aed",
    bg: "#ede9fe",
    count: 42,
  },
  {
    key: "interviewed",
    label: "Interviewed",
    color: "#a16207",
    bg: "#fef9c3",
    count: 17,
  },
  { key: "hired", label: "Hired", color: "#15803d", bg: "#dcfce7", count: 5 },
];
</script>

<template>
  <BtStatusPipeline
    :statuts="statuts"
    :pipeline="pipeline"
    :show-labels="true"
  />
</template>
```

## Notes & Constraints

- Purely presentational — no click handlers or selection state.
- `statuts` and `pipeline` are independent arrays; they do not need to share keys.
- Set `:show-labels="false"` for compact layouts (e.g. table rows) where vertical space is limited.
- All color props accept any valid CSS color value (hex, rgb, CSS variable).
