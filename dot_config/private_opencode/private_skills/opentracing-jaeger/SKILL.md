---
name: opentracing-jaeger
description: |
  OpenTracing/Jaeger conventions for backend observability. Covers span boundaries, @Traced placement, propagation, and trace naming for service/resource/job flows. Use when instrumenting or reviewing tracing.
---

# OpenTracing + Jaeger

## When to Use This Skill

- Instrumenting new request flows
- Adding tracing for async/background processing
- Reviewing trace quality and naming consistency

---

## Span Boundary Rules

- Start spans at API boundaries (resource/controller entry)
- Add spans around service orchestration and outbound IO
- Do not create excessive nested spans for trivial methods
- Keep names operation-oriented and stable over time

Suggested naming:

- `resource.createJury`
- `service.createJury`
- `repository.saveJury`
- `job.sendJuryNotification`

---

## @Traced Placement

Use `@Traced` on:

- entrypoint resource methods
- service methods orchestrating multiple steps
- async job handlers

Avoid annotation noise on pure mapping/getter utilities.

---

## Context Propagation

- Propagate trace context across service and async boundaries
- Preserve correlation ids in logs
- Ensure spawned jobs carry correlation metadata when relevant

---

## Error Signaling in Traces

- Mark failed spans with error tags
- Add error code/category tags (not sensitive payloads)
- Keep exception stack details in logs, not large trace tags

---

## Checklist

- Critical flows have at least resource + service span coverage
- Outbound calls and jobs are trace-linked
- Span names are consistent and searchable
- Error spans are visible for triage
