# DOM Utils

**Package:** `@beetween/design-system-ui`
**Import:** `import { getCssVariableValue, convertRemToPx, getRootFontSizeInPx } from '@beetween/design-system-ui'`
**Source:** `src/shared/utils/dom/`

## Overview

A set of utility functions for working with CSS custom properties and dimension conversions. Useful for dynamic styling calculations, popover positioning, and responsive layout computations.

## `getCssVariableValue`

Reads the value of a CSS custom property from the document root.

```typescript
getCssVariableValue(variableName: string, fallback?: string): string
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `variableName` | `string` | — | CSS variable name (e.g., `--color-primary`) |
| `fallback` | `string` | `''` | Fallback value if variable is not defined |

| Return | Description |
|--------|-------------|
| `string` | The trimmed value of the CSS variable, or `fallback` if not found |

**Example:**
```typescript
getCssVariableValue('--color-primary');        // '#0066cc'
getCssVariableValue('--undefined-var', 'red'); // 'red'
```

## `getRootFontSizeInPx`

Retrieves the root font size of the document in pixels.

```typescript
getRootFontSizeInPx(): number
```

**Example:**
```typescript
getRootFontSizeInPx(); // 16 (typical browser default)
```

## `convertRemToPx`

Converts a rem value to pixels based on the root font size.

```typescript
convertRemToPx(rem: number | string): number
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `rem` | `number \| string` | Rem value (e.g., `1.5` or `'1.5rem'`) |

| Return | Description |
|--------|-------------|
| `number` | Equivalent pixel value |

**Example:**
```typescript
convertRemToPx(1.5);       // 24 (if root font size is 16px)
convertRemToPx('2rem');    // 32
convertRemToPx('0.5rem');  // 8
```

## Notes & Constraints

- `getCssVariableValue` reads from `document.documentElement` — only works in browser environment
- `convertRemToPx` will throw if the rem string is invalid (e.g., `'abc'`)
- All functions are SSR-unsafe — guard with `typeof window !== 'undefined'` when used in SSR context

## `trapFocus`

Traps keyboard focus within a specified DOM element. Useful for accessible modals, dialogs, and panels to prevent focus from escaping the container when navigating via the `Tab` key. Uses `FOCUSABLE_SELECTOR` from `@beetween/shared`.

```typescript
trapFocus(event: KeyboardEvent, container: HTMLElement | null | undefined): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `KeyboardEvent` | The keyboard event (usually from a keydown listener). |
| `container` | `HTMLElement \| null \| undefined` | The HTML element that should contain the focus. |

**Example:**
```typescript
import { trapFocus } from '@beetween/design-system-ui';

const handleKeydown = (event: KeyboardEvent) => {
  trapFocus(event, modalContainerRef.value);
};
```
