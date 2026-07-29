# useUniqueId

**Package:** `@beetween/design-system-ui`
**Import:** `import { useUniqueId } from '@beetween/design-system-ui'`
**Source:** `src/composables/use-unique-id/use-unique-id.ts`

## Overview

Generates a stable UUID v4 string per call. Designed for generating unique IDs for component instances, form fields, ARIA attributes, and other DOM elements that need unique identifiers. Uses the `uuid` package internally.

## Signature

```typescript
useUniqueId(): string
```

## Return

A stable UUID v4 string (e.g., `"f47ac10b-58cc-4372-a567-0e02b2c3d479"`).

## Usage Example

```vue
<script setup lang="ts">
import { useUniqueId } from '@beetween/design-system-ui';

const inputId = useUniqueId();
const errorId = useUniqueId();
</script>

<template>
  <div>
    <label :for="inputId">Name</label>
    <input :id="inputId" :aria-describedby="errorId" type="text" />
    <span :id="errorId" role="alert">Error message</span>
  </div>
</template>
```

## Notes & Constraints

- Not reactive — returns a stable string, does NOT change on re-render
- Each call generates a new unique ID — call once per element/instance
- Suitable for `useId()` pattern replacements in Vue (for ARIA `aria-labelledby`, `id` attributes, etc.)
