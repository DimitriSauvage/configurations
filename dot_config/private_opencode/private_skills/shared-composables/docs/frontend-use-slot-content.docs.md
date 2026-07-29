# useSlotContent

**Package:** `@beetween/design-system-ui`
**Import:** `import { useSlotContent } from '@beetween/design-system-ui'`
**Source:** `src/composables/use-slot-content/use-slot-content.ts`

## Overview

Detects whether a slot wrapper has meaningful rendered content. Works with both Shadow DOM slots (web components) and regular Vue slots. Useful for conditionally rendering wrapper elements only when the slot is populated.

## TypeScript Interfaces

```typescript
export interface UseSlotContentReturn {
  /**
   * Computed property that reactively checks if the slot has content
   */
  hasContent: ComputedRef<boolean>;
}
```

## Signature

```typescript
useSlotContent(
  wrapperRef: Ref<HTMLElement | null>
): UseSlotContentReturn
```

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `wrapperRef` | `Ref<HTMLElement \| null>` | Template ref to the wrapper element containing the slot |

## Return

| Property | Type | Description |
|----------|------|-------------|
| `hasContent` | `ComputedRef<boolean>` | Whether the slot has rendered content |

## Usage Example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useSlotContent } from '@beetween/design-system-ui';

const slotWrapperRef = ref<HTMLElement | null>(null);
const { hasContent } = useSlotContent(slotWrapperRef);
</script>

<template>
  <div v-show="hasContent" ref="slotWrapperRef">
    <slot name="mySlot" />
  </div>
</template>
```

## Notes & Constraints

- Works with both `HTMLSlotElement` (Shadow DOM) and regular Vue slot fallback detection
- For web components, checks `slot.assignedNodes()` — returns false if no nodes are assigned
- For regular Vue, checks if the slot element has child elements or text content
- Returns false if the wrapper element is `null` (not yet mounted)
