---
name: i18n-nuxt-translation-usage
description: Guide for @beetween/nuxt-translation and i18n in Nuxt 4 — useTranslation(), MF2 variables/plurals, locales JSON files. Do NOT use for database persistence translation logic.
---

# @beetween/nuxt-translation — Usage Guide

Use when adding/updating locale keys, calling `useTranslation()` / `t()`, configuring `nuxt.config.ts`, or debugging raw key strings. MF2 syntax → cross-cutting `i18n-messageformat2-syntax`.

---

## Stack

| Layer      | Library                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| Module     | `@beetween/nuxt-translation` (Nuxt 4, thin wrapper)                             |
| Core       | `@beetween/translation` (framework-agnostic)                                    |
| Parser     | `i18next-mf2` (MF2 plugin for i18next)                                          |
| Composable | `useTranslation()` — auto-imported from `@beetween/translation`, NOT `vue-i18n` |

---

## Module Config

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@beetween/nuxt-translation"],
  beetweenTranslation: {
    localesDir: "./public/locales",
    fallbackLng: "fr",
    loadPath: "/locales/{{lng}}/translations.json",
  },
});
```

| Option        | Default                                | Description                                  |
| ------------- | -------------------------------------- | -------------------------------------------- |
| `localesDir`  | `'./public/locales'`                   | Build-time path relative to project root     |
| `fallbackLng` | `'fr'`                                 | Fallback when key missing                    |
| `loadPath`    | `'/locales/{{lng}}/translations.json'` | Browser fetch URL via `i18next-http-backend` |

---

## File Layout

```
public/locales/
├── en/          ← source of truth
├── fr/
├── es/
├── pt/
├── nl/
└── it/
    ├── common.json
    ├── recruitment.json
    └── translations.json  ← GENERATED — never edit
```

`.gitignore`: `public/locales/**/translations.json`

---

## useTranslation() Composable

Auto-imported from `@beetween/translation`. Never add explicit import. Returns `t`, `i18next`, `language`, `registerBundles`.

| Return            | Type                                                | Description                                      |
| ----------------- | --------------------------------------------------- | ------------------------------------------------ |
| `t`               | `(key, opts?) => ComputedRef<string>`               | Translate key with MF2 variables                 |
| `i18next`         | `i18next`                                           | Shared instance                                  |
| `language`        | `Readonly<Ref<string>>`                             | Reactive current lang (read-only)                |
| `registerBundles` | `(ns: string, bundles: TranslationBundles) => void` | Register locale bundles into the shared instance |

```vue
<script setup lang="ts">
const { t } = useTranslation();
</script>
<template>
  <h1>{{ t("recruitment.candidate.pending") }}</h1>
</template>
```

Locale switch: `await i18next.changeLanguage('fr')`. PrimeVue sync via `usePrimeVueLocale` from `@beetween/design-system-ui` — see `primevue-component-usage`.

---

## Key Naming Convention

`<feature>.<entity>.<state>` — kebab-case. Max 4 segments. Never UI-position keys (`top.title`).

| Example                  |                                       |
| ------------------------ | ------------------------------------- |
| Feature > entity > state | `recruitment.candidate.pending`       |
| Common action            | `common.actions.save`                 |
| Common error             | `common.errors.unexpected`            |
| Toast outcome            | `recruitment.candidate.deleteSuccess` |

Leaf + parent conflict: use `label` suffix for leaf. Status/enum: separate label from values.

---

## Where Keys Live

Keys in **app** (`i18n/locales/`). DS components (`@beetween/design-system-ui`) manage their own locale bundles in dedicated i18next namespaces — app keys and DS keys never conflict. To override a DS string, call `i18next.addResourceBundle(lng, ns, overrides, true, true)` before the component mounts. See `ui-beetween-design-system` for the DS i18n architecture.

---

## Build-Time Merge

Deep-merges all `.json` per locale into `translations.json` via `lodash-es merge()`. Last file wins alphabetically. Use numeric prefixes (`01-base.json`) for priority. Never edit `translations.json` directly.

---

## Debugging

| Symptom                       | Fix                                                   |
| ----------------------------- | ----------------------------------------------------- |
| Raw key in UI                 | Key missing — add to all locales                      |
| `$var` not substituted        | Remove `$` from `t()` opts: `t('key', { name: 'x' })` |
| Stale value                   | Restart `nuxt dev`                                    |
| `useTranslation()` undefined  | Module not in `modules` array                         |
| `translations.json` committed | Add `.gitignore` entry                                |

Dev warns on missing keys. CI fails on absent keys.

---

## Migration from `@beetween/nuxt-merge-translation`

Discouraged — new code uses `@beetween/nuxt-translation` only.

```diff
- modules: ['@beetween/nuxt-merge-translation'],
+ modules: ['@beetween/nuxt-translation'],
- beetweenMergeTranslation: { localesDir: './i18n/locales' },
+ beetweenTranslation: { localesDir: './public/locales', fallbackLng: 'fr', loadPath: '/locales/{{lng}}/translations.json' },
```

Steps: remove manual `i18next` plugin, drop explicit `import { useTranslation }`, update `{{var}}` → `{$var}` in JSON files.

---

## Anti-Patterns

- Hard-coded user-facing strings
- `vue-i18n` usage (forbidden)
- Duplicating DS translation keys in app locale files
- Locale drift between i18next + PrimeVue
- Untyped key strings — use `as const` or enum
- String concatenation of translated values
- Editing `translations.json` directly
- Keys in only one locale
- Backend MF2 translations (out of scope — frontend only)

---

## Cross-Links

- `i18n-messageformat2-syntax` — MF2 syntax SOT (cross-cutting)
- `primevue-component-usage` — usePrimeVueLocale, PrimeVue i18n
- `structure-components` — component hierarchy
- `ui-beetween-design-system` — DS component i18n architecture
