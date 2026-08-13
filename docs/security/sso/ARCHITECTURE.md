<!-- Licensed to CERTIFYI-AI under the Apache License, Version 2.0. -->

# Enterprise SSO Architecture (WS0.2)

**Status:** Infrastructure landed; real-IdP wiring pending customer provisioning.
**Depends on:** WS0.1 (multi-tenancy).

## 1. Scope

Sentinel supports two standards and one provisioning protocol:

- **SAML 2.0** — IdP-initiated and SP-initiated flows via a single ACS endpoint.
- **OIDC 1.0** — Authorization Code flow with RS256-signed ID tokens.
- **SCIM 2.0** — Directory sync (create/update/deactivate) via bearer-token REST.

We are deliberately **provider-agnostic**. There is no "WorkOS adapter"
or "Okta adapter"; any IdP that speaks the above protocols can connect.

## 2. Home-Realm Discovery (HRD)

The login page collects the user's email address and calls the
`lookup_idp_by_domain(p_domain)` Postgres RPC (SECURITY DEFINER,
grant-execute to `anon` + `authenticated`). The function returns the
enabled provider whose `identity_provider_domains` row is verified
and matches the email's domain.

If a match exists → redirect to the SAML SSO URL / OIDC `/authorize`.
Otherwise → show the password form.

**Domain verification** is a DNS TXT record the admin places at
`_sentinel-challenge.<domain>`. An asynchronous verifier job (future
WS0.6 cron) flips `is_verified=true` when the TXT record matches the
`verification_token`. Until then, the domain is inert — it does not
route logins.

## 3. OIDC Callback Flow

```
Browser → IdP /authorize
       ← IdP redirect (code, state)
Browser → Sentinel /sso/oidc/callback?code=…&state=…
                      │
                      ├─ parse state (Base64 JSON { provider_id, nonce })
                      ├─ POST /token (code exchange)
                      ├─ fetch /jwks, verify ID token (RS256, iss, aud, exp)
                      ├─ jitProvision(org_id, email, external_subject)
                      ├─ insert sso_sessions row
                      ├─ generateLink(type=magiclink)
                      └─ 302 → Supabase action_link → dashboard/overview
```

**Key security properties:**
- HS256 ID tokens are rejected — we require asymmetric signatures so IdP key compromise does not silently authorise us.
- `aud` must contain the `client_id` exactly.
- Tokens with `exp ≤ now` are rejected.
- The `state` parameter is never trusted as user input — we decode it only to recover `provider_id`.

## 4. SCIM 2.0 Surface

Implemented per RFC 7643 + RFC 7644:

| Verb | Path | Behaviour |
|---|---|---|
| GET | `/Users` | Paginated list, supports `filter=userName eq "..."` and `filter=externalId eq "..."` |
| GET | `/Users/{id}` | Single resource |
| POST | `/Users` | JIT provision; sets `app_metadata.org_id` |
| PATCH | `/Users/{id}` | Handles `{op:"replace", path:"active", value:false}` → revoke `user_roles` |
| DELETE | `/Users/{id}` | Soft-deprovision (revoke roles); never hard-deletes user data |

**Groups** (`/Groups`) are not yet implemented — tracked for WS4 when
role mappings become granular.

**Auth:** Bearer token from `scim_tokens`. Tokens are SHA-256 hashed
at rest; plaintext is shown exactly once when minted. Every call is
logged to `scim_audit_events`.

## 5. JIT Provisioning Contract

`_shared/sso.ts::jitProvision()` is the single code path that creates
or updates Supabase auth users from an IdP claim set:

1. Look up user by email. If exists → force `app_metadata.org_id` via `auth.admin.updateUserById`.
2. If not → `auth.admin.createUser` with `email_confirm:true` and `app_metadata.{org_id, provider_id, provider:'sso'}`.
3. Upsert `user_roles(user_id, org_id, role='member')`.

The user's next Supabase JWT refresh picks up the new `org_id` claim;
WS0.1's `auth.current_org_id()` then scopes every row they see.

## 6. Environment

Edge functions expect:

| Var | Purpose |
|---|---|
| `SUPABASE_URL` | Injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Injected by Supabase |
| `SUPABASE_ANON_KEY` | Injected by Supabase |
| `APP_BASE_URL` | Used in OIDC magic-link redirect_to |
| `ALLOWED_ORIGIN` | CORS allowlist (default `*`; lock down in prod) |

IdP-specific secrets (client_secret, signing certs) live in
`identity_providers.config` (JSONB). RLS restricts reads to the owning
org; edge functions read via service-role.

## 7. Open Items

- **SAML ACS endpoint** (`sso-saml-acs`) — not in this PR; ships with WS0.3 so the signed-assertion verifier can reuse WS0.3's hash-chain writer for audit.
- **Groups → Roles mapping** — WS4 will populate `user_roles.role` from the `group_claim_path` at login.
- **MFA step-up** — WS4. `sso_sessions` already carries the data we'll need.
- **WorkOS / Keycloak dev tenant** — requires platform ops to provision; no hardcoded credentials shipped.
- **Real rate limits** on `/sso/oidc/callback` and `/scim/*` — WS6 observability.

See `docs/security/sso/INTEGRATION.md` (next section) for the customer-facing
setup guide.
