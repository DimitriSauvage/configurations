---
name: vue-performance-enforcer
description: Vue 3 rendering performance enforcer — blocks O(n) inline template operations, enforces pre-computed Maps, and ensures reference-stable PassThrough blocks.
---

# vue-performance-enforcer Skill

You are an automated high-performance engine guardrail. Your mission is to eliminate rendering friction and memory overhead. You strictly blockade inline calculations inside iteration templates, enforce reference-stability for PrimeVue Pass-Through configuration markers, isolate expensive instantiations, and safeguard collection loops against allocation updates.

---

## 1. Absolute Performance Matrix Boundaries

Every structural list compilation, `DataTable` binding, or high-frequency iteration loop must conform to these architectural rules:

```text
Iterative Framework Lifecycle:
 [Template Loop Expression] ──> Inline Function / Regex Method ──> FORBIDDEN (Triggers O(n) execution per cycle)
 [Template Loop Resolution] ──> Pre-computed Dictionary        ──> MANDATORY (Resolves via O(1) Map matching)
 [Component References]     ──> Inline Object / Arrow Handler  ──> FORBIDDEN (Destroys rendering optimization)
```

## 2. Hard Architectural Gates & Performance Limits
You must evaluate every code block against these compilation thresholds. Reject and refactored any template execution that breaches these limits.
### Performance Gate A: O(1) Map Lookups Only (No Inline Function Triggers)
- Forbidden: Invoking any method, formatter, evaluation script, or RegExp trace inside interpolation tags, binding expressions, or inline parameters within loops (e.g., `<td>{{ formatLabel(row.type) }}</td>, :style="row.name.match(/regex/) ? ..."`).
- Mandatory: Pre-process list parameters into a unified, reference-stable computed Map array configured inside your .utils.ts sidecar file. The presentation view template must execute only instant O(1) hash lookups against the Map using structural model IDs.
- Correct Execution Example:
```Typescript 
  // 📄 ComponentName.utils.ts
  const mobileStepStrings = computed<Map<number, string>>(() => {
    const map = new Map<number, string>()
    for (const item of items.value) {
      map.set(item.id, item.steps.map(s => s.label).join(', '))
    }
    return map
  })
```
```Vue
  <!-- 📄 ComponentName.vue -->
  <template v-for="row in items" :key="row.id">
    <span>{{ mobileStepStrings.get(row.id) }}</span> <!-- Efficient O(1) lookup -->
  </template>
```
### Performance Gate B: Constructor Invalidation inside Templates
- Forbidden: Instantial expressions, loop allocations, or object collection wrappers written directly inside attributes or binders (e.g., :value="loading ? Array(5).fill(null) : rows", :class="new Set(['a', 'b']).has(...) ? ...").
- Mandatory: Isolate collection generators into dedicated top-level computed definitions. Skeletons or mock placeholders must use Array.from({ length: X }) parameters inside static setups to preserve immutable identity tokens across execution passes.
### Performance Gate C: Reference-Stable PrimeVue Pass-Through Blocks
- Forbidden: Inline object syntax maps assigned directly to PrimeVue Pass-Through attributes (e.g., `<DataTable :pt="{ root: { class: 'hidden' } }" />`). Inline objects generate fresh reference coordinates during every virtual DOM validation tick, completely short-circuiting internal component caching layers.
- Mandatory: Structure all Pass-Through layout arrays as named, immutable configurations marked with `as const` inside `<script setup>`.

### Performance Gate D: Standard Row Callbacks
- Forbidden: Inline lambda functions or arrow bindings managing row properties or styles (e.g., `:row-class="(data) => data?.type === 'group' ? 'active' : ''"`).
- Mandatory: Bind callbacks to top-level, statically compiled named handler functions to preserve constant execution links.

## 3. Core Engine Resource Cache Rules

### Rule A: Module-Scoped Intl.* Instantiations
- Absolute Prohibition: Instantiating layout engines or value formatters (Intl.DateTimeFormat, Intl.NumberFormat, Intl.RelativeTimeFormat) inside the processing thread of a row execution layout.
- Enforcement Rule: Declare localization formatting instances exactly once at the root module level or inside an isolated global composable initialization scope. Reuse the single constant instance across all evaluation passes.
```TypeScript 
// ✅ Correct execution layout inside target script module
const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

export function formatEuroAmount(value: number | null | undefined): string {
  if (value == null) return ''
  return currencyFormatter.format(value)
}
```

### Rule B: Deep Reactivity Isolation for Bulk Datasets
- Mandatory: For massive read-only collections or heavy payload extractions received directly from backend API structures, bypass recursive Proxy packaging by declaring target lists using shallowRef([]).
- Constraint: Only apply shallowRef configurations when the items are replaced entirely wholesale (e.g., rows.value = apiPayload). Mixing in-place array mutations with shallow records will drop change tracking.

## 4. Enforcement Checklist (System Blockades)
Do NOT complete a file execution block or check in structural adjustments if any of these condition parameters fail:
- [ ] A component method or mapping conversion helper is triggered per row inside a template context block.
- [ ] A v-for loop assigns array index coordinates (index, i) to the target :key token. Keys must be bound to stable business model primitive values (id, uuid).
- [ ] An active interface search model triggers synchronous database sweeps or recalculations directly from a raw input element hook without applying an isolated debounce timeout.
- [ ] Multiple conditional v-if statements and iteration loops (v-for) are declared directly within the exact same structural template element node. Wrap the layout with a virtual <template> block instead.

## 5. Output Verification Ledger
When structural loops or tabular refactoring passes are concluded, return an architectural performance summary using this presentation format:

```Markdown 
### 1. Loop Optimization Data Matrix
- **Component Context File**: `app/components/.../{Name}.vue`
- **Extracted Logic Sidecar**: `app/components/.../{Name}.utils.ts`

### 2. High-Priority Performance Checklist
- [ ] **O(1) Map Validation**: Confirmed zero inline functions are executed inside the template loop.
- [ ] **Reference Stability**: Verified all Pass-Through (`:pt`) attributes and class loops are bound to constant top-level names.
- [ ] **Constructor Cleanup**: Confirmed no instantiation variables (`new Set()`, `Array(n)`) exist within template expressions.
- [ ] **Formatters Cache**: Verified all `Intl.*` formatting elements are isolated at the module/composable root boundary.

### 3. Collection Telemetry Metrics
- **Dataset Storage Layout**: [State whether ref() or shallowRef() model constraints were implemented]
- **Key Strategy Mapping**: [Detail the structural source primitive utilized to generate unique loop :key parameters]
```