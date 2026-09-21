---
name: backend-task-decomposition-java-ee
description: |
  Java EE/WildFly selector for backend task decomposition. Detects Jakarta EE service contexts and applies the shared decomposition process with Java EE capability skills for EJB, JAX-RS, JPA, Liquibase, Keycloak security, async jobs, and tracing.
---

# Backend Task Decomposition - Java EE Selector

## When to Use This Skill

- The service runs on WildFly/Jakarta EE
- The feature uses EJB/JAX-RS/CDI patterns
- You need an ordered implementation plan before coding

---

## Routing

1. Use `backend-task-decomposition-core` for process
2. Use the following skills for technical rules:

- `java-ee-architecture`
- `java-ee-persistence-liquibase`
- `jaxrs-rest-api`
- `keycloak-java-ee`
- `jobrunr-async`
- `opentracing-jaeger`

---

## Stack Detection Hints

Treat the context as Java EE selector when you see:

- WildFly deployment descriptors or Jakarta EE modules
- EJB annotations (`@Stateless`, `@Singleton`)
- JAX-RS annotations (`@Path`, `@GET`, `@POST`)
- CDI annotations (`@Inject`, `@ApplicationScoped`, `@Produces`)

---

## Java EE-Specific Planning Requirements

- Plan Liquibase and JPA model tasks before service and resource tasks
- Explicitly define transaction boundary ownership per service operation
- Include exception-to-HTTP mapping tasks for new error paths
- Include security tasks whenever endpoint behavior changes
- Add tracing and background-job tasks when side effects are async

---

## Output Additions

In each task, include Java EE-specific precision:

- package/class names
- EJB transaction attribute decisions
- JPA relationship strategy and locking decisions
- JAX-RS method contract and response envelope
- security role constraints

Add one section at the end:

```md
## Java EE Consistency Checks

- Transaction boundaries explicit
- Liquibase and JPA changes aligned
- Security/roles validated for new endpoints
- Tracing covers critical service/resource hops
```
