# Hover Elevation

**Package:** `@beetween/design-system-ui`
**Import:** `import { applyHoverElevation, HOVER_ELEVATION_CLASS_NAME, HOVER_ELEVATION_CSS } from '@beetween/design-system-ui'`
**Source:** `src/shared/utils/hover-elevation/`

## Overview

Framework-agnostic utility that applies a spring-scale + drop-shadow on hover to any element. Zero dependencies — works with Vue, React, Web Components, or plain HTML/JS. No CSS framework required. The effect scales the element slightly (default 1.03x) and adds a drop shadow on hover.

## API Reference

### `applyHoverElevation`

Injects the hover-elevation stylesheet and adds the hover class to one or more elements at runtime.

```typescript
applyHoverElevation(elements: Element[] | NodeList): () => void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `elements` | `Element[] \| NodeList` | Elements to apply the hover effect to |

| Return | Description |
|--------|-------------|
| `() => void` | Cleanup function (removes the CSS class) |

### `HOVER_ELEVATION_CLASS_NAME`

```typescript
HOVER_ELEVATION_CLASS_NAME: string // 'bwc-hover-elevation'
```

CSS class that triggers the hover-elevation effect when applied to any element.

### `HOVER_ELEVATION_CSS`

```typescript
HOVER_ELEVATION_CSS: string
```

Self-contained CSS for the hover-elevation effect. Can be embedded in any stylesheet or Shadow DOM.

## CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--hover-elevation-scale` | `1.03` | Scale factor on hover |
| `--hover-elevation-duration` | `300ms` | Transition duration |
| `--hover-elevation-easing` | spring cubic-bezier | Timing function |
| `--hover-elevation-shadow` | xl drop shadow | Box shadow on hover |
| `--hover-elevation-z-index` | `10` | Z-index during hover |
| `--hover-elevation-overflow` | `20px` | Maximum bleed space for the scaled element |

## Usage Example

Option A — CSS class (preferred):
```html
<style>
  @import '@beetween/design-system-ui/hover-elevation';
  /* or paste HOVER_ELEVATION_CSS directly */
</style>
<div class="bwc-hover-elevation">Hover me</div>
```

Option B — Programmatic:
```typescript
import { applyHoverElevation } from '@beetween/design-system-ui';

const cleanup = applyHoverElevation(document.querySelectorAll('.my-card'));
// Later: cleanup();
```

Option C — With custom CSS properties:
```html
<div
  class="bwc-hover-elevation"
  style="--hover-elevation-scale: 1.05; --hover-elevation-duration: 200ms;"
>
  Customized hover effect
</div>
```

## Notes & Constraints

- The stylesheet is injected once globally via a `<style>` tag with id `bwc-hover-elevation-styles`
- In Vue, consider using the class-based approach in `<template>` rather than programmatic injection
- The overflow property helps sibling components (e.g., carousels) open enough clip-path room for the scale effect
- Safe to call `applyHoverElevation` multiple times — it will not duplicate the stylesheet
