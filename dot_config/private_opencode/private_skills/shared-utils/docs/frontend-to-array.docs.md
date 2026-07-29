# toArray

**Package:** `@beetween/design-system-ui`
**Import:** `import { toArray } from '@beetween/design-system-ui'`
**Source:** `src/shared/utils/arrays.utils.ts`

## Overview

Ensures a value is returned as an array. If the value is `null` or `undefined`, returns an empty array. If already an array, returns it as-is. Otherwise wraps the value in a single-element array.

## Signature

```typescript
toArray<T>(val: Nullable<T | T[]>): T[]
```

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `val` | `Nullable<T \| T[]>` | The value to convert |

## Return

| Type | Description |
|------|-------------|
| `T[]` | Array containing the value, or empty array if null/undefined |

## Behavior

| Input | Output |
|-------|--------|
| `null` | `[]` |
| `undefined` | `[]` |
| `'hello'` | `['hello']` |
| `['a', 'b']` | `['a', 'b']` (unchanged) |
| `''` | `['']` |
| `42` | `[42]` |

## Usage Example

```typescript
import { toArray } from '@beetween/design-system-ui';

toArray(null);          // []
toArray('hello');       // ['hello']
toArray(['a', 'b']);    // ['a', 'b']
toArray('');            // ['']
```

## Notes & Constraints

- Uses `== null` check — catches both `null` and `undefined`
- Does NOT flatten nested arrays
- Type-safe via generics
