# Complexity Heuristics — Simple vs Detailed Documentation

Used by the `document-backend-code` skill to decide whether a use case deserves
a **summary row** (🟢 simple) or a **full detailed section** (🔴 complex).

---

## Classification criteria

Score each use case using the table below. Sum the points.

| Criterion | Score |
|-----------|-------|
| Number of outbound port dependencies ≥ 4 | +2 |
| Number of outbound port dependencies = 3 | +1 |
| Calls into ≥ 2 different domains (cross-domain) | +2 |
| Calls into 1 other domain (cross-domain) | +1 |
| Contains ≥ 2 domain-level operations (e.g., entity.create() + aggregate.addX()) | +2 |
| Distinct error cases ≥ 6 | +2 |
| Distinct error cases between 3 and 5 | +1 |
| Uses optimistic locking (version check, ConcurrentModification) | +1 |
| Aggregate method has multi-error accumulation (returns `List<DomainError>`) | +1 |
| Contains explicit ⚠️ race condition or ordering constraint | +1 |

**Threshold:**
- **Score ≤ 2** → 🟢 Simple — summary row in table
- **Score 3–4** → 🟡 Medium — summary row + bullet list of non-obvious rules
- **Score ≥ 5** → 🔴 Complex — full section with sequence diagram + business rules table

---

## Worked examples

### `ListWorkflowsApplicationService` — Score: 1 → 🟢 Simple
| Criterion | Score |
|-----------|-------|
| 1 port dependency (WorkflowRepositoryPort) | 0 |
| No cross-domain call | 0 |
| 1 repository operation | 0 |
| 2 error cases (InsufficientPermissions, pagination) | 1 |
| No optimistic lock | 0 |
| **Total** | **1** |

→ One row in summary table is sufficient.

---

### `CreateCustomFieldApplicationService` — Score: 9 → 🔴 Complex
| Criterion | Score |
|-----------|-------|
| 4 port dependencies (WorkflowRepo, StandardFieldRepo, UserWorkflowPort, TimeProvider) | +2 |
| 2 cross-domain calls (user domain for permissions, standard field repo) | +2 |
| 2 domain-level operations (CustomField.create + workflow.addCustomField) | +2 |
| 7 distinct error cases | +2 |
| Uses save with ConcurrentModification risk | +1 |
| **Total** | **9** |

→ Full section with sequence diagram and per-step business rules table.

---

### `PublishWorkflowApplicationService` — Score: 4 → 🟡 Medium
| Criterion | Score |
|-----------|-------|
| 3 dependencies (WorkflowRepo, UserWorkflowPort, TimeProvider) | +1 |
| 1 cross-domain call (user) | +1 |
| 1 domain operation (workflow.publish()) | 0 |
| Multi-error accumulation in domain (List<DomainError>) | +1 |
| 4 distinct error cases | +1 |
| **Total** | **4** |

→ Summary row + dedicated sub-section for the `publish()` multi-error validation logic.

---

## Aggregate method complexity

Apply similar logic to domain methods when deciding detail level in the **Domain Model** section.

| Criterion | Include detail |
|-----------|---------------|
| Method has ≤ 1 validation condition | No — just a summary |
| Method returns `List<DomainError>` (error accumulation) | Yes — list all conditions |
| Method has ≥ 3 distinct `if` / guard conditions | Yes — table with condition → error |
| Method emits domain events | Yes — list events emitted |
| Method changes aggregate status | Yes — include in state machine diagram |

---

## Configuring thresholds for another project

If the target project has different conventions, thresholds can be adjusted:

```yaml
# In a hypothetical .github/agents/code-document-config.yml
complexity:
  simple_threshold: 2    # score <= this → simple
  medium_threshold: 4    # score <= this → medium
  port_threshold: 3      # >= this many ports → adds score
  error_threshold: 5     # >= this many error cases → adds score
```

If no config file is present, use the defaults above.
