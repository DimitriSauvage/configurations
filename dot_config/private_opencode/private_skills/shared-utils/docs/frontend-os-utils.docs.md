# OS Utils

**Package:** `@beetween/design-system-ui`
**Import:** `import { getPlatform, type Platform } from '@beetween/design-system-ui'`
**Source:** `src/shared/utils/os/`

## Overview

Detects the user's operating system platform from the browser's `navigator.userAgent` and `navigator.maxTouchPoints`. Returns a normalized platform string and provides constants for platform-specific logic.

## `getPlatform`

Returns a simplified platform name.

```typescript
getPlatform(): Platform
```

| Return | Description |
|--------|-------------|
| `Platform` | `'Windows' \| 'MacOS' \| 'Linux' \| 'iOS' \| 'Android' \| 'Other'` |

### Platform Detection Logic

| Detected Platform | Heuristic |
|-------------------|-----------|
| `'Android'` | UserAgent matches `Android` |
| `'Windows'` | UserAgent matches `Windows` or `Win64` |
| `'Linux'` | UserAgent matches `Linux` (not Android) |
| `'iOS'` | UserAgent matches `Mac` AND `maxTouchPoints > 0` (iPad/iPhone detection) |
| `'MacOS'` | UserAgent matches `Mac` (and NOT iOS — no touch points) |
| `'Other'` | No match, or SSR (no `window`) |

## `Platform` Type

```typescript
export type Platform =
  | 'Android'
  | 'iOS'
  | 'Linux'
  | 'MacOS'
  | 'Other'
  | 'Windows';
```

## Constants

```typescript
export const MAC_OS_PLATFORM = 'MacOS';
export const WINDOWS_PLATFORM = 'Windows';
export const LINUX_PLATFORM = 'Linux';
```

## Usage Example

```typescript
import { getPlatform, MAC_OS_PLATFORM } from '@beetween/design-system-ui';

const platform = getPlatform();

if (platform === MAC_OS_PLATFORM) {
  // Show Mac-specific keyboard shortcuts (⌘)
} else if (platform === 'Windows') {
  // Show Windows-specific shortcuts (Ctrl)
}
```

## Notes & Constraints

- SSR-safe: returns `'Other'` when `window` is undefined
- iPadOS 13+ reports as `Mac` with touch points — correctly detected as `'iOS'`
- Not a full UserAgent parser — use `ua-parser-js` if more granularity is needed
