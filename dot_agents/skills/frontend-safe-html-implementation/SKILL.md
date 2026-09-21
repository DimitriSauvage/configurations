---
name: safe-html-implementation
description: Safe HTML rendering in Beetween Vue 3 apps — useSafeHtml composable, vSafeHtml directive, and sanitizeHtml utility from @beetween/composables. Use when you need to render rich HTML from user or AI content. Never use raw v-html.
---

# safe-html-implementation

Replace every `v-html` with `v-safe-html`. DOMPurify-backed, zero config, re-exported from `@beetween/design-system-ui`.

## Import

```ts
// From the DS umbrella (preferred in app code)
import {
  sanitizeHtml,
  useSafeHtml,
  vSafeHtml,
} from "@beetween/design-system-ui";

// Or directly from the composables package
import { sanitizeHtml, useSafeHtml, vSafeHtml } from "@beetween/composables";
```

## Three usage modes

### 1. Directive — `v-safe-html` (recommended)

```vue
<script setup lang="ts">
import { vSafeHtml } from "@beetween/design-system-ui";
</script>

<template>
  <!-- replaces v-html="rawHtml" -->
  <div v-safe-html="rawHtml" />
</template>
```

Importing `vSafeHtml` auto-maps to `v-safe-html` — Vue 3 directive naming convention. No global registration needed.

### 2. Composable — `useSafeHtml`

```vue
<script setup lang="ts">
import { useSafeHtml } from "@beetween/design-system-ui";

const props = defineProps<{ content: string }>();
const { safeHtml } = useSafeHtml(() => props.content);
</script>

<template>
  <div v-html="safeHtml" />
</template>
```

`safeHtml` is a `ComputedRef<string>` — updates reactively when input changes.

### 3. Pure function — `sanitizeHtml`

```ts
import { sanitizeHtml } from "@beetween/design-system-ui";

// Use when building HTML strings before template assignment
const html = sanitizeHtml(rawContent);
```

## API

| Export              | Signature                                                                | Description                              |
| ------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| `sanitizeHtml`      | `(raw: string) => string`                                                | DOMPurify sanitiser — safe for innerHTML |
| `useSafeHtml`       | `(input: MaybeRefOrGetter<string>) => { safeHtml: ComputedRef<string> }` | Reactive composable                      |
| `vSafeHtml`         | `Directive<HTMLElement, string>`                                         | `v-safe-html` directive                  |
| `UseSafeHtmlReturn` | type                                                                     | `{ safeHtml: ComputedRef<string> }`      |

## What gets stripped

- `<script>`, `<style>`, `<iframe>`, `<object>`, and all other non-whitelisted tags
- `on*` event handlers (`onclick`, `onerror`, etc.)
- `style=` inline styles
- `data:` and `javascript:` URLs
- `data-*` attributes

## What passes through

**Tags:** `p`, `br`, `span`, `div`, `strong`, `em`, `code`, `pre`, `a`, `ul`, `ol`, `li`

**Attributes:** `href`, `target`, `rel`, `class`, `aria-label`, `aria-hidden`, `aria-describedby`, `aria-live`

## Anti-patterns

| ❌ Don't                                       | ✅ Do                                                 |
| ---------------------------------------------- | ----------------------------------------------------- |
| `v-html="rawHtml"`                             | `v-safe-html="rawHtml"`                               |
| `el.innerHTML = raw`                           | `el.innerHTML = sanitizeHtml(raw)`                    |
| `/* eslint-disable vue/no-v-html */`           | Remove the disable + use `v-safe-html`                |
| Sanitise in the parent before passing to child | Pass raw, sanitise in the template with `v-safe-html` |

## DS source

`packages/composables/src/use-safe-html/use-safe-html.ts`

For DS internals (allowed tag list, test coverage, policy changes), see the local `.github/skills/safe-html-implementation/SKILL.md` in the design-system-ui repo.
