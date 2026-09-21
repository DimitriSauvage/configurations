---
name: semantic-release-conventional-commits
description: Conventional Commits rules and Semantic Release automation mapping for Beetween projects. Use when composing commit messages, configuring CI release pipelines, or validating version bumps and changelogs. Stack-agnostic.
---

# Semantic Release + Conventional Commits

Conventional Commits is a lightweight convention on top of commit messages that provides an easy set of rules for creating an explicit commit history, which **semantic-release** uses to determine the next version number and generate changelogs. See [conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/).

## Commit Message Grammar

```
<type>(<scope>)!: <short summary>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

### Allowed Types

| Type | Usage |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `perf` | A performance improvement |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `docs` | Documentation only |
| `test` | Adding or correcting tests |
| `build` | Build system or external dependencies (npm, gradle, docker) |
| `ci` | CI/CD configuration and scripts |
| `chore` | Maintenance tasks, scaffolding, tooling |
| `style` | Formatting, whitespace (not CSS/styling) |
| `revert` | Reverts a previous commit |

### Structure Notes

- `<scope>` is optional but encouraged — use the module or package name (e.g. `weasel-ui`, `nuxt-orval`, `recval-api`).
- `!` after the type or scope (e.g. `feat!:` or `feat(api)!:`) marks a **BREAKING CHANGE**.
- Footer tokens: `BREAKING CHANGE:`, `Refs:`, `Closes:`.

## Subject Rules

- Imperative mood ("add", not "added" or "adds").
- ≤ 72 characters.
- No trailing period.
- Lowercase first letter (Beetween convention).

## Semantic Release Mapping

semantic-release parses the commit type to determine the release bump. See [semantic-release.gitbook.io](https://semantic-release.gitbook.io/semantic-release/).

| Pattern | Release Bump |
|---|---|
| `feat` | MINOR |
| `fix`, `perf` | PATCH |
| `!` after type/scope or `BREAKING CHANGE:` in footer | MAJOR |
| `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `style`, `revert` | No release |

## Beetween Conventions

- **One logical change per commit.** A refactor commit does not bundle feature work.
- **Bug-fix commits never include unrelated refactors.** If a fix needs refactoring, do it in a separate `refactor` commit first.
- **Ticket references** go in the footer: `Refs: BTW-1234`.
- **Monorepo scopes** name the affected package: `feat(nuxt-orval): add query key factory`.

## Examples

### Good Commits

```
feat(weasel-ui): add candidate status dropdown
```

```
fix(recval-api): handle null score in evaluation endpoint

Refs: BTW-4012
```

```
perf(notifications): cache template lookups
```

```
refactor: extract salary range value object
```

```
feat(weasel-ui)!: redesign assessment card layout

BREAKING CHANGE: AssessmentCard props have changed from `score` to `result`.
```

```
docs: document WebSocket event contract
```

### Bad Commits

```
Added new feature and fixed some bugs
```
→ Mixed concerns, not imperative, no type.

```
fix: fixed the thing that was broken and also refactored the module
```
→ Bug fix + refactor in same commit. Also "fixed" is not imperative ("fix").

```
feat(weasel-ui):     add trailing whitespace
```
→ Extra spaces before body. Subject should not have trailing whitespace.

```
feat: this is a very long subject that goes way beyond the seventy-two character limit and will be truncated by git and is hard to read
```
→ Exceeds 72 characters.

## Quick Reference

```
type      │ bump     │ example
──────────┼──────────┼─────────────────────────────
feat      │ MINOR    │ feat(weasel-ui): add filter bar
fix       │ PATCH    │ fix: handle empty response
perf      │ PATCH    │ perf: memoize selector
!         │ MAJOR    │ feat!: drop v1 endpoints
──────────┼──────────┼─────────────────────────────
others    │ no bump  │ chore: bump lodash
```

**Grammar:** `<type>(<scope>)!: <imperative summary (≤72 chars, no period)>`

## References

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Semantic Release docs](https://semantic-release.gitbook.io/semantic-release/)
