# useState

**Package:** `@beetween/design-system-ui`
**Import:** `import { useState } from '@beetween/design-system-ui'`
**Source:** `src/composables/use-state/use-state.ts`

## Overview

A thin wrapper around `shallowRef` that provides a setter function which handles both direct values and `CustomEvent` objects. Designed for web component interop where state changes may arrive via DOM events.

## TypeScript Interfaces

```typescript
export type UseStateReturn<T> = {
  state: Ref<T>;
  setState: (newValue: CustomEvent<T> | T) => void;
};
```

## Signature

```typescript
useState<T>(initialValue: T): UseStateReturn<T>
```

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `initialValue` | `T` | The initial state value |

## Return

| Property | Type | Description |
|----------|------|-------------|
| `state` | `Ref<T>` | `shallowRef` — the reactive state |
| `setState` | `(newValue: CustomEvent<T> \| T) => void` | Setter that handles both CustomEvent and direct values |

## Usage Example

```vue
<script setup lang="ts">
import { useState } from '@beetween/design-system-ui';

const { state, setState } = useState('initial');

const handleChange = (event: Event) => {
  // Works with CustomEvent from web components
  setState(event as CustomEvent<string>);
};

// Or direct value
const reset = () => setState('initial');
</script>

<template>
  <p>{{ state }}</p>
  <button @click="reset">Reset</button>
</template>
```

With complex objects:
```typescript
interface UserState {
  name: string;
  preferences: { theme: string };
}

const { state, setState } = useState<UserState>({
  name: 'Alice',
  preferences: { theme: 'dark' },
});

setState({
  name: 'Bob',
  preferences: { theme: 'light' },
});
```

## Notes & Constraints

- Uses `shallowRef` internally — mutations to nested properties of objects will NOT trigger reactivity. Always replace the entire object.
- `setState` uses `getValueFromCustomEventOrValue` internally to unwrap `CustomEvent.detail`
- Not related to React's `useState` — this is a Vue composable
