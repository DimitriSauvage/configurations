# Configuration

All options are set under the `beetweenTranslation` key in `nuxt.config.ts`.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@beetween/nuxt-translation'],
  beetweenTranslation: {
    localesDir: './public/locales',
    fallbackLng: 'fr',
    loadPath: '/locales/{{lng}}/translations.json',
  },
});
```

## Options

### `localesDir`

| | |
|---|---|
| Type | `string` |
| Default | `'./public/locales'` |

Path (relative to the project root) to the directory containing per-language subdirectories. The module scans this directory at build time and merges all `.json` files inside each language subdirectory into a `translations.json` file.

```ts
beetweenTranslation: {
  localesDir: './public/locales',
}
```

Each direct subdirectory of `localesDir` is treated as a language code:

```
public/locales/
├── fr/   ← language "fr"
│   ├── common.json
│   └── feature.json
└── en/   ← language "en"
    ├── common.json
    └── feature.json
```

### `fallbackLng`

| | |
|---|---|
| Type | `string` |
| Default | `'fr'` |

The i18next fallback language used when a translation key is missing in the currently detected language. If a key is absent in both the active language and the fallback, `t()` returns the key itself.

```ts
beetweenTranslation: {
  fallbackLng: 'en',
}
```

### `loadPath`

| | |
|---|---|
| Type | `string` |
| Default | `'/locales/{{lng}}/translations.json'` |

URL path template used by `i18next-http-backend` to fetch translation files at runtime. `{{lng}}` is replaced by the detected (and normalised) language code.

```ts
beetweenTranslation: {
  loadPath: '/locales/{{lng}}/translations.json',
}
```

## Keeping `localesDir` and `loadPath` in sync

`localesDir` is a **build-time** option: it tells the Vite plugin where to write merged files on disk.  
`loadPath` is a **runtime** option: it tells i18next where to fetch those files in the browser.

They must point to the same files. The default values are aligned — if you change `localesDir`, update `loadPath` accordingly:

| `localesDir` | Expected `loadPath` |
|---|---|
| `./public/locales` (default) | `/locales/{{lng}}/translations.json` (default) |
| `./public/i18n` | `/i18n/{{lng}}/translations.json` |
| `./public/assets/locales` | `/assets/locales/{{lng}}/translations.json` |

> The `/public` prefix is stripped by Nuxt when serving static assets — do not include it in `loadPath`.
