---
name: iam-oidc-setup
description: Configure Beetween IAM OIDC auth in Nuxt 4 SPA via @beetween/nuxt-auth — PKCE flow, in-memory tokens, route protection, impersonation.
---

# Beetween IAM — OIDC Setup

## Foundation

Beetween apps use **Beetween IAM** (OIDC-compliant). NEVER reference Keycloak-specific endpoints or APIs.
Auth module: `@beetween/nuxt-auth`. No other auth library.

---

## Module Install

```bash
npm install @beetween/nuxt-auth
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@beetween/nuxt-auth'],
})
```

---

## Runtime Config

> Cross-link: `runtime-config-static-spa`

IAM coordinates come from `public/config.json` loaded at runtime — **NOT baked at build time**.

```ts
// nuxt.config.ts
runtimeConfig: {
  public: {
    iam: {
      issuer: '',
      clientId: '',
      redirectUri: '',
      postLogoutRedirectUri: '',
      scopes: '',
    },
  },
},
```

Never hardcode IAM URLs. Never bake config at build.

---

## PKCE Flow

Authorization Code + PKCE is mandatory.

| Rule | Detail |
|---|---|
| Flow | Authorization Code + PKCE |
| Implicit flow | ❌ FORBIDDEN |
| Token endpoint | Called server-side by module — never from component |

---

## Token Storage

| Storage | Rule |
|---|---|
| In-memory | ✅ Only valid location |
| localStorage | ❌ FORBIDDEN |
| Persistent cookies | ❌ FORBIDDEN |
| sessionStorage | ❌ FORBIDDEN |

Silent renew via hidden iframe or in-memory refresh token. Reload triggers re-auth via silent prompt (`prompt=none`). No token survives a hard reload.

---

## Composable

```ts
const auth = useAuth()

// Available surface
auth.user                 // Ref<OidcUser | null>
auth.isAuthenticated      // Ref<boolean>
auth.login()              // Redirect to IAM login
auth.logout()             // Clear tokens + IAM end_session redirect
auth.getAccessToken()     // Promise<string> — always use, never cache manually
auth.impersonation        // See Impersonation section
```

`useAuth()` is auto-imported by the module. Never import it manually.

---

## Route Protection

`app/middleware/auth.global.ts` is provided by `@beetween/nuxt-auth` and runs on every route.

Opt out per page:

```ts
// pages/public-page.vue
definePageMeta({ auth: false })
```

Never implement custom global auth middleware — the module handles it.

---

## Impersonation

| API | Purpose |
|---|---|
| `useAuth().impersonation.start(userId)` | Replace current token with impersonation token |
| `useAuth().impersonation.pause()` | Suspend (keep tokens, render as self) |
| `useAuth().impersonation.stop()` | Restore original tokens |
| `useAuth().impersonation.state` | Reactive `{ isImpersonating, originalUser, impersonatedUser }` |

Impersonation UI is per-app responsibility. Nothing in `@beetween/nuxt-auth` renders UI.

---

## API Auth Header Injection

> Cross-link: `nuxt-orval-runtime`

Token injection into API calls is handled by `@beetween/nuxt-orval` runtime fetch hook.
**NEVER** attach `Authorization` headers manually in components or composables.

---

## 401 Handling

> Cross-link: `tanstack-query-error-handling`

On 401 response:
1. `@beetween/nuxt-orval` triggers silent renew.
2. Request retried with new token.
3. On silent renew failure → `useAuth().login()` called → full redirect.

Never implement 401 retry logic in components.

---

## Logout Flow

```
useAuth().logout()
  → clears in-memory tokens
  → redirects to IAM end_session_endpoint
  → IAM redirects to postLogoutRedirectUri
```

---

## CSP / Cookies

- HttpOnly secure cookie: refresh token exchange only (server-side, module-managed).
- No third-party tracking cookies.
- CSP must allow IAM `issuer` origin for OIDC discovery + token endpoint.

---

## Testing

> Cross-link: `vue-composable-testing-patterns`

Mock `@beetween/nuxt-auth` in component/unit tests:

```ts
vi.mock('@beetween/nuxt-auth', () => ({
  useAuth: () => ({
    user: ref({ name: 'Test User' }),
    isAuthenticated: ref(true),
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue('mock-token'),
    impersonation: {
      start: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      state: ref({ isImpersonating: false, originalUser: null, impersonatedUser: null }),
    },
  }),
}))
```

E2E uses a dedicated test IAM realm — cross-link: `e2e-playwright-critical-flows`.

---

## Anti-Patterns

| Pattern | Why Forbidden |
|---|---|
| Tokens in localStorage | XSS exposure |
| Implicit flow | No PKCE, token in URL fragment |
| Manual `Authorization` header in component | Bypasses orval hook, risks stale token |
| Persistent refresh token client-side | Survives reload, violates in-memory rule |
| Keycloak-specific endpoints | Not portable, wrong IAM |
| Impersonation UI in nuxt-auth | UI is app responsibility |
| Hardcoded IAM URLs | Must be runtime config |
| Token in URL fragment after redirect | Must be exchanged immediately by module |

---

## Cross-Links

- `nuxt-orval-runtime` — API client generation, token injection fetch hook
- `tanstack-query-error-handling` — 401 retry, error boundary, toast feedback
- `runtime-config-static-spa` — `public/config.json` runtime config pattern
- `nuxt4-spa-conventions` — SPA mode, SSR-off rules, hydration
- `vue-composable-testing-patterns` — Vitest mocking patterns for composables
- `e2e-playwright-critical-flows` — test IAM realm, auth E2E setup
