---
name: beetween-eslint-prettier-shared-config
description: Shared ESLint + Prettier configs for Beetween Vue 3 / TS apps — consume by extending, never hand-roll rules.
---

# Beetween ESLint + Prettier Shared Config

## Scope

Beetween provides shared ESLint + Prettier configs. Apps consume by extending — NEVER hand-roll rules.

---

## Packages

| Package | Purpose |
|---|---|
| `@beetween/eslint-config` | Flat config preset for Vue 3 + TS strict |
| `@beetween/prettier-config` | Formatting rules |

Install:

```sh
npm install --save-dev @beetween/eslint-config @beetween/prettier-config eslint prettier
```

---

## `eslint.config.ts` (ESLint 9 flat config)

```ts
import beetween from '@beetween/eslint-config'

export default beetween({
  ignores: ['app/api/generated/**', '.nuxt/**', '.output/**', 'dist/**'],
})
```

---

## `prettier.config.ts`

```ts
import beetween from '@beetween/prettier-config'

export default beetween
```

Or via `package.json`:

```json
{
  "prettier": "@beetween/prettier-config"
}
```

---

## Always-Ignored Paths

| Path | Why |
|---|---|
| `app/api/generated/**` | Orval output (cross-link `orval-openapi-codegen`) |
| `.nuxt/**`, `.output/**` | Nuxt build artifacts |
| `dist/**`, `coverage/**` | Build/test outputs |
| `public/**` | Static assets |

---

## Mandatory Rules (no app-level override)

Enforced by shared config — do not disable or loosen at app level:

- `@typescript-eslint/no-explicit-any` — **error**
- `@typescript-eslint/consistent-type-imports` — **error**
- `vue/multi-word-component-names` — **error** (except via explicit allow-list)
- `import/no-cycle` — **error**
- `import/order` — **warn → error** (gradual rollout)
- `no-restricted-imports` — blocks forbidden libs

---

## App-Level Overrides

Allowed for project-specific tweaks (e.g., relaxed rules in test files).
**NEVER** override `no-explicit-any` upward.

```ts
import beetween from '@beetween/eslint-config'

export default beetween({
  ignores: ['app/api/generated/**', '.nuxt/**', '.output/**', 'dist/**'],
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
})
```

---

## Scripts in `package.json`

```json
{
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

---

## CI Gate

Cross-link `validate-quality-gates`. All must pass:

```sh
npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build
```

---

## Editor Integration

`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
}
```

---

## Upgrade Path

Shared config bumps via semantic-release (cross-link `semantic-release-conventional-commits`). Apps follow caret-range. Breaking rule bumps land in a major version.

---

## Anti-Patterns

| ❌ | Why |
|---|---|
| Hand-rolled `.eslintrc.*` files | Shared config is the source of truth |
| Forking shared config in-app | Drift; updates won't apply |
| Disabling `no-explicit-any` | Strict TS is non-negotiable |
| Ignoring `app/api/generated` in source control but not in lint config | Generated files pollute lint output |
| Per-file `eslint-disable` without rationale comment | Untracked suppressions |
| Running Prettier with non-shared options | Format inconsistency across apps |

---

## Cross-Links

- `typescript-vue-conventions` — TS + Vue 3 strict typing rules
- `validate-quality-gates` — CI gate sequence
- `orval-openapi-codegen` — generated API client conventions
- `nuxt4-spa-conventions` — Nuxt 4 app-level conventions
