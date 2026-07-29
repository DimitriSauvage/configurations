---
name: typescript-vue-conventions
description: Strict TypeScript conventions for Nuxt 4 and Vue 3 script-setup — any policy, defineProps/Emits, typed composables. Use for all .ts/.vue files. Do NOT use for untyped JavaScript.
---

# TypeScript + Vue Conventions

## Foundation

`tsconfig.json` — minimum required flags:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true
  }
}
```

`noPropertyAccessFromIndexSignature` — forces `obj['key']` syntax on index-signature types, preventing silent `undefined` access via dot notation.  
`exactOptionalPropertyTypes` — distinguishes `prop?: T` (key may be absent) from `prop: T | undefined` (key present but undefined). Prevents silent `undefined` assignments.

SFC typecheck: `vue-tsc --noEmit`. Plain TS: `tsc --noEmit`. Both run in CI.

---

## `any` Policy

| Rule               | Detail                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `any`              | Build error. Never use.                                                                                                                                                                                |
| `@ts-ignore`       | Forbidden.                                                                                                                                                                                             |
| `@ts-nocheck`      | Forbidden. Never suppress an entire file.                                                                                                                                                              |
| `@ts-expect-error` | Allowed only with a rationale comment (≥ 10 chars) on the **same or preceding line**. ESLint: `@typescript-eslint/ban-ts-comment` with `minimumDescriptionLength: 10`. Max **1 suppression per file**. |
| Boundary types     | Use `unknown`; narrow via type guard.                                                                                                                                                                  |

ESLint config (`.eslintrc` or flat config):

```js
// eslint.config.js
{
  rules: {
    '@typescript-eslint/ban-ts-comment': ['error', {
      'ts-expect-error': { descriptionFormat: '^: .{10,}$' },
      'ts-ignore': true,
      'ts-nocheck': true,
      minimumDescriptionLength: 10,
    }],
  }
}
```

```ts
// WRONG
const data: any = fetchResult;

// WRONG — no rationale
// @ts-expect-error
const x = legacyLib.doThing();

// RIGHT
const data: unknown = fetchResult;
if (isCandidate(data)) {
  /* narrowed */
}

// RIGHT — rationale present
// @ts-expect-error: legacyLib missing types until v3 migration (TICKET-123)
const x = legacyLib.doThing();
```

---

## File Naming

| Artifact                    | Convention                                                   | Example                         |
| --------------------------- | ------------------------------------------------------------ | ------------------------------- |
| `.ts` / `.vue` / `.test.ts` | kebab-case                                                   | `candidate-list.vue`            |
| Component import/register   | PascalCase                                                   | `CandidateList`                 |
| Composable file             | `<owner>.use-<purpose>.ts` or `composables/use-<purpose>.ts` | `candidate-list.use-filters.ts` |

See `structure-components` for folder-per-component layout.

---

## Pure ES Modules

`import` / `export` only. Never `require`, never `module.exports`, never CommonJS interop hacks.

---

## Vue Compiler Macros

All macros are compiler-handled — **never import them**.

| Macro                                           | Purpose                       |
| ----------------------------------------------- | ----------------------------- |
| `defineProps<T>()`                              | Typed props via generic       |
| `defineEmits<{ event: [arg: T] }>()`            | Typed emits via tuple syntax  |
| `defineModel<T>('name')`                        | Two-way bound model           |
| `defineSlots<{ default(props: T): VNode[] }>()` | Typed slots                   |
| `defineOptions({ name: '...' })`                | Set component options         |
| `defineExpose<T>({...})`                        | Expose to template ref (rare) |

### Typed `defineModel`

Always use `defineModel` for two-way bindings (v-model). Do NOT use the legacy `prop` + `emit` combination for `update:xxx` events.

```ts
// ❌ WRONG WAY - Legacy prop + emit
interface Props {
  open: boolean;
}
const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
}>();

