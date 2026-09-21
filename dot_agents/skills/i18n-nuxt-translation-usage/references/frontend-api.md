# API

## Module options

```ts
interface ModuleOptions {
  /**
   * Path to the directory containing language subdirectories with JSON translation files.
   * Each subdirectory name is treated as a language code (e.g., `en`, `fr`).
   * All `.json` files inside each language directory are merged into a single `translations.json`.
   * @default './public/locales'
   */
  localesDir: string;

  /**
   * The i18next fallback language used when a translation key is missing in the detected language.
   * @default 'fr'
   */
  fallbackLng: string;

  /**
   * The path template used by i18next-http-backend to load translation files.
   * Use `{{lng}}` as a placeholder for the language code.
   * @default '/locales/{{lng}}/translations.json'
   */
  loadPath: string;
}
```

## Auto-imported composable

### `useTranslation()`

Re-exported from [`i18next-vue`](https://github.com/i18next/i18next-vue). Returns the i18next translation function and reactive state. Available in every component without an explicit import.

```ts
const { t, i18next, language } = useTranslation();
```

| Return value | Type | Description |
|---|---|---|
| `t` | `TFunction` | Translate a key. Signature: `t(key, variables?)` |
| `i18next` | `i18next` | The shared i18next instance |
| `language` | `Ref<string>` | Reactive currently active language code |
| `languages` | `Ref<readonly string[]>` | Reactive list of loaded language codes |

**Basic usage:**

```ts
const { t } = useTranslation();
t('common.title')                          // simple key
t('greeting', { name: 'Alice' })           // MF2 variable
t('items', { count: 3 })                   // MF2 plural
```

**Changing language programmatically:**

```ts
const { i18next } = useTranslation();
await i18next.changeLanguage('en');
```

## Vite plugin (internal)

The module registers a Vite plugin named `merge-translations` that hooks into `buildStart`. It runs on every `nuxt dev` start and every `nuxt build`. It is not exported for direct use — configure it via `beetweenTranslation.localesDir` in `nuxt.config.ts`.

### Merge strategy

1. The plugin reads all direct subdirectories of `localesDir` — each is treated as a language.
2. For each language directory, it reads every `.json` file **except** `translations.json` itself.
3. All files are deep-merged using [`lodash-es` `merge()`](https://lodash.com/docs/#merge): nested objects are recursively combined.
4. The result is written to `translations.json` in the same language directory.

**Conflict rule — last file wins:**

Files are read in filesystem order (typically alphabetical by filename). When two files define the same leaf key, the one that comes last in that order takes precedence.

```
fr/
├── 01-base.json      → { "title": "Base" }
└── 02-override.json  → { "title": "Override" }
```

Produces `{ "title": "Override" }`. To control priority, use a numeric prefix.

**Deep merge example:**

```json
// a.json          { "nav": { "home": "Accueil" } }
// b.json          { "nav": { "profile": "Profil" } }
// translations.json → { "nav": { "home": "Accueil", "profile": "Profil" } }
```

## Runtime plugin (internal)

The module registers a **client-only** Nuxt plugin that initialises `i18next` once with the following stack:

| Plugin | Role |
|---|---|
| `i18next-mf2` | Message Format 2 syntax support (variables, plurals, dates, etc.) |
| `i18next-http-backend` | Fetches `translations.json` from the server at runtime via `loadPath` |
| `i18next-browser-languagedetector` | Detects browser language and normalises to lowercase base code |
| `i18next-vue` | Integrates i18next with the Vue 3 app instance |

`debug` mode is automatically enabled in Nuxt's development mode (`import.meta.dev`).

### Language detection and normalisation

The language detector reads the browser's preferred language and strips the region variant:

| Browser language | Resolved code |
|---|---|
| `fr-FR` | `fr` |
| `fr-BE` | `fr` |
| `en-US` | `en` |
| `de` | `de` |

Detection results are **not cached** (no `localStorage` or cookie is written). The browser's `Accept-Language` is re-evaluated on every page load.

### MF2 functions enabled

The following MF2 draft functions are available out of the box:

| Function | Example |
|---|---|
| `:date` | `{$d, :date style=long}` |
| `:time` | `{$d, :time style=short}` |
| `:datetime` | `{$d, :datetime dateStyle=full timeStyle=short}` |
| `:number` | `{$n, :number minimumFractionDigits=2}` |
| `:currency` | `{$n, :currency currency=EUR}` |
| `:unit` | `{$n, :unit unit=kilometer}` |
| `:math` | `{$n, :math}` |
