# Is Sentinel ready to be called a "Trust Layer for Production AI"?

**Verdict (2026-08-17): Not yet — and the honest distance is measurable.**
The platform is close on the *governance record* half of that claim and
materially short on the *runtime trust* half. This document is the evidence,
assembled from six adversarial audit waves (Security, Risk & Incidents,
Compliance & Regulatory, Vendors/Supply-Chain/ESG, the platform-wide interlink
audit, and the HOME/executive-surfaces audit), each verified against a real
from-zero Postgres replay rather than by inspection.

The bar applied: a **trust layer** is software whose own claims can be trusted.
Every criterion below is pass/fail on evidence, not aspiration.

---

## What is genuinely solid (earned, verified)

| Criterion | Evidence |
|---|---|
| **Schema replays from zero** | 123 migrations, 0 failures, on real Postgres 16.13. The duplicate-version guard runs on pushes to `main`, closing the merge-order-collision class that broke main twice. |
| **Tenant isolation on the governed spine** | Org-scoped RLS with DB-filled scoping columns (`current_user_org_id()`) across the canonical tables; cross-tenant view leak (`security_invoker`) found and proven closed with a two-org test; 53 demo tables contained with a populated-database-safe migration. |
| **Writes are honest** | The service layer throws on failure across all rebuilt groups; success toasts fire only after resolution; a failed query renders an error, never an empty state (front page reports "N of 11 data sources unavailable"). |
| **The one-id-space holds on the rebuilt groups** | Interlinks keyed by uuid, proven with `total = resolves` queries; business-code joins removed from every audited surface; seed business codes (`'vendor-004'`, `'risk-006'`) resolved to real ids. |
| **Fabricated assurance is gone from audited surfaces** | The `Math.random()` "SHA-256", the `sigHash !== 'PENDING'` signature check, the hardcoded signer, three fabricated *published* ESG disclosures naming PwC/Deloitte, the board report's invented risk score and trend, the "94.2% verified attestations" card, and the fictional 47-peer network — all deleted, not relabelled. Real companies carrying invented regulatory verdicts were de-named. |
| **Art. 12 traceability on state changes** | `logAction` with a real actor across the rebuilt services (was zero in three whole groups); board-report exports audit-logged and carrying provenance blocks. |
| **Derived, never authored, status** | SLA breach from numeric thresholds; attestation validity from `valid_until`; unmeasured renders `—`/`unmeasured`, never a healthy default or a green zero. |

## What blocks the claim (ranked by how badly it undercuts "trust layer")

1. **No cryptographic verification is performed anywhere (TD-011).** The schema
   is ready (DSSE envelope, signer identity, Rekor index, `verified_at`), the
   UI is honest about it, but every attestation and AIBOM reads `unverified`.
   A trust layer that verifies nothing is a *ledger*, not a trust layer. ISO
   A.6.2.4 is deliberately mapped **Partial** for this reason.
   *To close: server-side digest computation over canonical documents + DSSE
   signing with real key custody. Its own project.*

2. **The runtime plane is thinner than the governance plane.** The proxy /
   verifier / guardrail layer (the `sentinel` Python package) is real, but the
   dashboard's "trust" story is mostly *records about* models, not live
   enforcement wired to them. The genuinely live pieces (telemetry plane,
   governance mesh, kill-switch schema) exist; sweeps are on-demand until the
   documented activation steps run (see `governance-mesh/ACTIVATION.md`).
   *To close: run the activation steps and connect a real model workload
   end-to-end through proxy → verdict → incident → HITL.*

3. **~15 modules still sit on demo doc-tables (TD-001).** Contained (org-scoped
   RLS since the re-fix), but their pages still render seeded fiction through a
   hook whose writes are fire-and-forget. DPIA, BIA, IGA, Asset Management,
   HITL Review Center, Regulator Filings and peers are in this state. Any one
   of them shown to an auditor undermines the honest 80%.
   *To close: the same treatment the five rebuilt groups received.*

4. **Agent layer partially verified (TD-004).** `vendorRiskAgent`,
   `vendorCascadeAgent`, `carbonAgent`, `esgAgent`, `remediationPlannerAgent`,
   `hitlAgent` and the telemetry set are fixed onto real columns with
   fail-loud writes; the remaining registered agents have not been verified
   against their target schemas, and `safeInsert` still swallows for them.

5. **CI is quota-blocked.** Every gate is green locally (typecheck, 255 vitest,
   233 pytest, ruff, full replay), but GitHub Actions has been failing on
   runner allocation since the quota exhausted. A trust claim needs its
   pipeline green in public, not on a contributor's machine.

6. **Peer benchmarking and real signing are honest gaps, stated as such.**
   Correct posture, but they are visible feature absences a buyer will notice.

## The one-sentence answer

**Sentinel today is an honest, tenant-isolated AI governance system of record
with a verified interlink graph — it may not yet call itself a trust layer for
production AI, because it does not yet cryptographically verify artifacts or
demonstrably sit in a production inference path.** The distance is items 1–3
above; none is architecturally blocked, and the schema for all three already
exists.

## Standing rule that got the platform this far

Every wave found the same failure shape: **pages were rewritten to be honest
while the seeds, views and agents kept lying** (the esgService comment claimed
"an empty tenant now gets []" while the migration still seeded fabricated
published disclosures). Audit questions must therefore be phrased as *"where
does this number actually come from?"* — never *"does this page look honest?"*
— and every fix proven against a from-zero replay, not the live database.