// ✅ RIGHT WAY - defineModel
const isOpened = defineModel<boolean>("open", { default: false });
```

Always pass the generic — never infer `any` via an untyped call.

```vue
<script setup lang="ts">
// single model — value is typed string, never undefined when required
const modelValue = defineModel<string>({ required: true });

// named model with default
const visible = defineModel<boolean>("visible", { default: false });

// nullable optional model
const selectedId = defineModel<string | null>("selectedId");
</script>
```

Parent usage — the compiler enforces the type on `v-model`:

```vue
<template>
  <!-- TS error if :model-value receives wrong type -->
  <MyInput v-model="name" />
  <MyDialog v-model:visible="showDialog" />
</template>
```

---

## Props / Emits / Model Interfaces

Define in `<name>.types.ts` — **not inline** in `<script setup>`. Component imports.

```ts
// candidate-list.types.ts
export interface CandidateListProps {
  items: readonly Candidate[];
  loading?: boolean;
}
export type CandidateListEmits = { select: [candidate: Candidate] };
```

```vue
<script setup lang="ts">
import type {
  CandidateListProps,
  CandidateListEmits,
} from "./candidate-list.types";
const props = defineProps<CandidateListProps>();
const emit = defineEmits<CandidateListEmits>();
</script>
```

---

## Shared Types from `shared.types`

**RULE**: Always prefer types from `@beetween/design-system-ui/shared/shared.types` over inline union types.

Common shared types:

| Type          | Definition                  | Use When                                |
| ------------- | --------------------------- | --------------------------------------- |
| `Nullable<T>` | `T \| null \| undefined`    | Parameter/return accepts missing values |
| `Prettify<T>` | Flattens intersection types | Type debugging, cleaner IDE tooltips    |

### Correct Usage

```ts
// shared.types.ts
export type Nullable<T> = T | null | undefined;

// your-utils.ts
import type { Nullable } from "@beetween/design-system-ui/shared/shared.types";

// WRONG — inline union, not reusable
function computeInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {}

// RIGHT — uses Nullable, consistent across codebase
function computeInitials(
  firstName: Nullable<string>,
  lastName: Nullable<string>,
): string {}

// In component props
export interface AvatarProps {
  firstName: Nullable<string>;
  lastName: Nullable<string>;
}
```

**Exception**: Literal unions specific to a single component (e.g., `'pending' | 'loaded' | 'error'`) may be defined inline. Shared patterns go to `shared.types`.

---

## Generic Components

Use `<script setup lang="ts" generic="T">` for generic components. In `.tsx` / ambiguous JSX parsers add a **trailing comma** to disambiguate from JSX opening tags:

```vue
<!-- candidate-select.vue -->
<script setup lang="ts" generic="T">
// trailing comma above is the JSX workaround — required in .tsx contexts,
// harmless in .vue SFCs, keep it for consistency

import type { VNode } from "vue";

interface Props {
  items: readonly T[];
  itemKey: (item: T) => string;
}
const props = defineProps<Props>();
const modelValue = defineModel<T | null>({ default: null });
defineSlots<{
  item(props: { item: T; selected: boolean }): VNode[];
}>();
</script>
```

---

## Template Event Typing

Inline `$event` handlers in templates silently receive `any`. Extract handlers to `<script setup>` to get full type safety.

```vue
<!-- WRONG — $event is any, error goes undetected -->
<template>
  <input @change="emit('update', $event.target.value)" />
</template>

<!-- RIGHT — handler in script setup, fully typed -->
<script setup lang="ts">
function handleChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  emit("update", target.value);
}
</script>

<template>
  <input @change="handleChange" />
</template>
```

The same rule applies to component events emitted with complex payloads — always define a typed handler function, never inline `$event` access.

---

## Discriminated Unions (State Shape)

Prefer over boolean-stew. Boolean-stew forbidden in app composables.

```ts
// RIGHT
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: ClassifiedError }
  | { status: 'success'; data: T }

