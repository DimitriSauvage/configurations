# BtModulesNav

**Package:** `@beetween/design-system-ui`
**Import:** `import { BtModulesNav } from '@beetween/design-system-ui'`
**Source:** `src/components/bt-modules-nav/`

## Overview

Navigation module launcher displayed as a grid of cards. Each card shows an icon, module name, description, and badge. Switches to a two-column layout when the module count exceeds `columnsThreshold`. Emits `moduleSelect` on card click (fallback slot) and `manage` when the footer action is clicked. Typically used in dashboards or module switchers.

## TypeScript Interfaces

```typescript
export interface BtModulesNavModule {
  key: string;
  name: string;
  desc: string;
  badge: string;
  badgeVariant: BadgeVariant;
  iconBg: string;
  icon: string;
}

export type BtModulesNavProps = BaseComponentProps & {
  modules?: BtModulesNavModule[];
  columnsThreshold?: number;
};

export type BtModulesNavEmits = {
  moduleSelect: [module: BtModulesNavModule];
  manage: [];
};
```

## Props

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `modules` | `BtModulesNavModule[]` | `[]` | No | List of module cards to display. |
| `columnsThreshold` | `number` | `3` | No | When module count ≥ this value, switch to 2-column layout. |

## Data Structures

### BtModulesNavModule

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Unique module identifier (used for routing, tracking). |
| `name` | `string` | Module display name. |
| `desc` | `string` | Short description shown under the name. |
| `badge` | `string` | Badge text (e.g., `"3"`, `"New"`, `"Beta"`). |
| `badgeVariant` | `BadgeVariant` | Badge color variant (e.g., `"primary"`, `"success"`, `"warning"`, `"danger"`). |
| `iconBg` | `string` | CSS background value for icon container (gradient or solid color). |
| `icon` | `string` | PrimeIcons CSS class. |

### BadgeVariant

One of: `'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'`

## Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `moduleSelect` | `BtModulesNavModule` | Fired when a module card is clicked in the fallback slot. App navigates or loads that module. |
| `manage` | — | Fired when the footer "Manage Modules" action is clicked. App opens module settings/admin UI. |

## Slots

| Name | Scoped Props | Description |
|------|-------------|-------------|
| `module-item` | `{ module: BtModulesNavModule, index: number }` | Custom card per module. Replaces default card rendering. When provided, `moduleSelect` is not fired automatically — slot content must handle clicks. |

## Exposed

| Name | Type | Description |
|------|------|-------------|
| `toggle` | `() => void` | Toggle popover visibility. |
| `hide` | `() => void` | Close the popover. |

## Usage Example

```vue
<script setup lang="ts">
import { BtModulesNav } from '@beetween/design-system-ui';

const modules = [
  {
    key: 'hiring',
    name: 'Hiring',
    desc: 'Manage job postings and candidates',
    badge: '5',
    badgeVariant: 'primary' as const,
    iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: 'pi-briefcase',
  },
  {
    key: 'onboarding',
    name: 'Onboarding',
    desc: 'Employee onboarding workflows',
    badge: 'New',
    badgeVariant: 'success' as const,
    iconBg: '#10b981',
    icon: 'pi-check-circle',
  },
];

const handleModuleSelect = (module: BtModulesNavModule) => {
  // Navigate to module
  navigateTo(`/modules/${module.key}`);
};

const handleManage = () => {
  // Open module management UI
  openModuleSettings();
};
</script>

<template>
  <BtModulesNav
    :modules="modules"
    :columns-threshold="3"
    @moduleSelect="handleModuleSelect"
    @manage="handleManage"
  />
</template>
```

## Notes & Constraints

- **Grid layout:** Single column by default. At or above `columnsThreshold` modules, switches to 2-column.
- **Icon background:** `iconBg` can be a solid color or gradient. Applied directly to the icon container.
- **Badge color:** `badgeVariant` determines badge appearance. Must be a valid PrimeVue badge variant.
- **Slot fallback:** Default slot can override card rendering entirely. When using default slot, `moduleSelect` and `manage` emits are not fired automatically.
- **a11y:** Each card is a semantic `<button>` in the fallback slot, or custom content in named slot. Badge is `aria-hidden` if it's purely decorative.

