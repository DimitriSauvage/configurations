# getValueFromCustomEventOrValue

**Package:** `@beetween/design-system-ui`
**Import:** `import { getValueFromCustomEventOrValue } from '@beetween/design-system-ui'`
**Source:** `src/shared/utils/common.utils.ts`

## Overview

Extracts the value from a `CustomEvent` or returns the value directly. Unwraps CustomEvent's `.detail` by calling `toArray()` on it and taking the first element. Used internally by `useState` and other DS composables that need to handle both event-driven and direct value assignment.

## Signature

```typescript
getValueFromCustomEventOrValue<T>(
  eventOrValue: CustomEvent | T
): T
```

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `eventOrValue` | `CustomEvent \| T` | A CustomEvent (from web component event) or a direct value |

## Return

| Type | Description |
|------|-------------|
| `T` | The unwrapped value from the CustomEvent detail, or the direct value |

## Behavior

| Input | Output |
|-------|--------|
| `CustomEvent` with `detail: 'hello'` | `'hello'` |
| `CustomEvent` with `detail: [42]` | `42` |
| `CustomEvent` with `detail: null` | `undefined` |
| `'direct value'` | `'direct value'` |
| `42` | `42` |
| `{ foo: 'bar' }` | `{ foo: 'bar' }` |

## Usage Example

```typescript
import { getValueFromCustomEventOrValue } from '@beetween/design-system-ui';

// Direct value
getValueFromCustomEventOrValue('hello');    // 'hello'

// CustomEvent
const event = new CustomEvent('change', { detail: 42 });
getValueFromCustomEventOrValue(event);      // 42

// CustomEvent with array detail
const arrayEvent = new CustomEvent('change', { detail: ['a', 'b'] });
getValueFromCustomEventOrValue(arrayEvent); // 'a'
```

## Notes & Constraints

- For CustomEvents with an array `.detail`, returns only the first element via `toArray()[0]`
- If CustomEvent detail is `null` or `undefined`, returns `undefined`
- Type inference tries to resolve `T` from the argument — may need explicit generic for complex cases
