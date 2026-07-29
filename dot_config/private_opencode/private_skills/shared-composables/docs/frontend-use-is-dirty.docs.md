# useIsDirty

**Package:** `@beetween/design-system-ui`
**Import:** `import { useIsDirty } from '@beetween/design-system-ui'`
**Source:** `src/composables/use-is-dirty/use-is-dirty.ts`

## Overview

Tracks whether a reactive value has been modified at least once compared to its initial state. Useful for form fields where you want to show save buttons or "unsaved changes" warnings only after the user has made edits.

## TypeScript Interfaces

```typescript
export interface UseIsDirtyOptions {
  /**
   * Initial dirty state
   * @default false
   */
  initialState?: boolean;
}

export interface UseIsDirtyReturn {
  /**
   * Whether the value has been modified at least once
   */
  isDirty: Ref<boolean>;
  /**
   * Reset the dirty state to false
   */
  reset: () => void;
}
```

## Signature

```typescript
useIsDirty<T>(
  value: Ref<Nullable<T>>,
  options?: UseIsDirtyOptions
): UseIsDirtyReturn
```

## Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `initialState` | `boolean` | `false` | Initial dirty state |

## Return

| Property | Type | Description |
|----------|------|-------------|
| `isDirty` | `Ref<boolean>` | Whether the value has changed from its initial state |
| `reset()` | `() => void` | Resets `isDirty` back to `false` |

## Usage Example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useIsDirty } from '@beetween/design-system-ui';

const name = ref('');
const { isDirty, reset } = useIsDirty(name);
</script>

<template>
  <input v-model="name" placeholder="Enter name" />
  <p v-if="isDirty">You have unsaved changes</p>
  <button @click="reset">Reset dirty state</button>
</template>
```

## Notes & Constraints

- Watches the value `Ref` — the comparison is `strict equality` (`!==`) against the initial `value.value` captured at call time
- Once dirty, stays dirty unless `reset()` is called (no "clean after save" logic built in)
- Type-generic: works with strings, numbers, objects, etc.
