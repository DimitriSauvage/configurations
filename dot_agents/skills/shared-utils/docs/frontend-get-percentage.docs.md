# getPercentage

**Package:** `@beetween/design-system-ui`
**Import:** `import { getPercentage } from '@beetween/design-system-ui'`
**Source:** `src/shared/utils/percentage/percentage.utils.ts`

## Overview

Returns a clamped percentage value (0–100) from a value and max pair. Handles edge cases: null, undefined, NaN, negative values, values exceeding max. Configurable decimal precision.

## Signature

```typescript
getPercentage(
  value?: Nullable<number | string>,
  max?: Nullable<number | string>,
  fractionDigits?: number
): number
```

## Parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Nullable<number \| string>` | — | Current value |
| `max` | `Nullable<number \| string>` | — | Maximum value (100%) |
| `fractionDigits` | `number` | `0` | Number of decimal places to round to |

## Return

| Type | Description |
|------|-------------|
| `number` | Percentage clamped between 0 and 100 |

## Examples

| Input | Output |
|-------|--------|
| `getPercentage(50, 200)` | `25` |
| `getPercentage(75, 300, 2)` | `25.00` |
| `getPercentage(0, 100)` | `0` |
| `getPercentage(150, 100)` | `100` |
| `getPercentage(-50, 100)` | `0` |
| `getPercentage(undefined, 100)` | `0` |
| `getPercentage(50, undefined)` | `0` |
| `getPercentage(NaN, 100)` | `0` |
| `getPercentage(50, NaN)` | `0` |
| `getPercentage(50, 50)` | `100` |

## Usage Example

```typescript
import { getPercentage } from '@beetween/design-system-ui';

// Simple progress: 50 out of 200 items completed
getPercentage(50, 200);           // 25

// With decimal precision
getPercentage(1, 3, 2);           // 33.33

// Clamping: never below 0 or above 100
getPercentage(-10, 100);          // 0
getPercentage(200, 100);          // 100
```

## Notes & Constraints

- Returns `0` if `value` or `max` is falsy, NaN, or non-numeric
- `max` must be > 0, otherwise returns `0`
- Negative values are clamped to `0`
- Values exceeding `max` are clamped to `100`
- Accepts strings that parse to numbers (e.g., `'50'`)
