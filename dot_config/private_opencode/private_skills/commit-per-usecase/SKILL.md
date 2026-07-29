---
name: commit-per-usecase
description: 'Generates a conventional commit scoped to a single Service or UseCase. Enforces the one-commit-per-service/use-case rule: each commit covers exactly one Service and its directly related files (use-case port, command, response model, errors, tests).'
---

### Purpose

Enforce the **one-commit-per-service/use-case** rule.

Each commit must cover **exactly one** `Service` (and its directly related files):
- The `Service` implementation (`*Service.kt`)
- Its inbound port interface (`*UseCase.kt`)
- Its command / response model (`command/`, `application/model/`)
- Its use-case errors (`application/error/`)
- Its unit tests (`*ServiceTest.kt`)

Files that span multiple use cases (controllers, repository adapters, DTOs, domain models) are committed separately when they are complete.

---

### Workflow

1. Run `git status` to list all changed files.
2. Run `git diff` (or `git diff --cached`) to inspect the changes.
3. Identify which single `Service` (or `UseCase`) the staged changes belong to.
4. Stage **only** the files related to that one service/use case:
   ```bash
   git add <Service.kt> <UseCase.kt> <Command.kt> <Response.kt> <UseCaseError.kt> <ServiceTest.kt>
   ```
5. Build the commit message using the structure below.
6. Commit:
   ```bash
   git commit -m "type(scope): description"
   ```
7. Repeat for each remaining service/use case.

---

### Commit Message Structure

```
type(domain/service-name): short imperative description

[optional body: context, trade-offs, follow-ups]

[optional footer: BREAKING CHANGE, ticket ref]
```

#### Type
Use the Conventional Commits type that best describes the change:

| Type       | When to use                          |
|------------|--------------------------------------|
| `feat`     | New Service / UseCase     |
| `fix`      | Bug fix in an existing service       |
| `refactor` | Restructure without behaviour change |
| `test`     | Add or update tests only             |
| `chore`    | Rename, move, clean-up               |

#### Scope
Use the format `domain/service-name` in kebab-case, derived from the class name:

| Class                                  | Scope                          |
|-----------------------------------------|--------------------------------|
| `CreateMyEntityService`                 | `my-domain/create-my-entity`   |
| `BulkAssignItemService`                 | `my-domain/bulk-assign-item`   |
| `WithdrawParticipantService`            | `my-domain/withdraw-participant` |

#### Description
- Imperative mood, lowercase, no period.
- Describe **what the service does**, not what files were changed.

---

### Examples

Use the shared `semantic-release-conventional-commits` skill as a reference for formatting and content.

```
feat(my-domain): implement CreateMyEntityService with validation and conflict check

feat(my-domain): add WithdrawParticipantService and unit tests

fix(bulk-assign-item): handle overlapping range error case

refactor(my-domain): extract query validation into domain method

test(list-my-entities): add error path unit tests for ListMyEntitiesService
```

---

### Validation Checklist

Before committing, verify:
- [ ] Staged files belong to **one and only one** Service.
- [ ] Commit type reflects the nature of the change (`feat`, `fix`, `refactor`, `test`).
- [ ] Scope follows the `domain/service-name` pattern in kebab-case.
- [ ] Description is imperative, lowercase, and under 72 characters.
- [ ] Unit tests for the service are included in the same commit (unless it is a `test`-only commit).
