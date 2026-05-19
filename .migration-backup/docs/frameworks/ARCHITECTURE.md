# WS5 — Framework Catalog

## Problem

Sentinel shipped with ad-hoc framework references scattered across
docs and inline constants. Fortune 500 reviewers expect a versioned,
authority-linked catalog that ships with the product and is easy to
extend.

## Solution

A YAML-first catalog under `/frameworks/` at the repo root. Each file
is the single source of truth for one framework: name, version,
authority, URL to the authoritative text, domain tag, and a seed list
of controls.

### Contents (22 frameworks, 84 seed controls)

| Domain | Frameworks |
|---|---|
| Attestation | SOC 2 TSC (2017+) |
| Information Security | ISO/IEC 27001:2022 |
| Privacy | ISO/IEC 27701, GDPR, CCPA/CPRA, PIPEDA, LGPD |
| Cybersecurity | NIST CSF 2.0, CIS Controls v8.1 |
| Federal | NIST SP 800-53 Rev 5, NIST SP 800-171 Rev 3, CMMC 2.0, FedRAMP Rev 5 |
| Payments | PCI DSS 4.0 |
| Healthcare | HIPAA Security Rule, HITRUST CSF v11.2 |
| AI Governance | EU AI Act, NIST AI RMF 1.0, ISO/IEC 42001:2023 |
| Financial | SOX ITGC, DORA, FFIEC CAT |

### Pipeline

1. `scripts/ws5-seed-frameworks.mjs` — idempotent generator. Re-running
   regenerates every YAML plus `frameworks/manifest.json`.
2. `dashboard/src/lib/frameworks.ts` — imports the manifest at build
   time, exposes `listFrameworks()`, `getFramework(id)`,
   `frameworksByDomain(domain)`.
3. `dashboard/src/pages/compliance/FrameworkCatalog.tsx` at
   `/compliance/frameworks` — read-only browser grouped by domain
   with search.
4. `dashboard/src/lib/__tests__/frameworks.test.ts` — contract tests
   (≥20 frameworks, unique ids, authoritative URLs, domain filter).

## Extension

To add a new framework:

1. Append an entry to the `FRAMEWORKS` array in
   `scripts/ws5-seed-frameworks.mjs`.
2. Run `node scripts/ws5-seed-frameworks.mjs`.
3. Commit the new YAML and updated `manifest.json`.
4. Control populations are refined in follow-on PRs by the compliance
   team — the seed list in the generator is a smoke test, not a final
   population.

## Integration with later workstreams

- **WS6** will surface framework metadata in OTEL spans for every
  compliance mutation.
- **WS7** extracts the French/German/Japanese etc. translated labels
  from the YAML when i18n lands.
- **WS8** generates OpenAPI schemas for `GET /frameworks` and
  `GET /frameworks/{id}/controls`.
- **WS9** seeds tenant-scoped control adoptions from the catalog.
