---
name: jaxrs-rest-api
description: |
  JAX-RS API conventions for Java EE backend services. Covers resource design, request/response DTO contracts, pagination, error envelopes, validation, and security annotations. Use when implementing or reviewing REST endpoints on WildFly.
---

# JAX-RS REST API - Java EE

## When to Use This Skill

- Adding new REST resources or endpoints
- Updating request/response contracts
- Aligning error responses and pagination behavior

---

## Resource Design

- Use noun-based `@Path` values and standard HTTP verbs
- Keep resources as transport adapters only
- Delegate business orchestration to EJB services
- Keep resource methods explicit about status codes

Example skeleton:

```java
@Path("/v1/juries")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class JuryResource {

    @Inject
    JuryService service;

    @POST
    @RolesAllowed({"jury:write"})
    public Response create(CreateJuryRequest request) {
        JuryResponse response = service.create(request);
        return Response.status(Response.Status.CREATED).entity(response).build();
    }
}
```

---

## DTO and Validation Rules

- DTOs are transport contracts, not domain entities
- Validate input close to transport boundary
- Prefer explicit field names; avoid leaking internal model names
- Keep backward compatibility when evolving response payloads

---

## Error Envelope

Return a consistent JSON shape:

```json
{
  "code": "JURY_NOT_FOUND",
  "message": "Jury not found",
  "status": 404,
  "path": "/v1/juries/123",
  "metadata": {}
}
```

Map exceptions with `ExceptionMapper` implementations and avoid ad-hoc error payloads in resources.

---

## Pagination Conventions

- Use `page` and `size` query params
- Validate bounds and defaults centrally
- Return metadata (`page`, `size`, `totalElements`, `totalPages`) when endpoint returns collections

---

## Security Rules

- Use `@RolesAllowed` for endpoint authorization
- Keep role checks close to boundary and business checks in service layer
- Do not expose security internals in API responses
