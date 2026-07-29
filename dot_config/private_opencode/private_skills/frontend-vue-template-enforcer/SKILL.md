---
name: template-building-enforcer
description: Enforces Vue template compliance — MF2 i18n syntax, WCAG 2.2 a11y, mobile-first, PrimeVue primitives, and stable ID generation.
---

# template-building-enforcer Skill

You are an automated structural template guardrail. Your mission is to enforce presentation logic patterns, semantic accessibility matrices, internationalization guidelines, and computational efficiency boundaries within all `<template>` blocks.

---

## 1. Hard Core Engine & Localization Constraints

### CRITICAL GUARDRAIL 1: Safe i18n Translation Sourcing (`useTranslation`)

- **Absolute Prohibition**: Never pass a namespace string argument to `useTranslation()` (e.g., `useTranslation('Recruitment')` is completely forbidden). The translation compiler maps a single, flattened root execution graph from a single merged payload. Passing arguments prevents traversal into sub-keys, silently dropping raw key strings into the interface.
- **Absolute Prohibition**: Never split translation targets into a `core.json` or custom namespace file. The localized system operates exclusively with two flat files per region: `public/locales/{lang}/common.json` (global actions and reusable layout components) and `main.json` (authoritative application logic maps).
- **Execution Rule**: Always parse keys by invoking `useTranslation()` with **zero arguments** and use the absolute full dot-path signature.
- _Correct Layout:_

```ts
// 📄 Inside .utils.ts or <script setup> initialization blocks
const { t } = useTranslation(); // ✅ Correct: Zero arguments passed
const message = t("Recruitment.Steps.StepsTitle"); // ✅ Correct: Exhaustive dot-path key
```

### CRITICAL GUARDRAIL 2: Message Format 2.0 (MF2) Syntax

- Forbidden: Passing variables to the translation helper prefixed with the template marker $.
- Mandatory: Variable descriptors use $ only inside the JSON structure ("welcome": "Hello {$name}"). When calling the injection helper t() inside TypeScript or Vue files, variables must be formatted as normal property keys.
- Correct Mapping: t('welcome', { name: 'Alice' })
- Incorrect Mapping (Broken): t('welcome', { $name: 'Alice' })

### CRITICAL GUARDRAIL 3: Key Namespace Hierarchy Safety

- Forbidden: Declaring a namespace string key path that is simultaneously used as a leaf node definition and an object container node (e.g., using t('Foo.Status') as a direct string label while nesting child parameters at t('Foo.Status.UNKNOWN') is physically impossible). i18next cannot navigate past an existing string leaf, breaking lookups for all child routes.
- Mandatory: Use the suffix label design scheme (FooStatusLabel for the baseline descriptor along with an isolated object map for structural iterations: Foo.Status.{VALUE}).

## ESLint Suppression Quirks (eslint-plugin-vue)

Three proven quirks when removing or managing eslint-disable comments:

1. **Template attribute violations**: An `<!-- eslint-disable some-rule -->` comment inside an SFC `<template>` does NOT suppress ATTRIBUTE-level violations (e.g. `vue/no-bare-strings-in-template`). Fix: move the static attribute string into a `<script>` `const` and bind it with `:attr="theConst"`.

2. **Multiple template roots**: `vue/no-multiple-template-root` on a multi-root fragment is cleanly satisfied by wrapping siblings in a single `<div class="contents">` (Tailwind `display:contents`, no layout box).

3. **Script-level disable propagates to template**: `/* eslint-disable vue/no-v-html */` placed as the FIRST line INSIDE `<script setup>` suppresses the TEMPLATE `v-html` rule (a script-level disable propagates to the template in this eslint-plugin-vue version).

## 2. Accessibility & Identifier Guardrails (WCAG 2.2 / WAI-ARIA)

### Rule A: Programmatic Identity Isolation (useId)

- Mandatory: Every template scope carrying interactive UI hooks (buttons, input fields, navigation targets, tab systems) must instantiate an active identifier tracking anchor by executing `const id = useId()` at the top layer of `<script setup>`.
- Naming Bounds: Elements must bind a unique ID string parameter utilizing kebab-case functional suffixes matching the syntax: :id="\${id}-{functional-purpose}\`"`(e.g.,`:id="\`${id}-submit-btn`"`).
- Loop Identity Isolation: When rendering interactive strings within a v-for iteration loop, you must completely avoid using array tracking offsets (index, i) inside the component identifier string. Bind your tracking keys exclusively to stable primitive business variables (id, uuid, or key maps from the data schema).

### Rule B: Icon-Only Interactive Elements Requirements

- Mandatory: Every interactive button element that drops a physical text descriptor (icon-only Button elements or custom markup anchors carrying an icon= property with no visible label attribute) must mount a v-tooltip directive matching the designated aria-label attribute value.
- Constraint: Tooltip targets must point to matching t() localization parameters to ensure sighted keyboard/mouse users receive an immediate interface response hook upon focus capture.
- Correct Blueprint:

```html
<button
  :aria-label="t('Action.Close')"
  :id="`${id}-close-btn`"
  icon="pi pi-times"
  v-tooltip.bottom="t('Action.Close')"
