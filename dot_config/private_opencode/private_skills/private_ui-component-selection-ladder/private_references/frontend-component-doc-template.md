# ComponentName

**Package:** `@beetween/design-system-ui`
**Import:** `import { ComponentName } from '@beetween/design-system-ui'`
**Source:** `src/components/component-name/`

## Overview

<!-- What it does, when to use it, key constraints -->

## TypeScript Interfaces

```typescript
import type { BaseComponentProps } from '@beetween/design-system-ui';

export interface ComponentNameProps extends BaseComponentProps {
  // props
}
```

## Props

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `prop` | `type` | `default` | No | Description |

## Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `event-name` | `type` | Description |

## Slots

| Name | Required | Description |
|------|----------|-------------|
| `default` | Yes | Description |

## Exposed (if any)

| Name | Type | Description |
|------|------|-------------|
| `method` | `() => void` | Description |

## Usage Example

```vue
<script setup lang="ts">
import { ComponentName } from '@beetween/design-system-ui';
</script>

<template>
  <ComponentName>
    <!-- slot content -->
  </ComponentName>
</template>
```

## Notes & Constraints

- <!-- edge cases, limitations -->
- No business logic, no `onMounted`, no data fetching (layout/UI components only)
- No `<style>` blocks — Tailwind v4 utility classes only
