# Frontend Complexity Heuristics — Simple vs Detailed Documentation

Used by the `document-frontend-code` skill to decide whether a Vue component or composable deserves
a **summary row** (🟢 simple) or a **full detailed section** (🔴 complex).

---

## Component classification criteria

Score each component using the table below. Sum the points.

| Criterion | Score |
|-----------|-------|
| Props count ≥ 8 | +2 |
| Props count between 4 and 7 | +1 |
| Emits count ≥ 3 | +1 |
| Exposes ≥ 1 named slot | +1 |
| Uses ≥ 3 composables | +2 |
| Uses between 1 and 2 composables | +1 |
| Has ≥ 3 distinct interaction states (loading/empty/error/success/partial) | +2 |
| Has 2 distinct interaction states | +1 |
| Contains ≥ 2 computed properties with cross-dependencies | +1 |
| Has watchers (`watch`, `watchEffect`) | +1 |
| Makes async API calls directly (not via composable) | +1 |
| Renders a dynamic list with row-level actions | +1 |
| Reads from or writes to ≥ 2 different Pinia stores | +1 |

**Threshold:**
- **Score ≤ 2** → 🟢 Simple — summary row in table
- **Score 3–4** → 🟡 Medium — summary row + non-obvious rules sub-section
- **Score ≥ 5** → 🔴 Complex — full section with state diagram + props/emits tables

---

## Worked examples

### `AppButton.vue` — Score: 1 → 🟢 Simple
| Criterion | Score |
|-----------|-------|
| 3 props (label, loading, disabled) | 0 |
| 1 emit (click) | 0 |
| 1 interaction state (loading) | 1 |
| No composables, no watchers | 0 |
| **Total** | **1** |

→ One row in summary table is sufficient.

---

### `WorkflowDataTable.vue` — Score: 7 → 🔴 Complex
| Criterion | Score |
|-----------|-------|
| 6 props (items, loading, pagination, filters, groupId, readonly) | +1 |
| 4 emits (select, delete, archive, filter-change) | +1 |
| 3 composables (useWorkflows, usePermissions, useConfirmDialog) | +2 |
| 3 interaction states (loading skeleton, empty illustration, error retry) | +2 |
| Dynamic list with row-level delete and archive actions | +1 |
| **Total** | **7** |

→ Full section with state diagram and props/emits tables.

---

### `FilterBar.vue` — Score: 4 → 🟡 Medium
| Criterion | Score |
|-----------|-------|
| 5 props (filters, options, loading, disabled, compact) | +1 |
| 2 composables (useFilterOptions, useDebounce) | +1 |
| 2 computed properties (activeCount, hasActiveFilters) | +1 |
| 1 watcher (on filters change → debounced emit) | +1 |
| **Total** | **4** |

→ Summary row + sub-section for the debounced emit behavior and `reset` side effect.

---

## Composable classification criteria

| Criterion | Score |
|-----------|-------|
| Parameters count ≥ 3 | +1 |
| Returns ≥ 5 distinct values | +1 |
| Has side effects (watcher, store write, localStorage, `onMounted`) | +1 |
| Makes async API calls | +1 |
| Returns both `error` and `isLoading` states | +1 |
| Composes ≥ 2 other composables internally | +1 |

**Threshold:** Score ≤ 1 → simple API row in summary table. Score ≥ 2 → dedicated section with full detail.

---

## Pinia store classification

| Criterion | Detail level |
|-----------|-------------|
| ≤ 3 state fields, ≤ 2 actions, no getters | Summary row only |
| ≥ 4 state fields OR ≥ 3 actions | Full state/actions/getters tables |
| Getters have non-trivial computation (filter, reduce, cross-field derivation) | Add getter logic description |
| Async actions with error handling | Add error states column to actions table |
| Action calls another store's action | Add dependency note under that action |

---

## Configuring thresholds for another project

If the team prefers different verbosity, thresholds can be adjusted in a hypothetical config:

```yaml
# .github/skills/frontend-doc-config.yml
complexity:
  simple_threshold: 2    # score <= this → simple summary row
  medium_threshold: 4    # score <= this → medium (summary + rules)
  props_threshold: 4     # >= this many props → adds +1
  composables_threshold: 3  # >= this many composables → adds +2
```

If no config file is present, use the defaults above.
