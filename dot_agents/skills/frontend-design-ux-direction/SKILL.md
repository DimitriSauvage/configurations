---
name: design-ux-direction
description: Produce a UX direction doc (user flow, component map, state matrix, a11y) before coding any interactive frontend feature. Use for UX writing, functional specs, and Beetween-specific patterns.
---

# Design UX Direction

## Purpose

Before writing a single line of implementation, produce a short UX direction doc. Inputs: PRD / ticket / spec. Outputs: user-flow diagram (text or Mermaid), layout sketch, component map, state matrix, a11y notes, key decisions + rationale. Skipping this step causes rework.

Load References: [DESIGN.MD](references/DESIGN.md) — Full design tokens and 11 ⭐ component visual specs (source of truth)
---

## When to Run

- Any visible feature with interaction complexity (table, form, modal, wizard, async data).
- Before `analyze-feature-architecture` and before any component creation.
- UX writing: CTAs, empty states, error messages, toast content, confirmation dialogs.
- Beetween-specific: DAR validation flow, pipeline candidats, jury grid, analytics dashboards.

---

## Beetween Product Context

### User Profiles

| Profile | Frequency | Key Needs |
|---------|-----------|-----------|
| **Chargé(e) de recrutement** | Daily | Pipeline candidats, DAR, entretiens, high volume |
| **Manager / Jury** | Occasional | Profile consultation, jury opinion, simplicity |
| **Responsable RH / DRH** | Strategic | Supervision, DAR validation, analytics |
| **Administrateur RH** | Rare | Validation circuits, SLA, IAM, RGPD |

**Constraints**: Desktop-first · French only · RGPD · Equal treatment · Mandatory traceability · Dense interfaces (hundreds of applications)

### Key Modules

| Module | Description |
|--------|-------------|
| **DAR** | Multi-level validation workflow, SLA, delegation, RGPD opt-in |
| **Pipeline candidats** | Kanban/list, statuses, filters, mass actions — `ats-table-card` pattern |
| **CVthèque** | Profile database, AI search, matching |
| **Jury d'entretien** | Collaborative grid, opinions, collegial decision, ProgressBar progression |
| **Analytics** | HR dashboards, delays, conversion rates, sourcing |
| **IAM** | Roles, delegations, organizational perimeters |

---

## Component Selection Ladder

See `primevue-component-usage` for full constraints — do NOT duplicate here. Order of preference:

1. `@beetween/design-system-ui` (DS) — always check catalog first.
2. PrimeVue bare component — if DS has no equivalent.
3. PrimeVue + PassThrough — only when DS preset is insufficient; document why.
4. App one-off — single-use, stays in feature folder, never promoted without DS review.
5. New DS proposal — file via `scaffold-design-system-component` (cross-repo: `design-system-ui`).

Never skip rungs. If stuck at rung 3+, flag it in **Decisions & rationale**.

---

## Modal Decomposition Pattern

Multi-step or form modals must be split into three pieces:

| Piece | Location | Responsibility |
|---|---|---|
| Trigger component | feature folder | Emits open event — owns nothing else |
| Modal SFC | `<name>-modal/` (Rule E, `structure-components`) | Wraps DS `Modal`; no inline logic |
| Form / state composable | `<name>-modal.<purpose>.ts` | All state, validation, submission |

Parent owns visibility (`v-model:visible`). Logic NEVER inline in template. Composable is independently testable.

---

## State Matrix Template

| State | UI | A11y notes | Source of truth |
|---|---|---|---|
| Loading | DS `Loader` or skeleton | `aria-busy="true"` on region | TanStack Query `isPending` |
| Empty | DS `EmptyState` | Descriptive heading, no decorative text | `data.length === 0` |
| Error | DS `Banner` severity=error | `role="alert"` — polite, not assertive | TanStack Query `isError` + classified error |
| Success | Rendered content | — | TanStack Query `isSuccess` |
| Partial / refetching | Content + subtle indicator | `aria-busy="true"` on indicator | `isFetching && !isPending` |

All five states must appear in the direction doc. Missing states = incomplete doc.

---

## A11y Check Before Coding

Run this checklist mentally before writing the direction doc:

- **Landmark plan**: which `<main>`, `<nav>`, `<section aria-labelledby>` are needed?
- **Heading order**: `h1` → `h2` → `h3` — no skips, no visual-only headings.
- **Focus order**: logical, matches visual reading order; modal traps focus inside.
- **Color-only state**: forbidden — always pair color with icon or text label.
- **Keyboard walkthrough**: mentally tab through every interactive element.

Defer full ARIA patterns and WCAG rules to `enforce-a11y`.

---

## Token Discipline

Use only semantic alias tokens from the DS — never propose raw hex or hardcoded colors. If a required token is absent, file a gap in `design-system-tokens-source-of-truth` (cross-repo: `design-system-ui`). Do NOT work around with `style=""` or arbitrary Tailwind `[#hex]` values.

---

## Cross-Repo References

These skills live in `design-system-ui/.github/skills/` — reference by name only:

