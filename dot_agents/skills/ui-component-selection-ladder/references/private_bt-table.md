# BtTable

## Overview

Generic data table component for Beetween apps. Built on top of PrimeVue DataTable. Features: column sorting, global text filter, row selection (checkbox), pagination, bulk actions, CSV export, column resize, sticky header, badge column type, owner avatar column type, and dynamic slot-based column templates. Fully generic (`T extends object`).

## TypeScript Interfaces

```typescript
// From bt-table.types.ts

export type BtColumnType =
  | "text"
  | "badge"
  | "date"
  | "owner"
  | "number"
  | "custom"
  | "actions";

export interface BtColumnDef<R = unknown> {
  key: string;
  label: string;
  type?: BtColumnType; // Default: 'text'
  sortable?: boolean;
  filterable?: boolean;
  width?: string; // CSS width, e.g. '200px'
  align?: "left" | "center" | "right";
  format?: (value: unknown, row: R) => string; // Custom cell formatter
}

export interface BtBadgeConfig {
  [value: string]: {
    label?: string;
    severity?:
      | "success"
      | "info"
      | "warn"
      | "danger"
      | "secondary"
      | "contrast";
    bg?: string;
    color?: string;
  };
}

export interface BtBulkAction {
  key: string;
  label: string;
  icon?: string;
  severity?: "danger" | "warn" | "info";
}

export interface BtTableCountLabel {
  singular: string; // e.g. 'result'
  plural: string; // e.g. 'results'
}

export interface BtTableShowingLabel {
  showing: string; // e.g. 'Showing'
  of: string; // e.g. 'of'
}

export interface BtColumnResizeConfig {
  enabled: boolean;
  mode?: "fit" | "expand"; // Default: 'fit'
}
```

## Props

| Prop                  | Type                   | Default     | Description                                               |
| --------------------- | ---------------------- | ----------- | --------------------------------------------------------- |
| `value`               | `T[]`                  | —           | **Required.** Row data array                              |
| `columns`             | `BtColumnDef<T>[]`     | —           | **Required.** Column definitions                          |
| `titleText`           | `string`               | `undefined` | Table heading displayed in the toolbar                    |
| `dataKey`             | `string`               | `'id'`      | Unique row identifier field name                          |
| `loading`             | `boolean`              | `false`     | Shows loading skeleton overlay                            |
| `selectable`          | `boolean`              | `true`      | Enable checkbox row selection                             |
| `exportable`          | `boolean`              | `true`      | Show CSV export button in toolbar                         |
| `bulkActions`         | `BtBulkAction[]`       | `[]`        | Actions shown in toolbar when rows are selected           |
| `emptyMessageText`    | `string`               | `undefined` | Primary empty state message                               |
| `emptySubMessageText` | `string`               | `undefined` | Secondary empty state sub-message                         |
| `resultsLabel`        | `BtTableCountLabel`    | `undefined` | Singular/plural labels for the results count              |
| `selectionLabel`      | `BtTableCountLabel`    | `undefined` | Singular/plural labels for the selection count            |
| `showingLabel`        | `BtTableShowingLabel`  | `undefined` | Labels for the "Showing X of Y" pagination info           |
| `rowsPerPage`         | `number`               | `10`        | Default rows per page                                     |
| `showPagination`      | `boolean`              | `true`      | Show pagination controls                                  |
| `columnResize`        | `BtColumnResizeConfig` | `undefined` | Enable user column resizing                               |
| `stickyHeader`        | `boolean`              | `false`     | Fix the header row when scrolling                         |
| `badgeConfig`         | `BtBadgeConfig`        | `undefined` | Badge appearance map for `type: 'badge'` columns          |
| `ownerInitials`       | `(row: T) => string`   | `undefined` | Initials getter for `type: 'owner'` avatar column         |
| `ownerColor`          | `(row: T) => string`   | `undefined` | Background color getter for `type: 'owner'` avatar column |

## Emits

| Event         | Payload                     | Description                                    |
| ------------- | --------------------------- | ---------------------------------------------- |
| `rowClick`    | `row: T`                    | Fires when a non-checkbox table row is clicked |
| `bulk-action` | `action: string, rows: T[]` | Fires when a bulk action button is clicked     |
| `export`      | —                           | Fires when the CSV export button is clicked    |

## Slots

| Slot            | Scoped Props                                           | Description                                         |
| --------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `toolbar-start` | —                                                      | Content injected at the start of the toolbar        |
| `toolbar-end`   | —                                                      | Content injected at the end of the toolbar          |
| `empty`         | —                                                      | Replaces the default empty state                    |
| `col-{key}`     | `{ data: T, value: unknown }`                          | Custom cell template for column with matching key   |
| `header-{key}`  | `{ column: BtColumnDef<T> }`                           | Custom header template for column with matching key |
| `footer`        | `{ visibleCount: number, totalFilteredCount: number }` | Custom footer content                               |

## Exposed

None.

## Usage Example

```vue
<script setup lang="ts">
import { BtTable } from "@beetween/design-system-ui";
import type {
  BtColumnDef,
  BtBulkAction,
  BtBadgeConfig,
} from "@beetween/design-system-ui";

interface Candidate {
  id: number;
  name: string;
  status: string;
  appliedAt: string;
}

const rows = ref<Candidate[]>([
  /* ... */
]);

const columns: BtColumnDef<Candidate>[] = [
  { key: "name", label: "Name", type: "text", sortable: true },
  { key: "status", label: "Status", type: "badge" },
  { key: "appliedAt", label: "Date", type: "date", sortable: true },
];

const badgeConfig: BtBadgeConfig = {
  new: { label: "New", severity: "info" },
  in_progress: { label: "In progress", severity: "warn" },
  hired: { label: "Hired", severity: "success" },
};

const bulkActions: BtBulkAction[] = [
  { key: "archive", label: "Archive", icon: "pi pi-inbox", severity: "warn" },
  { key: "delete", label: "Delete", icon: "pi pi-trash", severity: "danger" },
];

function onBulkAction(action: string, selected: Candidate[]) {
  console.log(action, selected);
}
</script>

<template>
  <BtTable
    :value="rows"
    :columns="columns"
    :badge-config="badgeConfig"
    :bulk-actions="bulkActions"
    title-text="Candidates"
    @row-click="(row) => console.log(row)"
    @bulk-action="onBulkAction"
  >
    <!-- Custom cell for 'name' column -->
    <template #col-name="{ data }">
      <RouterLink :to="`/candidates/${data.id}`">{{ data.name }}</RouterLink>
    </template>
  </BtTable>
</template>
```

## Notes & Constraints

- `dataKey` must match a unique field on `T` — defaults to `'id'`. Missing or duplicate keys break row selection.
- `type: 'badge'` requires `badgeConfig` to be set for labels/colors to render correctly.
- `type: 'owner'` requires both `ownerInitials` and `ownerColor` props.
- `type: 'custom'` activates the `col-{key}` slot — the default cell renders nothing.
- `type: 'actions'` renders an actions menu cell; define actions via the `col-{key}` slot.
- `col-{key}` and `header-{key}` slot names are dynamic — replace `{key}` with the actual column `key` value.
- Bulk actions toolbar is only visible when at least one row is selected.
- `export` event fires but does not trigger a download automatically — implement the CSV logic in the handler.
- Do not nest `BtTable` inside a flex container without a defined width — the internal DataTable needs a bounded parent.
