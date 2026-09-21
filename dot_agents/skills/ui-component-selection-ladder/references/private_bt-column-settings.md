# BtColumnSettings

## Overview

Collapsible column visibility toggle panel. Renders a `w-60` panel containing a checkbox row per column. Supports `v-model:columns` for two-way binding. Typically paired with `BtTable` to let users show/hide columns.

## TypeScript Interfaces

```typescript
// From bt-column-settings.types.ts
export interface ColumnToggle {
  key: string;
  label: string;
  visible: boolean;
}
```

## Props

| Prop        | Type     | Default     | Description                                        |
| ----------- | -------- | ----------- | -------------------------------------------------- |
| `titleText` | `string` | `undefined` | Heading displayed at the top of the settings panel |

## Model (v-model)

| Name      | Type             | Default | Description                                                                    |
| --------- | ---------------- | ------- | ------------------------------------------------------------------------------ |
| `columns` | `ColumnToggle[]` | `[]`    | Used via `v-model:columns`. Array of column definitions with visibility state. |

## Slots

| Slot             | Scoped Props | Description                              |
| ---------------- | ------------ | ---------------------------------------- |
| `before-options` | —            | Content injected above the checkbox list |
| `after-options`  | —            | Content injected below the checkbox list |

## Exposed

None.

## Usage Example

```vue
<script setup lang="ts">
import { BtColumnSettings, BtTable } from "@beetween/design-system-ui";
import type { ColumnToggle } from "@beetween/design-system-ui";

const columns = ref<ColumnToggle[]>([
  { key: "name", label: "Name", visible: true },
  { key: "status", label: "Status", visible: true },
  { key: "date", label: "Date", visible: false },
]);
</script>

<template>
  <BtColumnSettings v-model:columns="columns" title-text="Columns" />

  <BtTable
    :value="rows"
    :columns="
      columns
        .filter((c) => c.visible)
        .map((c) => ({ field: c.key, header: c.label }))
    "
  />
</template>
```

## Notes & Constraints

- The component deep-watches the `columns` prop — external mutations propagate into the checkbox state.
- `v-model:columns` is the canonical usage; avoid manual `:columns` + `@update:columns` wiring.
- Panel width is fixed at `w-60` (15rem); wrap in a positioned container if you need custom placement.
- Use `before-options` / `after-options` slots to inject a "select all / deselect all" control.
