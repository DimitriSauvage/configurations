# BtStatusPipeline

**Package:** `@beetween/design-system-ui`
**Import:** `import { BtStatusPipeline } from '@beetween/design-system-ui'`
**Source:** `src/components/bt-status-pipeline/`

## Overview

Horizontal pipeline visualization showing sequential steps with item counts and status badges. Displays a linear flow (e.g., application → interview → offer → hired) with each step's badge showing the count of items in that stage. Purely presentational; no calculations. Supports toggling step label visibility.

## TypeScript Interfaces

```typescript
export interface BtStatusPipelineStatusConfig {
  label: string;
  color: string;
}

export interface BtStatusPipelinePipelineStep {
  key: string;
  label: string;
  color: string;
  count: number;
}

export type BtStatusPipelineProps = BaseComponentProps & {
  statuses?: BtStatusPipelineStatusConfig[];
  pipeline?: BtStatusPipelinePipelineStep[];
  showLabels?: boolean;
};
```

## Props

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `statuses` | `BtStatusPipelineStatusConfig[]` | `[]` | No | Optional status badge definitions (used for legend or additional UI). |
| `pipeline` | `BtStatusPipelinePipelineStep[]` | `[]` | No | Array of pipeline steps in order. Each step shows `label`, `count`, and `color`. |
| `showLabels` | `boolean` | `true` | No | Whether to display step labels below the pipeline. |

## Data Structures

### BtStatusPipelinePipelineStep

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Unique step identifier. |
| `label` | `string` | Step display name (e.g., `"Applied"`, `"Interview"`, `"Offer"`). Only shown if `showLabels` is `true`. |
| `color` | `string` | CSS color for the step badge (e.g., `"#3b82f6"`, `"rgb(59, 130, 246)"`, `"var(--beetween-primary)"`). |
| `count` | `number` | Number of items in this step (displayed in the badge). |

### BtStatusPipelineStatusConfig

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Status display label (e.g., `"Rejected"`, `"Accepted"`). |
| `color` | `string` | CSS color for status legend (e.g., `"#ef4444"`, `"#10b981"`). |

## Usage Example

```vue
<script setup lang="ts">
import { BtStatusPipeline } from '@beetween/design-system-ui';

const pipeline = [
  { key: 'applied', label: 'Applied', color: '#3b82f6', count: 145 },
  { key: 'screening', label: 'Screening', color: '#8b5cf6', count: 87 },
  { key: 'interview', label: 'Interview', color: '#ec4899', count: 42 },
  { key: 'offer', label: 'Offer', color: '#10b981', count: 12 },
  { key: 'hired', label: 'Hired', color: '#06b6d4', count: 8 },
];

const statuses = [
  { label: 'Rejected', color: '#ef4444' },
  { label: 'Accepted', color: '#10b981' },
];
</script>

<template>
  <!-- With labels -->
  <BtStatusPipeline
    :pipeline="pipeline"
    :statuses="statuses"
    :show-labels="true"
  />

  <!-- Without labels -->
  <BtStatusPipeline
    :pipeline="pipeline"
    :show-labels="false"
  />
</template>
```

## Notes & Constraints

- **Linear flow:** Steps render left-to-right in array order. No reordering or branching.
- **Color customization:** Each step's badge color is independent. Use CSS values (hex, rgb, or custom properties).
- **Count display:** Raw numeric count rendered in each badge. Format large numbers (e.g., `145` → `"145"`) in consuming app before passing.
- **Arrow connectors:** Auto-rendered between steps. No customization of arrow appearance.
- **Responsive:** On very narrow viewports, labels may wrap or truncate. Use `showLabels: false` for mobile-first designs.
- **a11y:** Pipeline is a semantic `<ol>` with each step as `<li>`. Badge is announced with its count.

