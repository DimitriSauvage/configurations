---
name: java-ee-architecture
description: |
  Java EE backend architecture conventions for WildFly services. Covers EJB service boundaries, CDI usage, layering and dependency direction, transaction ownership, and package organization. Use when designing or reviewing Java EE backend architecture.
---

# Java EE Architecture - WildFly

## When to Use This Skill

- Designing a new Java EE backend feature
- Deciding layer ownership for business logic
- Reviewing EJB/CDI boundaries and transaction ownership

---

## Layering

Recommended package split:

```text
feature/
  domain/         // business model and pure rules
  service/        // EJB application services
  resource/       // JAX-RS resources
  persistence/    // JPA entities, repositories/DAOs
  security/       // auth/role helpers
  config/         // CDI producers and bootstrapping
```

Rules:

- `resource` depends on `service`
- `service` depends on `domain` and `persistence`
- `domain` has no framework dependencies
- cross-feature direct persistence access is forbidden

---

## EJB Service Conventions

- Use `@Stateless` for request-scoped business operations
- Use `@Singleton` only for shared coordinator/stateful infrastructure concerns
- Keep JAX-RS resource classes thin; orchestration belongs in EJB services
- Define transaction boundaries at service methods

Transaction guidance:

- `REQUIRED` for standard write operations
- `REQUIRES_NEW` only for isolated side effects/audit writes
- `SUPPORTS` or read-only flows for non-mutating operations

---

## CDI Conventions

- Use constructor injection where possible; otherwise `@Inject` field injection consistently
- Use `@ApplicationScoped` for stateless shared helpers
- Use `@Produces` for third-party/client instances with centralized lifecycle control
- Avoid hidden coupling by keeping producer names explicit

---

## Architecture Review Checklist

- Layer dependencies are one-directional
- Transaction attributes are explicit on mutating operations
- Resources do not contain business logic
- Security checks happen before sensitive state changes
- Domain model remains framework-agnostic