// WRONG
{ isLoading: true, isError: true, data: null }
```

---

## `satisfies` Operator (TS 4.9+)

Use `satisfies` to validate a value against a type **without widening it**. Prefer over `as` when you want the compiler to keep the narrowest inferred type.

```ts
// as — widens to Record<string, string>, loses literal keys
const palette = {
  red: "#ff0000",
  blue: "#0000ff",
} as Record<string, string>;
// palette.red → string  (lost '#ff0000' literal)

// satisfies — validates shape, keeps literal types
const palette = {
  red: "#ff0000",
  blue: "#0000ff",
} satisfies Record<string, string>;
// palette.red → '#ff0000'  (literal preserved)

// Route config: validated as RouteConfig[], literals kept for intellisense
const routes = [
  { path: "/candidates", name: "candidates" },
] satisfies RouteConfig[];
```

**Rule**: reach for `satisfies` before `as`. Use `as` only at known-safe boundaries (e.g., template ref casts — see Type Guards below).

---

## Type Guards

`function isX(v: unknown): v is X` — prefer over inline casts.

### Forbidden: chained type assertions

`value as unknown as X` is a type-safety bypass. Forbidden except in Vue template ref casts where the compiler cannot infer the DOM element type.

```ts
// FORBIDDEN — double cast, no runtime check
const name = (response as unknown as { name: string }).name;

// RIGHT — type guard with runtime check
function hasName(v: unknown): v is { name: string } {
  return (
    typeof v === "object" &&
    v !== null &&
    "name" in v &&
    typeof (v as Record<string, unknown>).name === "string"
  );
}
if (hasName(response)) {
  /* narrowed */
}
```

### Acceptable cast: Vue template refs

```ts
// Only acceptable use of `as` — template ref, Vue cannot infer the element type
const inputRef = ref<HTMLInputElement | null>(null);

function focusInput(): void {
  // `as` is safe here: the ref is bound to a known <input> element in the template
  (inputRef.value as HTMLInputElement).focus();
}
```

**Rule**: every `as` cast must have a comment explaining why a type guard is not feasible.

---

## Type-Only Imports

`import type { X }` when value not needed at runtime. ESLint-enforced.

---

## Generated Types (`app/api/generated/`)

Orval output — **READ-ONLY**. Gitignored. Regenerated at prebuild.

- NEVER hand-edit.
- NEVER import private internals — only public exports.

---

## Readonly Inputs

Prefer `Readonly<T>` and `readonly T[]` for props and external inputs. Mutability is opt-in.

---

## CSR-Only

Project is Nuxt 4 SPA. No server-side code.

- NEVER write code in `server/`.
- NEVER use `useFetch` server-side branches.
- NEVER use SSR-only composables (`useRequestEvent`, `useRequestHeaders`, etc.).

---

## Composables

- Prefix `use<Name>`.
- Return reactive object or refs.
- **Always declare an explicit return type interface** — prevents accidental ref leakage and establishes a stable API contract.
- NEVER return raw mutable references unless documented.
- One composable per file.
- NEVER default-export a composable.

```ts
// candidate-list.use-filters.ts

// Explicit return interface — callers depend on this contract, not the inferred shape
export interface UseCandidateFiltersReturn {
  readonly filters: Readonly<Ref<CandidateFilters>>;
  readonly activeCount: ComputedRef<number>;
  setFilter(key: keyof CandidateFilters, value: string): void;
  resetFilters(): void;
}

