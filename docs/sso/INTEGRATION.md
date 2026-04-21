<!-- Licensed to CERTIFYI-AI under the Apache License, Version 2.0. -->

# SSO Integration Guide

**Audience:** customer IT admins; Sentinel platform ops.

Sentinel supports any IdP that speaks SAML 2.0 or OIDC 1.0. This guide
walks you through the fastest path for the three most common stacks.

## Okta (OIDC)

1. In Okta admin → **Applications** → **Create App Integration** → OIDC → Web Application.
2. Sign-in redirect URI: `https://<your-sentinel>.example.com/sso/oidc/callback`.
3. Copy the Client ID and Client Secret.
4. In Sentinel → **Settings → Identity Providers → Add provider**:
   - Type: OIDC
   - Issuer: `https://<your-okta>.okta.com`
   - JWKS URI: `https://<your-okta>.okta.com/oauth2/v1/keys`
   - Token endpoint: `https://<your-okta>.okta.com/oauth2/v1/token`
   - Client ID / secret: as above
   - Redirect URI: same as step 2
5. **Do not enable the provider yet.** Verify your domain first.

### Verify your domain

1. Settings → Identity Providers → click the provider → **Domains** → Add.
2. Copy the TXT record Sentinel displays.
3. Create DNS record `_sentinel-challenge.<your-domain>` with that value.
4. Wait up to 15 minutes. The row flips to ✅ automatically.

### Enable

Flip the **Enabled** toggle. Test with a single user before rolling out broadly.

## Azure AD (SAML)

1. Azure portal → **Enterprise applications** → New application → Non-gallery.
2. Single sign-on → SAML.
3. Identifier (Entity ID): `https://<your-sentinel>.example.com/sso/saml/acs`.
4. Reply URL: same.
5. Download the signing certificate and the SSO URL.
6. In Sentinel → add SAML provider; paste SSO URL and certificate.
7. Verify the domain and enable as above.

## SCIM Directory Sync (Okta, Azure AD, WorkOS)

1. In Sentinel → provider → **SCIM** → **Generate token**.
2. Copy the plaintext token (shown once).
3. In your IdP:
   - SCIM endpoint: `https://<your-sentinel>.example.com/scim/v2`
   - Bearer token: paste.
   - Provisioning features: Create, Update, Deactivate.
4. Map attributes: at minimum `userName → email`, `externalId → id`,
   `active → active`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `oidc_bad_issuer` | Issuer in your config does not exactly match the `iss` claim of the ID token (trailing slash?). |
| `oidc_unsupported_alg` | You configured an HS256 client. Sentinel requires RS256. Rotate to an RSA key pair. |
| SCIM returns 401 | Token expired or revoked. Generate a new one. |
| User logs in but sees empty dashboard | `jitProvision` succeeded but `user_roles` upsert failed. Check `scim_audit_events` for the error, then contact platform ops. |
