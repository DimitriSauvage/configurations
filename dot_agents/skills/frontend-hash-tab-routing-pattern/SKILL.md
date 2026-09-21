---
name: hash-tab-routing-pattern
description: Deep-link tabs within a page via URL hash. Hash-based, not query-param or sub-route. SPA-safe, no router reload.
---

# Hash Tab Routing Pattern

## Purpose

Deep-link tabs inside a single page via URL hash (`#tab-name`). Hash changes do NOT trigger route reload — ideal for tabbed views in Nuxt 4 CSR SPA with file-based routing.

- Hash-based: NOT query param (`?tab=foo`), NOT sub-route (`/profile/security`).
- Back button works for full-route navigation; hash history stays clean via `router.replace`.

---

## When to Use

| Scenario | Hash tab? |
|---|---|
| Tabbed view inside one page (profile sections, settings panels) | YES |
| Tab change should be sharable URL | YES |
| Tab represents a separate logical resource | NO — use sub-route |
| Tab change triggers heavy data fetch | NO — sub-route or paginated query |
| Modal/dialog state | NO — local state |

---

## Canonical Composable

`app/composables/use-hash-tab.ts`

```ts
export function useHashTab<T extends string>(tabs: readonly T[], defaultTab: T) {
  const route = useRoute()
  const router = useRouter()
  const current = computed<T>({
    get: () => {
      const h = route.hash.replace(/^#/, '') as T
      return (tabs as readonly string[]).includes(h) ? h : defaultTab
    },
    set: (t) => router.replace({ hash: `#${t}` }),
  })
  return { current, tabs }
}
```

- Missing/invalid hash → falls back to `defaultTab`.
- `router.replace` on set — back button does NOT accumulate hash entries.

---

## Tab Definition

Literal `const` + derived union. See `typescript-vue-conventions`.

```ts
const PROFILE_TABS = ['general', 'security', 'preferences'] as const
type ProfileTab = typeof PROFILE_TABS[number]
```

---

## PrimeVue Tabs Binding

```vue
<script setup lang="ts">
import ProfileGeneralPanel from './profile-general-panel/profile-general-panel.vue'
import ProfileSecurityPanel from './profile-security-panel/profile-security-panel.vue'

const PROFILE_TABS = ['general', 'security', 'preferences'] as const
type ProfileTab = typeof PROFILE_TABS[number]

const { current } = useHashTab(PROFILE_TABS, 'general')
</script>

<template>
  <Tabs v-model:value="current">
    <TabList>
      <Tab value="general">General</Tab>
      <Tab value="security">Security</Tab>
      <Tab value="preferences">Preferences</Tab>
    </TabList>
    <TabPanels>
      <TabPanel value="general"><ProfileGeneralPanel /></TabPanel>
      <TabPanel value="security"><ProfileSecurityPanel /></TabPanel>
      <TabPanel value="preferences">…</TabPanel>
    </TabPanels>
  </Tabs>
</template>
```

Tabs render in declarative order. Wrap `<TabPanel>` content in `<KeepAlive>` only if local state must survive tab switch.

---

## A11y

PrimeVue Tabs provides `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` — no extra ARIA needed. Rules:

- Heading inside each tab panel → `<h2>`.
- Keyboard arrow keys move focus between tabs (PrimeVue default).
- See `enforce-a11y` for landmark + labelling conventions.

---

## Hash + History

- Always `router.replace` (not `router.push`) on tab switch — avoids polluting history with hash entries.
- Back button still navigates to the previous full route correctly.
- On initial render: invalid or missing hash resolves to `defaultTab` via the `computed` getter.

---

## SSR Caveat

SPA-only (Nuxt 4 CSR). `route.hash` is always `''` during SSR phase — `useHashTab` returns `defaultTab` server-side. Safe because this pattern is CSR-only; do not read `route.hash` in server-side lifecycle hooks.

---

## Anti-Patterns

| Pattern | Why wrong |
|---|---|
| Per-tab sub-routes for transient view sections | Reload overhead; wrong abstraction level |
| Query-param tabs (`?tab=foo`) | Collides with filter params; pollutes query string |
| `window.location.hash` reads | Bypasses Vue Router reactivity — use `useRoute().hash` |
| Not validating hash against allow-list | XSS surface; always check against known `tabs` array |
| `router.push` for tab switch | Creates back-button hash chains |
| Fetching data on tab switch without cache key | Waterfalls on every switch — use TanStack Query keyed by tab |

---

## Cross-Links

- `nuxt4-spa-conventions` — CSR setup, file-based routing rules
- `primevue-component-usage` — Tabs component, PassThrough, preset
- `enforce-a11y` — ARIA, landmarks, keyboard nav, WCAG 2.2
- `typescript-vue-conventions` — literal const, derived union, strict typing
- `tanstack-query-patterns` — keyed queries for tab-scoped data fetching
