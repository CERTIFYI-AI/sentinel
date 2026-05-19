# Release Engineering — Architecture (WS0.6)

## Goals

- **Reproducible, auditable releases.** Every version ships with an
  SBOM, a Sigstore signature, and SLSA v1 build provenance.
- **No human in the release loop.** `semantic-release` drives
  version bumps, changelogs, and GitHub releases from Conventional
  Commit messages.
- **Supply-chain integrity.** Downstream consumers can verify
  artifact provenance without trusting CERTIFYI-AI infrastructure.

## Components

| Piece | Tool | File |
|---|---|---|
| Version bump & release notes | `semantic-release` | `.releaserc.json` |
| Release workflow | GitHub Actions | `.github/workflows/release.yml` |
| SBOM (CycloneDX) | `CycloneDX/gh-node-module-generatebom` | workflow |
| SBOM (SPDX) | `anchore/sbom-action` (Syft) | workflow |
| Signing | `sigstore/cosign-installer` (keyless OIDC) | workflow |
| Provenance | `actions/attest-build-provenance` (SLSA v1) | workflow |
| DCO enforcement | `.github/workflows/dco.yml` | workflow |
| Dependency updates | Dependabot | `.github/dependabot.yml` |

## Trigger model

`release.yml` runs on pushes to `main`. It depends on the branch
protection rules (set manually in repo settings) requiring the
following checks to have passed on the merge commit:

- `ci / typecheck`
- `ci / build`
- `ci / unit-tests`
- `ci / e2e-tests`
- `Security / secrets` (Gitleaks)
- `Security / dependencies` (npm audit)
- `Security / semgrep`
- `Security / codeql`
- `Security / trivy`
- `DCO / dco`

## Versioning

We use SemVer 2.0.0. `semantic-release` computes the next version
from Conventional Commit types since the last git tag:

| Commit type | Bump |
|---|---|
| `fix:` | patch |
| `feat:` | minor |
| `feat!:` / `BREAKING CHANGE:` | major |

Other types (`chore`, `docs`, `refactor`, `perf`, `test`) do not
trigger a release on their own but will appear in the changelog when
a triggering commit is also present.

## Release artifacts

Each release publishes to the GitHub Release page:

- `dashboard-<short-sha>.tar.gz` — built dashboard static assets.
- `sbom-dashboard.cdx.json` — CycloneDX 1.5 SBOM for the dashboard
  dependency tree.
- `sbom-dashboard.spdx.json` — SPDX 2.3 SBOM.
- `*.sig` / `*.pem` — Sigstore keyless signature + signing
  certificate for every artifact and SBOM.
- SLSA v1 build provenance attestation (attached by
  `actions/attest-build-provenance`).

## Verification by consumers

Any downstream consumer can verify a release artifact with a single
cosign command that does not require possessing any key material:

```bash
cosign verify-blob \
  --certificate dashboard-<sha>.tar.gz.pem \
  --signature   dashboard-<sha>.tar.gz.sig \
  --certificate-identity-regexp 'https://github.com/CERTIFYI-AI/sentinel/.github/workflows/release.yml@refs/.*' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  dashboard-<sha>.tar.gz
```

To verify SLSA provenance:

```bash
gh attestation verify dashboard-<sha>.tar.gz \
  --repo CERTIFYI-AI/sentinel
```

## SBOM workflow for customers

CycloneDX is the primary format (richest tooling). SPDX is provided
for customers whose ingestion pipelines require it. Both list the
full transitive dependency tree plus license metadata so licence
auditors can automate compliance checks.

## DCO

Every commit in every PR must have a matching `Signed-off-by:` line
(`CONTRIBUTING.md` § Developer Certificate of Origin). The `dco.yml`
workflow fails a PR if any commit in the PR range lacks sign-off.

## Dependabot

Weekly `npm` and `github-actions` updates. PRs inherit all CI gates
so vulnerable or incompatible bumps are blocked automatically.

## Follow-ups (future workstreams)

- Anchor the daily audit-log + evidence-custody chain roots into
  Sigstore Rekor for third-party timestamp verification (part of the
  WS0.3/WS0.4 hardening path).
- Container image signing + SBOMs (when container deploys ship).
- SLSA build level 3 formal attestations (hermetic builds, two-party
  review gating) — foundation is in place; final sign-off pending
  security review.

## DBA / Ops runbook

1. **One-time repo admin actions (manual):**
   - Enable branch protection on `main` requiring every check above.
   - Require signed commits.
   - Require linear history.
   - Require up-to-date branches before merge.
   - Require CODEOWNER review.

2. **One-time org-level actions:**
   - Enable Sigstore / OIDC federated identity for the repo
     (GitHub is already the OIDC issuer; no extra config needed for
     keyless cosign).
   - Configure `security@certifyi.ai` as the advisory contact.

3. **Per-release checklist (automated — for humans, read-only):**
   - Release workflow ran green on the merge commit.
   - GitHub Release has `.tar.gz`, `.cdx.json`, `.spdx.json`, `.sig`,
     `.pem` assets.
   - `gh attestation list --repo CERTIFYI-AI/sentinel` shows the new
     attestation.
