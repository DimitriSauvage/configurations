# BtTable

**Package:** `@beetween/design-system-ui`
**Import:** `import { BtTable } from '@beetween/design-system-ui'`
**Source:** `src/components/bt-table/`

## Overview

Generic data table with sort, filter, row selection, pagination, bulk actions, and CSV export. Uses a discriminated union (`BtTableColumnDef`) to define column rendering — each column specifies a `type` (text, badge, date, owner, number, custom) that determines how cells are formatted. Purely presentational; consuming app manages data fetching, sorting, filtering, and API calls. Fully accessible with semantic HTML and ARIA.

## TypeScript Interfaces

```typescript
export type BtTableProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> = BaseComponentProps & {
  value: T[];
  columns: BtTableColumnDef<T>[];
  titleText?: string;
  dataKey?: string;
  loading?: boolean;
  selectable?: boolean;
  exportable?: boolean;
  bulkActions?: BtTableBulkAction[];
  rowsPerPage?: number;
  showPagination?: boolean;
  columnResize?: BtTableColumnResizeConfig;
  stickyHeader?: boolean;
};

export type BtTableEmits<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  rowClick: [row: T];
  bulkAction: [action: string, rows: T[]];
  export: [];
};

export interface BtTableSlots<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  cell: (props: { col: BtTableColumnDefCustom<T>; row: T }) => unknown;
  actions: (props: { row: T }) => unknown;
  empty: () => unknown;
  'toolbar-extra': () => unknown;
}
```

## Props

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `value` | `T[]` | — | **Yes** | Row data array. Each element maps to one visible row. |
| `columns` | `BtTableColumnDef<T>[]` | — | **Yes** | Column definitions. Use discriminated union (set `type` field) to control cell rendering. |
| `titleText` | `string` | — | No | Semantic table title shown in toolbar and used as accessible label. Falls back to i18n `Title` key if omitted. |
| `dataKey` | `string` | `'id'` | No | Unique row identifier field name. Used for row selection and virtual scroll. Must exist on every row. |
| `loading` | `boolean` | `false` | No | When `true`, shows skeleton rows (no data) or spinner overlay (with data). |
| `selectable` | `boolean` | `false` | No | Whether rows can be selected via checkboxes. |
| `exportable` | `boolean` | `false` | No | Whether the export button is shown in the toolbar. |
| `bulkActions` | `BtTableBulkAction[]` | `[]` | No | Bulk action buttons shown in selection bar when rows are selected. |
| `rowsPerPage` | `number` | `10` | No | Number of rows displayed per page. |
| `showPagination` | `boolean` | `true` | No | Whether to show the pagination footer. |
| `columnResize` | `BtTableColumnResizeConfig` | `{ enabled: true, mode: 'fit' }` | No | Column resize configuration. |
| `stickyHeader` | `boolean` | `false` | No | When `true`, keeps table header visible while body scrolls. |

## Column Types (Discriminated Union)

Use `type` field to select rendering strategy:

### 1. Text Column (default)

```typescript
interface BtTableColumnDefText<R> extends BtTableColumnDefBase<R> {
  type?: 'text';
}
```

Renders cell value as plain text. No formatting.

**Example:**
```typescript
{ key: 'name', field: 'candidateName', header: 'Candidate', type: 'text' }
```

### 2. Badge Column

```typescript
interface BtTableColumnDefBadge<R> extends BtTableColumnDefBase<R> {
  type: 'badge';
  badgeConfig: (value: R[keyof R]) => BtTableBadgeConfig;
}
```

Renders cell as a colored badge/chip. `badgeConfig` function maps the raw value to badge appearance.

**Example:**
```typescript
{
  key: 'status',
  field: 'status',
  header: 'Status',
  type: 'badge',
  badgeConfig: (value) => ({
    label: value === 'active' ? 'Active' : 'Inactive',
    bg: value === 'active' ? '#10b981' : '#ef4444',
    color: '#fff',
    border: 'none',
  }),
}
```

### 3. Date Column

```typescript
interface BtTableColumnDefDate<R> extends BtTableColumnDefBase<R> {
  type: 'date';
  dateLocale?: string;
  dateFormatOptions?: Intl.DateTimeFormatOptions;
}
```

Renders cell as a locale-formatted date string. Defaults to active i18next language.

**Example:**
```typescript
{
  key: 'appliedDate',
  field: 'createdAt',
  header: 'Applied',
  type: 'date',
  dateLocale: 'en-US',
  dateFormatOptions: { day: '2-digit', month: '2-digit', year: 'numeric' },
}
```

### 4. Owner Column

```typescript
interface BtTableColumnDefOwner<R> extends BtTableColumnDefBase<R> {
  type: 'owner';
  initials: (row: R) => string;
  color: (row: R) => string;
}
```

Renders a circular avatar + text with initials. `initials` and `color` functions compute values per row.

**Example:**
```typescript
{
  key: 'owner',
  field: 'recruiterId',
  header: 'Assigned To',
  type: 'owner',
  initials: (row) => `${row.recruiterFirstName?.[0]}${row.recruiterLastName?.[0]}`,
  color: (row) => row.recruiterColor || '#3b82f6',
}
```

### 5. Number Column

```typescript
interface BtTableColumnDefNumber<R> extends BtTableColumnDefBase<R> {
  type: 'number';
  numberLocale?: string;
  numberFormatOptions?: Intl.NumberFormatOptions;
}
```

Renders cell as a locale-formatted number. Defaults to active i18next language.

