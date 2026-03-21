# Security Policy

## Supported Versions

WollyCMS is pre-1.0. Security fixes are applied to the `main` branch only.

| Version | Supported |
|---------|-----------|
| main (latest) | Yes |
| Older commits | No |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

Use [GitHub's private vulnerability reporting](https://github.com/wollycms/wollycms/security/advisories/new).

**Do not** open a public GitHub issue for security vulnerabilities.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

I will acknowledge receipt within 48 hours and provide a fix timeline within 7 days.

## Security Model

### Authentication

- **Admin UI**: JWT (HS256) with configurable secret. Sessions expire after 24 hours.
- **API Keys**: SHA-256 hashed, stored in the database. Keys map to permission-based roles (`content:read` → viewer, `content:write` → editor, `*` → admin).
- **Preview**: Short-lived JWT tokens for cross-origin preview.

### Authorization

- Role-based access control: `viewer` < `editor` < `admin`.
- API keys enforce permissions at the middleware level — not just role labels.
- The admin API requires authentication for all routes except login and initial setup.

### Infrastructure

- **Cloudflare Workers**: JWT secret is a required binding (fails if missing).
- **Node.js**: Production startup fails if `JWT_SECRET` is unset or equals the dev default.
- **Webhooks**: URL validation blocks private IPs, localhost, and internal hostnames. DNS resolution check prevents rebinding attacks. Redirects are rejected.
- **Rate limiting**: Auth endpoints are rate-limited. Client IP resolution prefers platform headers (`CF-Connecting-IP`) over user-controllable forwarding headers.
- **Media uploads**: MIME type whitelist, file size limits, filename sanitization.

### Known Trust Boundaries

- The Embed block type renders raw HTML. This is intentional for admin-trusted content (iframes, third-party widgets). Restrict embed block creation to trusted roles.
- Rich text content is stored as TipTap JSON and rendered server-side. No raw HTML injection path exists outside the embed block.
- Tracking scripts (analytics, etc.) are admin-managed and executed as-is on frontend pages. Only trusted admins should manage tracking scripts.
