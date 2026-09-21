# useIsTouched

**Package:** `@beetween/design-system-ui`
**Import:** `import { useIsTouched } from '@beetween/design-system-ui'`
**Source:** `src/composables/use-is-touched/use-is-touched.ts`

## Overview

Tracks whether a field has been focused and then blurred (touched) by the user. Useful for validation that should only trigger after user interaction — show errors only after the user has left the field, not on initial render.

## TypeScript Interfaces

```typescript
export interface UseIsTouchedOptions {
  /**
   * Initial touched state
   * @default false
   */
  initialState?: boolean;
}

export interface UseIsTouchedReturn {
  /**
   * Whether the field has been touched (focused and blurred)
   */
  isTouched: Ref<boolean>;
  /**
   * Mark the field as touched
   */
  touch: () => void;
  /**
   * Reset the touched state to false
   */
  reset: () => void;
}
```

## Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `initialState` | `boolean` | `false` | Initial touched state |

## Return

| Property | Type | Description |
|----------|------|-------------|
| `isTouched` | `Ref<boolean>` | Whether the field has been touched |
| `touch()` | `() => void` | Mark the field as touched (call on blur) |
| `reset()` | `() => void` | Reset touched state to `false` |

## Usage Example

```vue
<script setup lang="ts">
import { useIsTouched } from '@beetween/design-system-ui';

const { isTouched, touch, reset } = useIsTouched();

const onBlur = () => {
  touch();
};
</script>

<template>
  <div>
    <input type="email" required @blur="onBlur" />
    <p v-if="isTouched && !valid">This field has been touched and is invalid</p>
    <button @click="reset">Reset</button>
  </div>
</template>
```

## Notes & Constraints

- Pairs naturally with `useIsDirty` for full form interaction tracking
- `isTouched` is a plain `Ref` (not computed) — set it manually via `touch()` on blur events
- Does NOT auto-detect blur — you must call `touch()` from your event handler
