# useFormValidation

**Package:** `@beetween/design-system-ui`
**Import:** `import { useFormValidation } from '@beetween/design-system-ui'`
**Source:** `src/composables/use-form-validation/use-form-validation.ts`

## Overview

Wraps the native HTML5 Constraint Validation API for form controls. Centralizes validation logic and exposes native browser validation methods in a reactive Vue composable. Supports optional custom validation functions alongside native validation.

## TypeScript Interfaces

```typescript
export interface UseFormValidationOptions {
  /**
   * Reference to the HTML input element
   */
  inputRef: Ref<HTMLInputElement | null>;
  /**
   * Optional custom validation function
   * @param value - Current value of the input element
   * @returns true if valid, false otherwise
   */
  customValidation?: (value: string | null | undefined) => boolean;
}

export interface UseFormValidationReturn {
  /**
   * Native ValidityState from the input element
   */
  validity: ComputedRef<ValidityState | undefined>;
  /**
   * Whether the input is currently valid
   */
  isValid: ComputedRef<boolean>;
  /**
   * Check if the input is valid without showing validation UI
   * @returns true if valid, false otherwise
   */
  checkValidity: () => boolean;
  /**
   * Check validity and show native browser validation UI if invalid
   * @returns true if valid, false otherwise
   */
  reportValidity: () => boolean;
  /**
   * Set a custom validation message
   * @param message - The validation message (empty string to clear)
   */
  setCustomValidity: (message: string) => void;
}
```

## Options

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `inputRef` | `Ref<HTMLInputElement \| null>` | — | Yes | Template ref to the input element |
| `customValidation` | `(value: string \| null \| undefined) => boolean` | — | No | Optional custom validation logic |

## Return

| Property | Type | Description |
|----------|------|-------------|
| `validity` | `ComputedRef<ValidityState \| undefined>` | Reactive native validity state from the input |
| `isValid` | `ComputedRef<boolean>` | Reactive combined validity (native + custom) |
| `checkValidity()` | `() => boolean` | Checks validity without showing browser UI |
| `reportValidity()` | `() => boolean` | Checks validity and shows native browser validation UI |
| `setCustomValidity(message)` | `(message: string) => void` | Sets a custom validation message (empty clears it) |

## Usage Example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useFormValidation } from '@beetween/design-system-ui';

const inputRef = ref<HTMLInputElement | null>(null);
const { isValid, validity, checkValidity, reportValidity, setCustomValidity } =
  useFormValidation({
    inputRef,
    customValidation: (value) => (value?.length ?? 0) >= 3,
  });

const handleSubmit = () => {
  if (!reportValidity()) return;
  // submit logic
};
</script>

<template>
  <input ref="inputRef" type="text" required minlength="3" />
  <span v-if="!isValid && validity?.tooShort">Minimum 3 characters</span>
  <button @click="handleSubmit">Submit</button>
</template>
```

## Notes & Constraints

- Requires a real `HTMLInputElement` ref — won't work with custom input wrappers that don't expose the native element
- `setCustomValidity` directly maps to the native Constraint Validation API
- Server-side rendering: `validity` and `isValid` will be `undefined` / `true` until the element mounts
