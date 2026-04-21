# Security Policy

## Supported Versions

| Version | Supported | End of security support |
|---------|-----------|-------------------------|
| 1.x     | Yes       | TBD (≥ 24 months after 2.0 GA) |
| < 1.0   | No        | — |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Preferred channels, in order:

1. **GitHub Security Advisories** — use "Report a vulnerability" on the
   [Security](https://github.com/CERTIFYI-AI/sentinel/security) tab of this
   repository. This is the fastest path and gives our triage team private
   collaboration with you.
2. **Email** — `security@certifyi.ai`. PGP key fingerprint is published
   at `https://certifyi.ai/.well-known/security.txt`.

Please include:

- A clear description of the vulnerability.
- Steps to reproduce (minimal PoC where possible).
- The affected version(s), commit SHA, or deployed environment.
- Impact assessment and any suggested mitigation.

Do **not** include production customer data, secrets, or PII in your report.
Scrub logs and screenshots first.

### Response SLAs

| Severity | First human response | Fix committed | Patched release |
|---|---|---|---|
| Critical (CVSS ≥ 9.0) | 24 hours | 7 calendar days | 14 calendar days |
| High (7.0–8.9)        | 48 hours | 14 calendar days | 30 calendar days |
| Medium (4.0–6.9)      | 5 business days | 30 calendar days | next quarterly release |
| Low (< 4.0)           | 10 business days | Best effort | next quarterly release |

All timelines start on receipt of the first reproducible report.

## Coordinated Disclosure

- We ask reporters to keep reports private until a fix is available or
  90 days elapse, whichever is sooner.
- We will credit reporters in the release notes and `CHANGELOG.md`
  unless you request anonymity.
- We do not currently operate a paid bug bounty program; a
  safe-harbor statement for good-faith research is below.

## Safe Harbor

CERTIFYI-AI will not pursue legal action against security researchers
who:

- Operate in good faith and follow this policy.
- Do not access, modify, or exfiltrate data beyond what is necessary
  to demonstrate the issue.
- Do not disrupt service availability or degrade performance for
  other tenants.
- Report promptly and do not publish before coordinated disclosure.

## Scope

In scope:

- The Sentinel dashboard (`dashboard/**`).
- Cloudflare Worker middleware (`workers/**`).
- Supabase migrations, RPCs, RLS policies, and edge functions
  (`supabase/**`).
- Release and CI supply chain (GitHub Actions workflows under
  `.github/workflows/**`).
- Published SDKs, OpenAPI surfaces, and webhooks.

Out of scope:

- Third-party services we integrate with (report to the vendor).
- Physical attacks, social engineering of CERTIFYI-AI staff.
- Denial of service through volumetric attacks.
- Issues requiring privileged local access to a user's machine.

## Release Integrity

Every tagged release publishes:

- A **CycloneDX SBOM** (`sbom-*.cdx.json`) as a GitHub Release asset.
- An **SPDX SBOM** (`sbom-*.spdx.json`) as a GitHub Release asset.
- **Sigstore cosign keyless signatures** for release artifacts (OIDC
  identity: `https://github.com/CERTIFYI-AI/sentinel/.github/workflows/release.yml@refs/tags/*`).
- A **SLSA v1.0 provenance attestation** (build level 3 target)
  generated via `actions/attest-build-provenance`.

See `docs/release-engineering/ARCHITECTURE.md` for verification
commands.

## Dependency Integrity

- Dependabot enabled for `npm` and `github-actions`.
- Pull requests must pass Gitleaks, `npm audit --audit-level=high`,
  Semgrep (OWASP+TS+React+Node), CodeQL (JS/TS security-and-quality),
  and Trivy (fs + config, HIGH/CRITICAL) before merge.
- New third-party dependencies require a license check (Apache-2.0
  compatible) and a security review note in the PR description.

## Data Handling

- All dates stored in UTC.
- Secrets are never committed or logged; the edge/Worker layer
  proxies third-party APIs so client bundles never see credentials.
- Evidence artifacts are integrity-checked nightly against the
  SHA-256 digest recorded at upload (WS0.4 chain-of-custody).
- Administrative actions are recorded in an append-only, hash-chained
  audit log (WS0.3) exportable to SIEMs via CEF/LEEF/Syslog/Splunk
  HEC formats.

## Contact

- Security contact: `security@certifyi.ai`
- Encrypted contact: PGP key at
  `https://certifyi.ai/.well-known/security.txt`
- Company: CERTIFYI-AI, Inc.
