---
name: backend-task-decomposition-kotlin
description: |
  Kotlin/Spring Boot selector for backend task decomposition. Detects Kotlin hexagonal architecture contexts and applies the shared decomposition process with Beetween conventions from Kotlin backend skills. Use for Kotlin, Spring Boot, and hexagonal architecture backend features.
---

# Backend Task Decomposition - Kotlin Selector

## When to Use This Skill

- The service is Kotlin + Spring Boot
- The feature follows Beetween hexagonal architecture
- You need an ordered implementation plan before coding

---

## Routing

1. Use `backend-task-decomposition-core` for process
2. Use the following skills for technical rules:

- `clean-architecture`
- `kotlin-best-practices`
- `spring-boot-hexagonal`
- `error-handling`
- `postgresql-jpa`
- `mongodb-spring`
- `architecture-testing`
- `unit-testing`
- `integration-testing`

---

## Stack Detection Hints

Treat the context as Kotlin selector when you see:

- `build.gradle.kts` or Kotlin JVM modules
- Spring Boot annotations (`@Service`, `@RestController`, `@Configuration`)
- `Result<V, E>` / kotlin-result pipelines
- `domain/`, `application/`, `adapter/` packaging

---

## Kotlin-Specific Planning Requirements

- Keep domain/application free of framework imports
- Enforce `DomainError -> UseCaseError` mapping path
- Plan persistence adapters before REST adapter tasks
- Include ArchUnit update tasks when introducing new naming patterns
- Include unit and integration test tasks for each changed use case

---

## Output Additions

In each task, include Kotlin-specific precision:

- package path
- class/interface name
- function signature
- `Result` failure type
- mapper responsibility (domain <-> persistence <-> DTO)

Add one section at the end:

```md
## Kotlin Consistency Checks

- Layer boundaries respected
- Error mapping exhaustive
- ArchUnit rules updated if needed
- Persistence strategy (PostgreSQL or MongoDB) explicit
```
