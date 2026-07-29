---
name: security-frontend-baseline
description: 'Beetween Nuxt 4 SPA browser-side security baseline: token storage, v-html policy, URL validation, CSP, headers, form discipline.'
---

# Beetween Frontend Security Baseline

Scope: Nuxt 4 SPA (CSR). Browser-side only. Backend/transport → `security-owasp`.

---

## Token Storage

| Asset | Location | Rationale |
|---|---|---|
| Access token (JWT) | In-memory only (composable state in `@beetween/nuxt-auth`) | Survives tab session only; no XSS exfil via localStorage |
| Refresh token | HttpOnly cookie set by IAM | Never reachable from JS |
| User profile | In-memory cache | Refetch on reload |

NEVER `localStorage`. NEVER `sessionStorage`. NEVER non-HttpOnly cookies.

IAM token mechanics → defer to `iam-oidc-setup`.

---

## `v-html` Policy

Hard rule: **NEVER raw `v-html`** in component templates.

| Use case | Required |
|---|---|
| Template rendering | `v-safe-html` directive from `@beetween/design-system-ui` |
| Programmatic | `useSafeHtml()` composable from DS |

**Allow-list:**
- Tags: `<p>` `<strong>` `<em>` `<a>` `<ul>` `<ol>` `<li>` `<br>` `<span>` `<div>`
- Attrs: `href` (URL-validated `https:` or `mailto:`), `class` (allow-listed Tailwind tokens), `aria-*`

Sanitizer config + extension points → DS skill `safe-html-implementation`.

**Exception:** `jury-ui/app/utils/emailTemplate.ts` has `sanitizeEmailHtml` — migrate to `useSafeHtml()` (tracked separately).

---

## URL Validation

For every user-supplied link:

| Scheme | Allowed? |
|---|---|
| `https:` | YES |
| `mailto:` | YES |
| `tel:` | YES |
| `http:` | NO — force upgrade to `https:` |
| `javascript:` | NEVER |
| `data:` | NEVER in `<a>`; allowed in `<img src>` for base64 PNG/JPG/SVG/WEBP only |

Helper: `app/utils/safe-url.ts` returns `string | null`. Template falls back to non-link if null.

```ts
// app/utils/safe-url.ts
export function safeUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (['https:', 'mailto:', 'tel:'].includes(url.protocol)) return url.href
    return null
  } catch {
    return null
  }
}
```

---

## Content Security Policy

Set at reverse proxy / static host — NOT in Nuxt (static SPA, no server runtime).

| Directive | Value |
|---|---|
| `default-src` | `'self'` |
| `script-src` | `'self'` — NO `unsafe-inline`, NO `unsafe-eval`; use `nonce-` or hash for inline |
| `style-src` | `'self' 'unsafe-inline'` (Tailwind injected styles) |
| `img-src` | `'self' data: https:` |
| `font-src` | `'self' data:` |
| `connect-src` | `'self' https://<api-host> https://<iam-host>` |
| `frame-ancestors` | `'none'` |
| `base-uri` | `'self'` |
| `form-action` | `'self' https://<iam-host>` |
| `object-src` | `'none'` |
| `upgrade-insecure-requests` | (present) |

CSP directive config lives at infra level; this skill names required directives.

---

## Other Security Headers

Set by host (reverse proxy / CDN):

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

---

## External Links

`<a target="_blank">` MUST include `rel="noopener noreferrer"`.

- DS `Link` component enforces automatically.
- Raw `<a>` anchors: add manually, always.

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">...</a>
```

---

## Form & Mutation Discipline

- Trust nothing from user input. Sanitize via `useSafeHtml()` before rendering rich text.
- File uploads: validate MIME + extension client-side AND server-side (server is authoritative).
- Never log JWT / PII to console. Redact in dev tooling.

---

## Dev-Tool & Build Hygiene

- `console.log` of tokens, PII, request bodies → blocked by ESLint rule:
  `no-console: ['warn', { allow: ['warn', 'error'] }]` (from `beetween-eslint-prettier-shared-config`)
- Source maps: enabled in dev, **DISABLED** in production builds (or uploaded to private error tracking only).
- `npm audit` in CI; high/critical severity blocks PR merge.
- Renovate / Dependabot for dependency updates.

---

## Anti-Patterns

| Anti-pattern | Why |
|---|---|
| Tokens in `localStorage` / `sessionStorage` | XSS can exfil |
| Raw `v-html` | Bypasses sanitizer |
| `innerHTML` assignment | Same as `v-html` |
| Untrusted URL into `<a href>` | `javascript:` injection |
| Missing `rel="noopener"` on `target="_blank"` | Tab-napping |
| Inline scripts without nonce / hash | Weakens CSP |
| `eval()` / `Function()` | XSS vector |
| Source maps published publicly | Exposes business logic |
| Logging PII | Privacy + compliance |
| `unsafe-inline` in `script-src` | Nullifies CSP |

---

## Cross-Reference

- `iam-oidc-setup` — token lifecycle, silent refresh
- `i18n-nuxt-translation-usage` — safe rendering of translated rich text
- `tanstack-query-error-handling` — mutation error discipline
- `nuxt-orval-runtime` — generated API client security headers
- `security-owasp` (cross-cutting plugin) — backend + transport rules
- DS skill `safe-html-implementation` — sanitizer config + extension points