**Example:**
```typescript
{
  key: 'salary',
  field: 'offerSalary',
  header: 'Offer (USD)',
  type: 'number',
  numberLocale: 'en-US',
  numberFormatOptions: { style: 'currency', currency: 'USD', minimumFractionDigits: 0 },
}
```

### 6. Custom Column

```typescript
interface BtTableColumnDefCustom<R> extends BtTableColumnDefBase<R> {
  type: 'custom';
}
```

Renders via the `#cell` slot. Use this when none of the above types match your cell needs.

**Example:**
```typescript
{ key: 'notes', header: 'Notes', type: 'custom' }
```

Then use the slot:
```vue
<template #cell="{ col, row }">
  <div v-if="col.key === 'notes'">{{ row.notes }}</div>
</template>
```

### Base Column Fields (all types)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | — | Unique column ID (used as `:key` and for visibility state). |
| `field` | `keyof R` | — | Record field to read. Omit for custom/slot columns. |
| `header` | `string` | — | Column header text displayed in `<thead>`. |
| `sortable` | `boolean` | `false` | Whether the column can be sorted via header click. |
| `width` | `string` | — | CSS width (e.g., `"120px"`, `"10rem"`). |
| `minWidth` | `string` | — | CSS min-width. |
| `visible` | `boolean` | `true` | Whether the column shows in the toggle panel. |

## Data Structures

### BtTableBadgeConfig

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Badge text displayed in the chip. |
| `bg` | `string` | CSS background color (hex, rgb, or token). |
| `color` | `string` | CSS text color. |
| `border` | `string` | CSS border value (e.g., `'1px solid #hex'`). |

### BtTableBulkAction

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Unique action key emitted on `bulkAction` event. |
| `label` | `string` | Button label. |
| `icon` | `string` | PrimeIcons class (e.g., `'pi-trash'`). |

### BtTableColumnResizeConfig

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Whether columns are resizable via dragging. |
| `mode` | `'fit' \| 'expand'` | Resize behavior: `'fit'` keeps total width constant, `'expand'` grows table. |

## Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `rowClick` | `T` (the row) | Fired when a data row is clicked. App can navigate or open row details. |
| `bulkAction` | `action: string`, `rows: T[]` | Fired when a bulk action button is triggered. `action` is the button key; `rows` are the selected rows. |
| `export` | — | Fired when the export button is clicked. App orchestrates CSV download. |

## Slots

| Name | Scope Props | Description |
|------|-------------|-------------|
| `#cell` | `{ col: BtTableColumnDefCustom<T>, row: T }` | Custom cell content for `type: 'custom'` columns. |
| `#actions` | `{ row: T }` | Action column injected automatically as the last column when this slot is provided. |
| `#empty` | — | Overrides the default empty-state content. |
| `#toolbar-extra` | — | Additional content rendered at the end of the toolbar. |

## Usage Example

```vue
<script setup lang="ts">
import { BtTable } from '@beetween/design-system-ui';
import { ref } from 'vue';

interface Candidate {
  id: string;
  name: string;
  email: string;
  status: 'applied' | 'interview' | 'offer' | 'hired';
  appliedDate: Date;
  recruiterName: string;
  recruiterColor: string;
  salary?: number;
}

const candidates = ref<Candidate[]>([
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    status: 'interview',
    appliedDate: new Date('2026-06-10'),
    recruiterName: 'Bob Smith',
    recruiterColor: '#3b82f6',
    salary: 85000,
  },
  // ...
]);

const columns = [
  { key: 'name', field: 'name', header: 'Candidate', type: 'text' as const },
  {
    key: 'status',
    field: 'status',
    header: 'Status',
    type: 'badge' as const,
    badgeConfig: (value: string) => ({
      label: value.charAt(0).toUpperCase() + value.slice(1),
      bg: value === 'hired' ? '#10b981' : '#3b82f6',
      color: '#fff',
      border: 'none',
    }),
  },
  { key: 'appliedDate', field: 'appliedDate', header: 'Applied', type: 'date' as const },
  {
    key: 'recruiter',
    field: 'recruiterName',
    header: 'Recruiter',
    type: 'owner' as const,
    initials: (row: Candidate) => row.recruiterName.split(' ').map(w => w[0]).join(''),
    color: (row: Candidate) => row.recruiterColor,
  },
];

const handleRowClick = (row: Candidate) => {
  // Open candidate detail modal
  navigateTo(`/candidates/${row.id}`);
};
</script>

<template>
  <BtTable
    :value="candidates"
    :columns="columns"
    title-text="Candidates"
    data-key="id"
    :selectable="true"
    :exportable="true"
    :rows-per-page="20"
    @rowClick="handleRowClick"
  >
    <template #empty>
      <div class="text-center py-8">No candidates found.</div>
    </template>
  </BtTable>
</template>
```

## Notes & Constraints

- **No sorting/filtering:** Table is presentation-only. Consuming app implements sort logic and passes pre-sorted `value` array.
- **Virtual scroll:** Large datasets (1000+) are auto-virtualized. Don't worry about row count performance.
- **Pagination:** Server-side pagination recommended. Emit events and refetch data when page changes.
- **Row identity:** `dataKey` field must exist on every row and be unique. Used for selection state tracking.
- **Column width:** Set `width` or `minWidth` on columns. Auto-fit remaining space if not specified.
- **Accessibility:** Semantic `<table>`, sortable headers as `<button>`, rows as focusable with keyboard navigation.
- **Bulk actions:** Only show selection bar when `selectable: true` and rows are selected. Emits include all selected row objects.

