---
name: keycloak-java-ee
description: |
  Keycloak security conventions for Java EE/WildFly services. Covers JWT claim extraction, role checks, realm/client mapping, and propagation of authenticated identity to service-layer decisions. Use when implementing authentication or authorization in Java EE APIs.
---

# Keycloak Security - Java EE

## When to Use This Skill

- Securing new JAX-RS endpoints
- Reading JWT claims in WildFly/Java EE context
- Implementing role-based access checks

---

## Security Model

- Authentication is handled by Keycloak/WildFly integration
- Resource layer enforces coarse role checks (`@RolesAllowed`)
- Service layer enforces business authorization rules
- Never trust user-controlled payload fields for identity/roles

---

## Claim Handling

- Extract only required claims (subject, tenant/company, roles)
- Normalize missing claims into explicit unauthorized/forbidden errors
- Keep claim-to-domain mapping in one reusable component

Common claim checks:

- subject/user id presence
- tenant/company scope
- required role for operation

---

## Authorization Patterns

- Endpoint guard: role required to enter operation
- Business guard: ownership/scope checks in service layer
- Deny by default when role/scope is ambiguous

---

## Error and Audit Expectations

- Return consistent unauthorized/forbidden API errors
- Log denied actions with correlation id and principal id
- Do not log full JWTs or sensitive claim payloads

---

## Checklist

- Role checks defined for every mutating endpoint
- Tenant/company boundary enforced for scoped resources
- Identity propagation into service methods is explicit
- Security failures mapped to deterministic API errors