| Skill name | When to reference |
|---|---|
| `ui-beetween-design-system` | DS component catalog overview |
| `design-system-tokens-source-of-truth` | Token gaps, semantic alias map |
| `scaffold-design-system-component` | Proposing a new DS component (rung 5) |
| `safe-html-implementation` | Rich text / v-html sanitization |
| `runtime-preset-color-overrides` | Per-tenant color theming |

---

## Beetween UX Rules

### Components — Usage Rules

**SelectButton (Panel Tabbar)** — default component for all tab systems in panels. Always one active tab (never "none selected"). Default = most general ("Tous") or most visited ("En cours").

Validated usages: `Tous / Planifié / En cours / Terminé` · `Liste / Grille / Kanban` · `Infos / Candidats / Documents`

**Never use `<Tabs>` PrimeVue for view filters** — use SelectButton.

**Paginator custom** — use `.bwc-pagination` footer only. Never reference native PrimeVue Paginator in specs.

### Button Hierarchy

| Level | Style | Usage | Example |
|-------|-------|-------|---------|
| **Primary** | Navy `#06375a` | 1 main action per zone | "Nouvelle DAR", "+ Nouveau", "Valider" |
| **IA** | Teal `#4ECDC4` | AI search button only | "+ Recherche IA" |
| **Secondary** | Outlined navy | Secondary actions (max 2–3) | "Modifier", "Exporter" |
| **Danger** | Outlined red | Destructive (always separated) | "Archiver", "Supprimer" |

**Rule**: one primary action visible per action zone. "Importer CVs" is **secondary** (support action).

### Layout — Visual Separation Without Borders

- `aside.sidebar` → **no `border-right`** — contrast `#fff` on `#f6f7f8`
- `header.slimbar` → **no `border-bottom`** — same principle

### Forms

- Labels **above** the field (never placeholder alone)
- Required fields: `*` in red with legend at form start
- Validation **onBlur** for format; global on submit
- Error messages **under the field**, cause + actionable remediation
- Unsaved data warning if user leaves modified form without saving
- Long forms (DAR multi-step): stepper with visible progress

### Critical Actions

- **Irreversible** (deletion, definitive rejection) → `ConfirmDialog` with precise consequence description
- **High-impact** (validate DAR, issue offer) → summary before submission
- **Bulk** → contextual action bar + confirmation if irreversible

### System Feedback (Toast)

Position top-right · 5s auto · manual close button

| Severity | Color | Persistence | Example |
|----------|-------|-------------|---------|
| Success | Green | 5s auto | "Candidat ajouté au pipeline Entretiens" |
| Error | Red | Until action | "Erreur réseau — vos modifications ont été sauvegardées" |
| Info | Blue | 5s auto | "Recherche IA en cours..." |
| Warning | Yellow | Until action | "SLA dépassé de 3 jours" |

### RGPD — Candidate Data

- Personal data collection → explicit opt-in before the form
- Sensitive data → candidate opt-in, visible only to authorized persons (IAM)
- Data export → automatic audit log
- Right to deletion → accessible from candidate profile, with confirmation + legal delay informed

### Accessibility (RGAA 4.1)

- Color-only content → text or icon equivalent (ex: status dot = color + label)
- Form errors → `aria-live="assertive"`
- Modals → focus trap until closed
- Keyboard focus order = logical visual order
- Hidden content (inactive tabs) → `aria-hidden="true"` or `display:none`

---

## UX Direction Deliverable Template

```
# <feature> — UX direction

## User flow
<!-- text or Mermaid diagram -->

## Layout
<!-- breakpoint sketch or description -->

## Component map
<!-- DS / PrimeVue / app one-off per UI block -->

## State matrix
<!-- table: State | UI | A11y notes | Source of truth -->

## A11y notes
<!-- landmark plan, heading order, focus order, keyboard walkthrough -->

## Decisions & rationale
<!-- why each non-obvious choice was made -->

## Open questions
<!-- blockers for design or product -->
```

---

## Anti-Patterns

| Pattern | Problem |
|---|---|
| Designing in code without a doc | Rework when states or flows are wrong |
| Ad-hoc colors / hex in template | Breaks theming, violates token discipline |
| Custom modal from scratch | Misses DS behavior, a11y, animation |
| Missing empty or error state | Blank screen or silent failure in prod |
| Color-only meaning (red = error) | Fails WCAG 1.4.1 / RGAA 4.1 |
| `<Tabs>` for view filters | Use SelectButton with `.btw-panel-tabbar` |
| `<Paginator>` native | Use `.bwc-pagination` custom footer |
| Premature DS component proposal | Exhausting the selection ladder is required first |
| Deferring a11y to "later" | Never lands; breaks WCAG/RGAA compliance |

---

## Cross-Links

In-repo: `primevue-component-usage`, `structure-components`, `enforce-a11y`, `tanstack-query-error-handling`, `style-tailwind`, `analyze-feature-architecture`.

Cross-repo (`design-system-ui`): `ui-beetween-design-system`, `design-system-tokens-source-of-truth`, `scaffold-design-system-component`, `safe-html-implementation`.


