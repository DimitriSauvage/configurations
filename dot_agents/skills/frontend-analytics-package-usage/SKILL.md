---
name: analytics-package-usage
description: >-
  Consuming @beetween/analytics in Beetween apps (Nuxt 4 SPA, Vue 3). Covers PostHog init pattern, useAnalytics() API, useFeatureFlag() reactive ref, URL restriction helpers, and vendor-neutral architecture rules. Use when adding analytics tracking, feature flags, or configuring PostHog in any Beetween frontend app.
---

# Analytics Package Usage (`@beetween/analytics`)

## Architecture: app owns init, package owns consumption

`@beetween/analytics` is a **vendor-neutral surface** over PostHog. The key contract:

- **App** calls `posthog.init(key, options)` once at startup — the package never does.
- **Package** exposes composables (`useAnalytics`, `useFeatureFlag`) and helpers (`buildAutocaptureUrlAllowlist`, `buildUrlEventGate`) that consume the already-initialised instance.
- **Vendor seam** is `internal/posthog-client.ts` — the only file that imports `posthog-js`. Swapping analytics vendors = rewrite that file only, composable APIs stay.
- `posthog-js` is a **peer dependency** — consuming app must install it; it is not bundled.

All composable methods are **no-ops** when PostHog is not loaded (ad-blocker, SSR, uninitialised). No try/catch needed in consuming code.

## Install

```bash
npm install @beetween/analytics posthog-js
```

## PostHog init — Nuxt 4 SPA (recommended pattern)

Init in a Nuxt plugin. Read the PostHog key from `useRuntimeConfig()` (fed by `public/config.json` via the runtime-config pattern — see `runtime-config-static-spa` skill).

```ts
// plugins/analytics.client.ts
import posthog from "posthog-js";
import {
  buildAutocaptureUrlAllowlist,
  buildUrlEventGate,
} from "@beetween/analytics";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const key = config.public.posthogKey as string | undefined;

  if (!key) return; // analytics disabled in this env

  posthog.init(key, {
    api_host: "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    autocapture: {
      url_allowlist: buildAutocaptureUrlAllowlist({
        domains: ["app.beetween.com"],
        paths: ["/dashboard", "/jobs"],
      }),
    },
    before_send: buildUrlEventGate({
      domains: ["app.beetween.com"],
    }),
  });
});
```

`public/config.json` entry:

```json
{ "posthogKey": "phc_XXXX" }
```

`nuxt.config.ts` runtimeConfig mapping:

```ts
runtimeConfig: {
  public: {
    posthogKey: "";
  }
}
```

## PostHog init — plain Vue 3 (no Nuxt)

```ts
// src/main.ts
import { createApp } from "vue";
import posthog from "posthog-js";
import App from "./App.vue";

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: "https://eu.i.posthog.com",
  person_profiles: "identified_only",
});

createApp(App).mount("#app");
```

## `useAnalytics()` — event tracking

Returns an `AnalyticsApi` object. All methods are safe to call unconditionally; they no-op when analytics is not ready.

```ts
import { useAnalytics } from "@beetween/analytics";

const analytics = useAnalytics();

// Track a product event (snake_case convention)
analytics.track("job_created", { job_type: "permanent", source: "quick_add" });

// Identify user after login
analytics.identify(user.id, { email: user.email, plan: user.plan });

// Set profile properties without an event
analytics.setUserProperties({ organisation_id: org.id });

// Report caught errors
try {
  await submitForm();
} catch (err) {
  analytics.trackError(err, { form: "job_application" });
  throw err;
}

// Clear identity on logout
analytics.reset();

// GDPR consent toggles
analytics.optIn();
analytics.optOut();

// Non-reactive flag read (use useFeatureFlag for reactive)
if (analytics.isEnabled("new-dashboard")) {
  /* … */
}

// Guard before performing analytics-dependent work
if (!analytics.isReady()) return;
```

### Full `AnalyticsApi` reference

| Method              | Signature                                                   | Purpose                       |
| ------------------- | ----------------------------------------------------------- | ----------------------------- |
| `track`             | `(event: string, props?: AnalyticsProperties) => void`      | Capture product event         |
| `identify`          | `(distinctId: string, props?: AnalyticsProperties) => void` | Associate session with user   |
| `setUserProperties` | `(props: AnalyticsProperties) => void`                      | Set profile properties        |
| `trackError`        | `(error: unknown, props?: AnalyticsProperties) => void`     | Report caught exception       |
| `reset`             | `() => void`                                                | Clear identity (logout)       |
| `optIn`             | `() => void`                                                | Enable capturing              |
| `optOut`            | `() => void`                                                | Disable capturing             |
| `isEnabled`         | `(flagKey: string) => boolean`                              | Non-reactive flag read        |
| `isReady`           | `() => boolean`                                             | True once PostHog initialised |

`AnalyticsProperties` = `Record<string, string | number | boolean | null | undefined>`

## `useFeatureFlag(flagKey)` — reactive feature flags

Returns a `Ref<boolean>` that updates automatically when PostHog reloads flags. Cleans up its subscription via `onScopeDispose`.

```vue
<script setup lang="ts">
import { useFeatureFlag } from "@beetween/analytics";

const isNewDashboard = useFeatureFlag("new-dashboard");
</script>

<template>
  <NewDashboard v-if="isNewDashboard" />
  <LegacyDashboard v-else />
</template>
```

Falls back to `false` when analytics is unavailable (ad-blocker, SSR, uninitialised). Never throws.

## URL restriction helpers

Use these in `posthog.init()` to limit autocapture and event recording to specific domains/paths.

### `buildAutocaptureUrlAllowlist(config)`

Returns `RegExp[]` for `autocapture.url_allowlist`.

```ts
import { buildAutocaptureUrlAllowlist } from '@beetween/analytics';

autocapture: {
  url_allowlist: buildAutocaptureUrlAllowlist({
    domains: ['app.beetween.com', 'staging.beetween.com'],
    paths: ['/dashboard', '/jobs', '/candidates'],
    // paths default to ['.*'] (all paths on listed domains)
  }),
}
```

### `buildUrlEventGate(config)`

Returns an `EventGate` function for `before_send`. Drops **all events** (page views, clicks, custom) captured outside the allowed domains/paths.

```ts
import { buildUrlEventGate } from '@beetween/analytics';

before_send: buildUrlEventGate({
  domains: ['app.beetween.com'],
  // paths omitted → allow all paths on the domain
}),
```

### `UrlRestrictionConfig`

```ts
interface UrlRestrictionConfig {
  domains: string[]; // literal hostnames, auto-escaped for regex
  paths?: string[]; // regex fragments starting with '/' — default ['.*']
}
```

## What NOT to do

- Do **not** call `posthog.init()` inside the package or a composable — that is the app's responsibility.
- Do **not** import `posthog-js` directly in app code — use the `@beetween/analytics` composables.
- Do **not** add `posthog-js` to `dependencies` (it must stay a `peerDependency` in library packages that depend on `@beetween/analytics`).
- Do **not** use `analytics.isEnabled()` for reactive UI — use `useFeatureFlag()` instead.
