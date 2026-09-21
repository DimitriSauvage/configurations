
# Document Frontend Code

**Purpose**: retro-document existing frontend source into structured Markdown. Vue 3 `<script setup>`, Nuxt 4 SPA, TS strict, Tailwind, PrimeVue. Captures component contracts, composable APIs, page flows, Pinia stores.

Two modes:
- **Initial full pass** — entire feature/scope, creates doc files.
- **Incremental** — diff-driven, changed files only, updates affected sections only.

---

## TSDoc-First Rule

**TSDoc/JSDoc annotations are the primary source of truth.** Markdown files derive from TSDoc — never duplicate it.

Requirements:
- Every `defineProps<T>()` type property → annotated with `/** @description ... */` (or inline JSDoc on the interface field).
- Every `defineEmits<{}>()` event → annotated with `/** @description ... @param payload ... */`.
- Every public composable function and every key in the return shape → annotated with `/** ... */`.
- Composable options/arguments → typed interfaces with TSDoc on each field.

Enforcement:
- If a prop, emit, or composable return key lacks TSDoc, **add the annotation to the source file first**, then generate the Markdown table from it.
- Markdown tables are generated summaries. When TSDoc and Markdown diverge, **TSDoc wins** — update the Markdown, never the source annotation.

---

## Output Layout

| Doc kind | Path | Audience |
|---|---|---|
| Component behavior | `docs/frontend/components/<feature>/<name>.md` | Future maintainers |
| Composable API | `docs/frontend/composables/<name>.md` | API consumers |
| Page flow | `docs/frontend/pages/<route>.md` | Product + maintainers |
| Store (Pinia, rare) | `docs/frontend/stores/<name>.md` | Maintainers |

**Source-of-truth alignment**: doc names match file names (kebab-case). One doc per `<name>.vue` / `<name>.ts`. Composable doc names mirror `use-<name>.ts`.

---

## Adaptive Detail Rule

| Complexity | Format |
|---|---|
| Simple component (props/emits only) | One-paragraph summary + props/emits table |
| Stateful component (≥2 internal states) | Mermaid state diagram + interaction list |
| Composable | API table (returns, args, side effects) + 1 usage code block |
| Page | User flow Mermaid + state matrix + data sources |

**Mermaid only for ≥2 states OR ≥3 branches** — otherwise prose.

---

## Component Doc Template

```markdown
# <component-name>

## Purpose

## Props
| Name | Type | Default | Description |

## Emits
| Event | Payload | When |

## Slots

## Internal state

## Interactions / state diagram (mermaid)

## A11y notes

## Lifecycle

| Version | Date | Change |
|---|---|---|
| 1.0 | YYYY-MM-DD | Initial documentation |

## Related
```

---

## Composable Doc Template

```markdown
# use<Name>

## Returns
| Key | Type | Reactive? | Description |

## Arguments

## Side effects

## Usage
```

---

## Initial Full Pass

1. Detect project type — `nuxt.config.ts` → Nuxt 4, else plain Vue 3 SPA.
2. Map structure: `pages/`, `components/`, `composables/`, `stores/`.
3. Classify each file: `page` | `component` | `composable` | `store`.
4. Per-file analysis:
   - **Component**: read `defineProps<T>()`, `defineEmits<{}>()`, slots, composables used, `ref`/`reactive`/`computed`, async states (loading/empty/error/success).
   - **Composable**: inputs, return shape, side effects (`onMounted`, watchers, store writes), async behavior, error exposure.
   - **Store**: state shape + types, getters (computed deps), actions (mutations + async), consuming components.
5. Apply adaptive detail rule → generate doc file.

Infer without asking: props from `defineProps`, emits from `defineEmits`, composable IO from signature + return type.

Ask user when: no TS types + complex logic, async outcome unclear, API endpoint not in codebase, `// TODO` on key path.

---

## Incremental Mode

Trigger: "update docs after this change".

```bash
git diff --name-only HEAD~1
```

| Changed file | Sections to update |
|---|---|
| `components/<Name>.vue` | Props/Emits/Internal state/Interactions |
| `composables/use<Name>.ts` | Returns/Arguments/Side effects |
| `stores/<name>.ts` | State shape/Actions/Getters |
| `pages/<route>.vue` | User flow/State matrix/Data sources |

Rules:
- File unchanged → doc unchanged.
- Signature changed → update only props/emits/returns sections.
- Behavior changed → update interactions/state diagram.

---

## Stale-Doc Detector (v2)

Mark a document as **STALE** if ANY of the following are true:

| Trigger | Check |
|---|---|
| Props count mismatch | Count of `defineProps` fields in `.vue` ≠ rows in the Markdown Props table |
| Emits count mismatch | Count of `defineEmits` keys in `.vue` ≠ rows in the Markdown Emits table |
| Composable return drift | Properties in the composable return type differ from keys in the Markdown Returns table |
| Orphaned doc | Source `.vue` / `.ts` file no longer exists at the path the doc references |
| Heading set drift | Heading set in doc differs from current template spec |

When STALE detected → prepend the doc with:

```markdown
> ⚠️ STALE — last verified against `<source-file>` on <date>. Re-run documentation pass before merging.
```

Then flag the specific section(s) that triggered the staleness.

---

## Rename Guard

When a source file is renamed or moved:

1. **Mark old doc as ORPHANED** — prepend:

```markdown
> ⚠️ Orphaned — source moved to `<new-path>`. This document is no longer maintained.
```

2. **Generate new doc** at the correct output path matching the new file name.
3. **Update cross-links** — scan sibling docs for references to the old path and replace with the new path.
4. Add a row to the **Lifecycle** table in the new doc noting the rename.

Trigger detection: `git diff --name-only --diff-filter=R HEAD~1` lists renames.

---

## PR Markdown Document Checklist

Use this checklist during PR review when any `.vue`, `.ts` (composable/store), or `pages/` file is modified.

```markdown
## Documentation checklist

- [ ] Every modified component has a corresponding doc in `docs/frontend/components/`.
- [ ] Every modified composable has a corresponding doc in `docs/frontend/composables/`.
- [ ] Props/Emits table row count matches `defineProps`/`defineEmits` in the source file.
- [ ] Composable Returns table keys match the actual return type.
- [ ] All props, emits, and public composable keys have TSDoc annotations in source.
- [ ] No doc carries a `⚠️ STALE` or `⚠️ Orphaned` banner unresolved.
- [ ] Renamed/moved files: old doc marked ORPHANED, new doc created, cross-links updated.
- [ ] Lifecycle table updated with version/date/change entry for this PR.
- [ ] Mermaid diagrams (if present) reflect current state machine.
- [ ] A11y notes section present for interactive components.
```

---

## Anti-Patterns

| Pattern | Why bad |
|---|---|
| Autogenerated walls of text | Unreadable, ignored by maintainers |
| Duplicate prop tables drifting from code | Lies more than silence |
| Documenting trivial wrappers by hand | Noise; auto-infer from props/emits |
| Missing a11y notes | Accessibility regressions undetected |
| Missing related-component links | Orphaned docs, lost context |
| Stale Mermaid diagrams | Wrong state flow worse than none |
| Markdown written before TSDoc | Source annotation missing; doc becomes source of truth by accident |

---

## Cross-Links

- `structure-components` — folder layout, naming, component tiers, auto-import rules
- `typescript-vue-conventions` — strict TS, Props/Emits interfaces, no-any policy
- `vue-composable-testing-patterns` — Vitest tests for extracted composables
- `analyze-feature-architecture` — pre-implementation architecture analysis
