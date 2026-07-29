# useViewportConstrainedSize

**Package:** `@beetween/design-system-ui`
**Import:** `import { useViewportConstrainedSize } from '@beetween/design-system-ui'`
**Source:** `src/composables/use-viewport-constrained-size/use-viewport-constrained-size.ts`

## Overview

Computes viewport-constrained dimensions (height, width, offset) for popovers, overlays, dropdowns, and other floating UI elements. Ensures content does not overflow the viewport by dynamically calculating available space relative to a trigger element.

## Signature

```typescript
useViewportConstrainedSize(
  options: UseViewportConstrainedSizeOptions
): UseViewportConstrainedSizeReturn
```

## Usage Example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useViewportConstrainedSize } from '@beetween/design-system-ui';

const triggerRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);

const {
  constrainedHeight,
  constrainedWidth,
  topOffset,
  leftOffset,
} = useViewportConstrainedSize({
  triggerRef,
  overlayRef,
  position: 'bottom',
});
</script>

<template>
  <button ref="triggerRef">Open</button>
  <div
    ref="overlayRef"
    :style="{
      maxHeight: constrainedHeight ? `${constrainedHeight}px` : undefined,
      maxWidth: constrainedWidth ? `${constrainedWidth}px` : undefined,
      top: topOffset ? `${topOffset}px` : undefined,
      left: leftOffset ? `${leftOffset}px` : undefined,
    }"
  >
    Overlay content
  </div>
</template>
```

## Notes & Constraints

- Requires both a trigger element ref and an overlay element ref
- Recalculates on scroll and resize by default
- Used internally by DS overlay components (dropdowns, popovers, modals)
- Refer to the source file for exhaustive options and return types
