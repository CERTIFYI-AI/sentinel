# Security Policy

## Supported Versions

| Version | Supported |
|---------|----------|
| 1.x     | Yes      |
| < 1.0   | No       |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities to: security@certifyi.ai

Include:
- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact

You will receive a response within 72 hours. We follow coordinated disclosure and request 90 days before public disclosure.

## Security Architecture

- **Authentication:** Supabase Auth with JWT. Session tokens expire after 3 hours. MFA supported via TOTP.
- **Authorization:** Row Level Security enforced at database layer. Every table filtered by `org_id`. No application-layer security as sole control.
- **Data Isolation:** Multi-tenant with cryptographic org boundary enforcement via PostgreSQL RLS policies. Cross-tenant data access is impossible at query level.
- **Evidence Chain:** Compliance evidence is SHA-256 chained. Each entry includes the previous entry's hash. Tampering is detectable without a trusted third party.
- **Secrets:** No secrets in source. All credentials via environment variables. Gitleaks scanning on every push.
- **Transport:** TLS 1.3 minimum. HSTS enforced. Cloudflare WAF in front of all public endpoints.

## Dependency Security

Dependencies are scanned via GitHub Dependabot. Security patches applied within:
- **Critical:** 24 hours
- **High:** 7 days
- **Medium:** 30 days