/>
```

### Rule C: PrimeVue RadioButton Attribute Redirection

- Forbidden: Setting an identifier against a PrimeVue radio selector using the generic :id attribute binder.
- Mandatory: PrimeVue RadioButton structures apply an isolated inheritAttrs: false flag. The physical DOM identification engine tracks the node via the inputId prop. Applying standard :id parameters attaches values to the outer wrapper div, decoupling labels from the input element and breaking mouse-click focus triggers.
- Style Rule: Every <label> element mapped to a RadioButton input wrapper must include the Tailwind cursor-pointer utility class to visually reflect interactiveness.
- Correct Blueprint:

```html
<RadioButton
  :inputId="`${id}-tier-${option.value}`"
  :value="option.value"
  v-model="tier"
/>
<label :for="`${id}-tier-${option.value}`" class="cursor-pointer text-sm"
  >...</label
>
```

## 3. Operational Verification & Compilation Audits

### Phase 1: Pre-Commit Compilation Key Auditing

Prior to concluding workspace changes or finalizing feature files, you must run an automated python audit verification sequence. Replace the placeholder targets in the block below to contain an exhaustive inventory checklist of every single lookup key introduced into your components:

```bash
python3 -c "
import json
with open('public/locales/en/main.json') as fw: d = json.load(fw)
with open('public/locales/en/common.json') as fc: dc = json.load(fc)
def get(obj, path):
    for p in path.split('.'): obj = obj.get(p, {}) if isinstance(obj, dict) else None
    return obj
keys = [
    'Jobs.Salary.Value',
    'Common.Action.Close'
]
for k in keys:
    v = get(d, k) if not k.startswith('Common.') else get(dc, k)
    status = '✅' if isinstance(v, str) else '❌ MISSING'
    print(status, k, '->', repr(v))
"
```

If the telemetry output signals a ❌ MISSING result for any path parameters, you must halt execution and backfill the declaration across all six localized region configurations (en, fr, es, nl, pt, it) before returning control to the workspace.

### Phase 2: Interface Execution Mapping

1. Parse template layouts to ensure structural components map cleanly to native PrimeVue primitives (DataTable, DatePicker, Select, MultiSelect) instead of reproducing raw markup variants.
2. Validate that all class strings follow strict mobile-first design hierarchies. Unprefixed layout attributes must target mobile viewports natively, using responsive parameters (md:flex-row, lg:w-80) exclusively to scale layouts upward.
3. Verify performance parameters against the vue-performance-enforcer guidelines: Ensure that zero computing methods are executed inline within template loop definitions, and all iterative elements route lookups through pre-computed O(1) sidecar Maps.

## 4. Enforcement Checklist (System Blockades)

Do NOT sign off template refactoring blocks if any of these condition violations are detected:

- [ ] Hardcoded text, string literals, or dynamic string concatenations exist within display tags. Everything must route cleanly through the localized t() method.
- [ ] A v-for loop assigns structural loop index array pointers to template :key references or element identification tracks.
- [ ] Interactive layout markers or text input structures exist without a clearly coupled semantic <label> or an explicit aria-label description.
- [ ] The template implements an input fields structure requiring localized descriptions or validations without mapping error outputs via explicit aria-describedby configuration hooks.

## 5. Output Verification Ledger

When markup refactoring cycles are completed, output your configuration updates using this log blueprint:

```Markdown
### 1. Template Architectural Footprint
- **Target Component File**: `app/components/.../{Name}.vue`
- **Orchestration sidecar**: `app/components/.../{Name}.utils.ts`

### 2. Guardrails & Accessibility Compliance
- [ ] **Programmatic Identity Integration**: Verified `useId()` implementation and confirmed stable data-derived identification values are attached to all interactive objects.
- [ ] **Radio Binding Redirection**: Confirmed all `RadioButton` arrays utilize explicit `inputId` props and display paired pointer cursors on accompanying label selectors.
- [ ] **Aria-Label Visibility Anchors**: Verified tooltip associations match icon-only action points accurately.
- [ ] **Root Translation Compliance**: Checked that `useTranslation()` is initialized with zero namespace arguments and that lookups route exclusively via root dot-paths.

### 3. Localized Key Audit Diagnostic Record
- **Automated Python Key Audit Run**: [State results and paste terminal diagnostic metrics confirmative of a 100% resolution rate across the 6 regional files]
```
