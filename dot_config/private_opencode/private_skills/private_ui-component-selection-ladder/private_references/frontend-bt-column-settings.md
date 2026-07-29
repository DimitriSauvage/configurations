# BtColumnSettings

**Package:** `@beetween/design-system-ui`
**Import:** `import { BtColumnSettings } from '@beetween/design-system-ui'`
**Source:** `src/components/bt-column-settings/`

## Overview

Column visibility toggle panel. Renders a checklist of columns with show/hide checkboxes. Typically embedded in a data table toolbar to let users customize which columns are visible. Stateless layout component — does not persist visibility state. Consuming app manages persistence via `v-model:columns` or event binding.

## TypeScript Interfaces

```typescript
export interface BtColumnSettingsColumnToggle {
  key: string;
  label: string;
  visible: boolean;
}

export type BtColumnSettingsProps = BaseComponentProps & {
  titleText?: string;
};
```

## Props

| Name        | Type     | Default | Required | Description                                                                              |
| ----------- | -------- | ------- | -------- | ---------------------------------------------------------------------------------------- |
| `titleText` | `string` | —       | No       | Title text displayed at the top of the panel. Falls back to i18n `Title` key if omitted. |

## Model (v-model)

| Name      | Type                             | Default | Description                                                                                                                                   |
| --------- | -------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `columns` | `BtColumnSettingsColumnToggle[]` | `[]`    | Used via `v-model:columns`. Array of column definitions. Each entry has `key` (unique ID), `label` (displayed text), and `visible` (boolean). |

## Slots

| Name             | Scoped Props             | Description                                                                                        |
| ---------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| `trigger`        | `{ toggle: () => void }` | Custom trigger button (default: gear icon button). Slot receives `toggle` to open/close the panel. |
| `before-options` | —                        | Content rendered above the checkbox list.                                                          |
| `after-options`  | —                        | Content rendered below the checkbox list.                                                          |

## Exposed

| Name     | Type         | Description                               |
| -------- | ------------ | ----------------------------------------- |
| `toggle` | `() => void` | Programmatically toggle panel visibility. |
| `hide`   | `() => void` | Programmatically close the panel.         |

## Data Structures

### BtColumnSettingsColumnToggle

| Field     | Type      | Description                                                                           |
| --------- | --------- | ------------------------------------------------------------------------------------- |
| `key`     | `string`  | Unique column identifier (matches column keys in table). Used as `:key` in iteration. |
| `label`   | `string`  | Human-readable column name displayed next to the checkbox.                            |
| `visible` | `boolean` | Current visibility state. `true` = shown, `false` = hidden.                           |

## Usage Example

```vue
<script setup lang="ts">
import { BtColumnSettings } from "@beetween/design-system-ui";
import { ref } from "vue";

const visibleColumns = ref([
  { key: "name", label: "Candidate Name", visible: true },
  { key: "email", label: "Email", visible: true },
  { key: "phone", label: "Phone", visible: false },
  { key: "appliedDate", label: "Applied Date", visible: true },
]);
</script>

<template>
  <BtColumnSettings
    v-model:columns="visibleColumns"
    title-text="Show/Hide Columns"
  />
</template>
```

## Notes & Constraints

- **Stateless:** Component does not persist visibility changes. Consuming app listens for toggle events and updates the array.
- **Accessibility:** Uses semantic `<input type="checkbox">` + `<label>` pairs. Screen reader announces each column with state.
- **No sorting:** Column order is determined by array order. Use array mutation or v-for reordering if UI needs to support drag-reorder.
- **All-show / all-hide:** No built-in "show all" / "hide all" buttons — add in consuming app if needed.
- **i18n:** Title text is MF2-formatted. Fallback i18n key: `BtColumnSettings.Title`.