export function useCandidateFilters(): UseCandidateFiltersReturn {
  const filters = ref<CandidateFilters>({ status: "all", query: "" });
  const activeCount = computed(
    () => Object.values(filters.value).filter(Boolean).length,
  );

  function setFilter(key: keyof CandidateFilters, value: string): void {
    filters.value = { ...filters.value, [key]: value };
  }

  function resetFilters(): void {
    filters.value = { status: "all", query: "" };
  }

  return { filters: readonly(filters), activeCount, setFilter, resetFilters };
}
```

---

## `enum` vs `const` Object

`const X = {...} as const` + derived union. `enum` only when Orval/backend interop requires.

---

## CI Gates

| Command             | Purpose                             |
| ------------------- | ----------------------------------- |
| `npm run typecheck` | `vue-tsc --noEmit` over app + tests |
| `npm run lint`      | ESLint + `@typescript-eslint`       |

Both must pass — no merge otherwise.

---

## JSDoc / TSDoc

Document the **public surface** — everything a consumer or IDE will see. Skip internals.

### What to document

| Target                                     | Required tags                                                         |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Exported function / composable             | `/** … */` block + `@param` per arg + `@returns`                      |
| Exported interface / type                  | Block comment on the interface + single-line `/** … */` on each field |
| Exported constant with non-obvious purpose | Single-line `/** … */`                                                |
| `@default` on optional prop                | Always — IDE shows default on hover                                   |
| Cross-reference to related symbol          | `{@link SymbolName}`                                                  |

### What NOT to document

- Unexported (private) helpers — name them well instead.
- Trivial re-exports (`export { foo } from './foo'`).
- Type-only imports.
- Self-explanatory one-liners where the name + types are sufficient.

### Style

```ts
/**
 * One-sentence summary ending with period.
 *
 * Optional longer explanation when behaviour is non-obvious.
 *
 * @param name - What it is and any constraints (e.g. "kebab-case string").
 * @returns What is returned and when it can differ (e.g. empty array vs null).
 */
export const myFn = (name: string): string[] => { … };

/**
 * Return value of {@link myComposable}.
 */
export interface MyComposableReturn {
  /** Short field description. */
  readonly count: Ref<number>;
  /**
   * Longer description when a field needs it.
   *
   * @param key - The item key to look up.
   */
  getItem: (key: string) => Item | undefined;
}
```

### Anti-patterns

| Pattern                                    | Fix                               |
| ------------------------------------------ | --------------------------------- |
| `// param: foo` prose instead of `@param`  | Use `@param foo -` JSDoc tag      |
| Omitting `@returns` on non-void public fn  | Always include                    |
| Duplicating type info already in signature | Describe _intent_, not type       |
| Doc block on every private helper          | Remove — name the function better |

---

## Anti-Patterns

| Pattern                                           | Reason                                           |
| ------------------------------------------------- | ------------------------------------------------ |
| `any`                                             | Disables type safety                             |
| `@ts-ignore`                                      | Forbidden                                        |
| `@ts-nocheck`                                     | Forbidden — never suppress entire file           |
| `@ts-expect-error` without rationale (≥ 10 chars) | Forbidden — rationale required                   |
| More than 1 `@ts-expect-error` per file           | Exceeds suppression budget                       |
| Chained cast `value as unknown as X`              | Type-safety bypass — use type guard              |
| Inline `$event` in template handlers              | Silent `any` — extract to typed handler          |
| `as X` without comment                            | Must document why type guard not feasible        |
| `satisfies` replaced by `as`                      | `as` widens; `satisfies` validates and preserves |
| Inline Props interface in `<script setup>`        | Belongs in `.types.ts`                           |
| Boolean-stew state                                | Use discriminated union                          |
| Hand-editing `app/api/generated/`                 | Orval owns that tree                             |
| `require()`                                       | ESM only                                         |
| Mutable props                                     | Use `Readonly<T>`                                |
| Untyped event handlers                            | Type all `$event` params                         |
| SSR-only composables in CSR app                   | No `server/` code                                |
| Default-export composable                         | Named exports only                               |
| Composable without explicit return type           | Ref leakage risk, unstable API                   |
| Generic component without trailing comma          | JSX parse ambiguity in `.tsx`                    |

---

## Cross-Links

- `structure-components` — folder layout, naming, script setup region order
- `vue-composable-testing-patterns` — Vitest tests for composables
- `tanstack-query-patterns` — useQuery/useMutation conventions
- `tanstack-query-error-handling` — ClassifiedError, error states
- `orval-openapi-codegen` — generated types, prebuild contract
- `nuxt4-spa-conventions` — routing, layouts, page meta
- `beetween-eslint-prettier-shared-config` — ESLint + Prettier rules
