---
name: jobrunr-async
description: |
  JobRunr conventions for asynchronous and scheduled processing in backend services. Covers job boundaries, idempotency, retry strategy, failure handling, and observability expectations for background execution. Use when adding or modifying async processing flows.
---

# JobRunr Async Processing

## When to Use This Skill

- Introducing background processing for heavy side effects
- Scheduling recurring backend jobs
- Making asynchronous workflows reliable and observable

---

## Job Design Rules

- Keep job handlers small and single-purpose
- Pass stable identifiers, not large mutable payloads
- Re-load authoritative data inside the job
- Make jobs idempotent by design

Idempotency strategies:

- deduplication key per business event
- status transitions with guard clauses
- upsert-style persistence for retry-safe updates

---

## Retry and Failure Strategy

- Distinguish transient vs permanent failures
- Retry transient failures with bounded attempts
- Route permanent failures to explicit dead-letter/remediation flow
- Include enough metadata to replay safely

---

## Transaction and Consistency

- Avoid long-running transactions inside jobs
- Persist state transitions explicitly between steps
- Ensure side effects are either retry-safe or compensatable

---

## Observability

For each job type, track at least:

- enqueue count
- success/failure count
- median/95th percentile duration
- retry count

Log with correlation identifiers and job ids for debugging.

---

## Checklist

- Job input contract stable
- Handler idempotent
- Retry policy explicit
- Failure remediation path defined
- Metrics and logs wired
