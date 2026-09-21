---
name: security-owasp-baseline
description: OWASP baseline rules for secure coding. Stack-agnostic. Imported by frontend/backend security skills.
---

# OWASP Security Baseline

Stack-agnostic security rules derived from OWASP sources. Agents MUST follow these when writing or reviewing code. Frontend and backend plugins layer stack-specific rules on top.

## Source of Truth

Three OWASP authority docs form this skill's foundation:

| Doc | URL |
|---|---|
| ASVS v5.0 | https://owasp.org/www-project-application-security-verification-standard/ |
| Top 10 (2021) | https://owasp.org/Top10/ |
| Cheat Sheet Series | https://cheatsheetseries.owasp.org/ |

## OWASP Top 10 (2021) — Agent Checklist

Each entry: 1-line rule + 1-line check instruction.

### A01 Broken Access Control

- Rule: Enforce authorization on every server-side endpoint. Client-side hiding is not access control.
- Check: Does every API/protected route verify the caller's permission before acting?

### A02 Cryptographic Failures

- Rule: Encrypt sensitive data at rest and in transit. Use modern algorithms only.
- Check: Are passwords hashed (bcrypt/Argon2)? Is TLS 1.2+ enforced? Are PII fields encrypted in the DB?

### A03 Injection (SQL, NoSQL, OS, LDAP, XSS as injection)

- Rule: Never concatenate user input into interpreters. Use parameterized queries, safe APIs, or context-aware escaping.
- Check: Are all query/command-building paths using parameterized inputs or an allowed ORM?

### A04 Insecure Design

- Rule: Security must be designed in, not bolted on. Rate-limit, throttle, and validate at the architecture level.
- Check: Are rate limits missing on auth/OTP endpoints? Could an attacker enumerate valid user IDs?

### A05 Security Misconfiguration

- Rule: Lock down defaults. Disable debug/verbose error pages in production. Remove unused features/routes.
- Check: Are HTTP security headers set (CSP, HSTS, X-Frame-Options)? Are default credentials changed?

### A06 Vulnerable & Outdated Components

- Rule: Keep dependencies current. Scan regularly. A pinned version with a known CVE is a finding.
- Check: Is there a dependency scanner in CI (npm audit, Trivy, Snyk)? Are pinned deps older than 1 year reviewed?

### A07 Identification & Auth Failures

- Rule: Use multi-factor, enforce password policies, prevent credential stuffing (rate-limit, lockout, CAPTCHA).
- Check: Are sessions secure (expiry, rotation, secure cookie flags)? Is MFA available?

### A08 Software & Data Integrity Failures

- Rule: Verify integrity of updates, pipelines, and serialized data. Sign artifacts. Commit lockfiles.
- Check: Are CI/CD pipelines signed? Are package lockfiles committed? Is deserialization of untrusted data safe?

### A09 Security Logging & Monitoring Failures

- Rule: Log auth events, access denials, and input validation failures. Never log secrets or PII.
- Check: Do auth failures produce logs? Are they shipped to monitoring? Are alert thresholds defined?

### A10 Server-Side Request Forgery (SSRF)

- Rule: Never fetch user-supplied URLs without an allow-list. Validate scheme, host, and port against known-safe values.
- Check: Does any endpoint accept a URL for server-side fetching? Is there an allow-list?

## Hard Rules (Never Violate)

- Never log tokens, passwords, session IDs, candidate PII, or secrets.
- Never rely on client-only authorization — enforce server-side.
- Never disable TLS/HTTPS verification in code.
- Never insert user input into HTML, SQL, shell, or template contexts without context-appropriate escaping.
- Never commit secrets — use environment variables or a secret manager.
- Never use deprecated crypto: MD5, SHA-1 (for security), ECB mode, DES, RC4.
- Never trust client-supplied URLs for server-side HTTP fetches without a host/scheme allow-list (SSRF).
- Never accept JSON Web Tokens without verifying the signature AND `iss`/`aud` claims.

## Mandatory Hygiene

- **Dependency scanning** — Run automated CVE scanning (npm audit, Trivy, Snyk) in CI; fail on critical/High.
- **Secret scanning** — Scan commits and PRs for hardcoded secrets (git-secrets, TruffleHog, etc.).
- **Least privilege** — Every function, service account, and API key gets minimum permissions.
- **Default deny** — Deny access by default; grant explicitly per-role, per-user.
- **HTTPS everywhere** — All API traffic must use TLS 1.2+; redirect HTTP to HTTPS.
- **Secure cookies** — Set `Secure; HttpOnly; SameSite=Lax|Strict` on session/auth cookies.
- **Input validation at boundary** — Validate type, length, range, and format on every API boundary.
- **Output encoding at sink** — Encode data for its destination context (HTML entity, URL, JSON, SQL parameter).

## Stack-Specific Delegation

This skill is stack-agnostic. Agents applying it to a specific tech stack MUST combine with the relevant plugin skill:

| Context | Plugin / Skill |
|---|---|
| Vue/PrimeVue/Nuxt frontend | `security-frontend-baseline` (frontend plugin) — v-html, XSS in templates, CSP for inline styles |
| Spring Boot / Kotlin backend | Stack-specific backend skill — Spring Security, CSRF, method-security annotations |
| Java EE / WildFly backend | Stack-specific backend skill — JAX-RS security, EJB role annotations, Keycloak integration |
| Async/background jobs | `jobrunr-async` skill — idempotency keys, retry budgets |

## References

- OWASP ASVS v5.0: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Top 10 (2021): https://owasp.org/Top10/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
- OWASP Top 10 Cheat Sheets: https://cheatsheetseries.owasp.org/IndexTopTen.html
