# useFallbackTextColor

**Package:** `@beetween/design-system-ui`
**Import:** `import { useFallbackTextColor } from '@beetween/design-system-ui'`
**Source:** `src/composables/use-fallback-text-color/use-fallback-text-color.ts`

## Overview

Returns a Tailwind text color utility class string appropriate for the current background, or an empty string if a `text-*` class is already present in the component's attrs. Prevents color conflicts when consumers explicitly set a text color.

## Signature

```typescript
useFallbackTextColor(
  attrs: Record<string, unknown>
): { fallbackClass: ComputedRef<string> }
```

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `attrs` | `Record<string, unknown>` | Component attrs object (e.g., `$attrs` or `useAttrs()`) to check for existing `text-*` classes |

## Return

| Property | Type | Description |
|----------|------|-------------|
| `fallbackClass` | `ComputedRef<string>` | The computed fallback text color class, or `''` if a `text-*` class already exists in attrs |

## Usage Example

```vue
<script setup lang="ts">
import { useAttrs } from 'vue';
import { useFallbackTextColor } from '@beetween/design-system-ui';

const attrs = useAttrs();
const { fallbackClass } = useFallbackTextColor(attrs);
</script>

<template>
  <p :class="fallbackClass">This text gets a fallback color unless consumer set one.</p>
</template>
```

## Notes & Constraints

- Inspects the `class` attribute in attrs, not computed/merged classes
- Relies on the presence of any string containing `text-` to detect consumer-provided text color
