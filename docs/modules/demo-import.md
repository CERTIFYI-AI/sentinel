# Demo Data Import

**Route:** `/settings` → **Demo data** tab (the legacy `/import-data` route
redirects here) ·
**Backing:** no tables of its own — it writes the platform's real, org-scoped
tables through their existing services ·
**Code:** `dashboard/src/services/demoImportService.ts`,
`dashboard/src/pages/Settings.tsx` (DemoDataSection)

## Purpose

A one-button way to seed the **current organization** with a small, coherent,
clearly-fictional demo dataset so that every module shows live, interlinked
data — and a matching one-button removal that deletes exactly what the import
created and nothing else.

## Why it exists

The retired `/import-data` page (`pages/ImportSampleData.tsx`) upserted raw
`data/seed.ts` mock arrays straight into tables, with hardcoded ids and
business codes (`MDL-001`, `V-001`) — the exact pattern the platform has spent
three remediation waves removing. Records imported that way violated the one
id-space, bypassed the service layer's error handling and audit logging, and
could not be told apart from real customer data afterwards.

The demo importer replaces that page. It exists so a new tenant can see the
platform working as one product — interlinks resolving, deep links landing,
dashboards populated — without anyone fabricating "real" data to get there.

## How it works

- **Real service layer, real errors.** Every write goes through the module's
  own service (`modelService.upsertModel`, `vendorService.createVendor`,
  `riskService.upsertRisk`, `incidentService.upsertIncident`,
  `vendorAssessmentService`, `vendorSlaService`, `vendorDocumentService`,
  `aibomService`, `attestationService`, `provenanceService`,
  `carbonRecordsService`, `energyService`, `esgService`, `taskService`), so
  writes THROW on failure and org scoping is filled **DB-side**
  (`current_user_org_id()` / tenant defaults) — the importer never sends an
  org id.
- **No hardcoded uuids.** Import order follows the dependency graph, and the
  id returned by each insert is threaded into the records that reference it,
  so every interlink resolves by construction:

  1. AI models (3)
  2. Vendors (4, `linked_models` → captured model uuids)
  3. Risks (2, `linked_model_ids` + `linked_vendor_ids`)
  4. Incident (1, `vendor_id` + `linked_risk_ids`; the risk is then updated
     with `linked_incident_ids` so the link resolves in **both** directions)
  5. Control links — the demo risk is linked to up to two **existing** org
     controls (`linked_control_ids`); skipped with an explicit message when
     the org has none (no demo controls are invented)
  6. Vendor assessments (2 — in-flight statuses only; no fabricated approvals)
  7. Vendor SLAs (2 — thresholds plus a recorded measurement; status is
     **derived by the DB view**, never authored)
  8. Vendor document (1 — a genuinely uploaded fictional text file, so the
     storage path, size and sha-256 digest are real)
  9. AIBOM record + 3 components (draft, unscanned, unverified)
  10. Supply-chain attestations (2 — status `pending`, no findings)
  11. Provenance graph (4 nodes / 3 edges on the one id-space)
  12. Carbon record + energy reading — `measurement_method`/source
      **'estimated'**, each citing a real `emission_factors` row resolved from
      the catalog by `factor_ref` (`EF-GRID-US`, `EF-GRID-EU`); if the catalog
      is empty the step is **skipped** with a message rather than inserting
      uncited estimates
  13. ESG report — **draft**, no scores, no approver (a published disclosure
      requires a real human approval path), citing the demo carbon/energy ids
  14. Tasks (2, `linked_entity_type`/`linked_entity_id` → the demo vendor and
      risk)

- **Fail-stop, never fake success.** Each step is wrapped; on failure the run
  stops, the step is marked failed with the verbatim service error, and the
  thrown error names the step. The UI shows the error verbatim and the success
  toast fires only after the whole run resolves. Records created by earlier
  steps remain and can be cleaned up with **Remove demo data**.
- **Step-by-step progress** is streamed to the Settings UI via a callback
  (`pending → running → done | skipped | failed`, with a per-step detail line).
- Both actions are behind a `ConfirmDialog`, and both buttons are disabled
  while a run is in flight. After either run the whole React Query cache is
  invalidated so every module refreshes live.

## Fields / markers

The importer adds no columns. Its contract is the **marker**:

| Marker | Where | Meaning |
| --- | --- | --- |
| `metadata.demo_seed = true` | every row the importer writes | the row is fictional demo data and safe to remove |
| `metadata.demo_note` | same rows | human-readable provenance string |
| `"(Demo)"` name suffix / "(demo role)" owners / `.example` domains | record content | the data reads as fictional wherever it is displayed |

Idempotency: `fetchDemoDataStatus()` counts `ai_models` rows whose metadata
contains the marker (models are the head of the dependency graph). When any
exist, the Settings tab shows the "already imported" state and the import
button is disabled; `importDemoData()` also re-checks and throws rather than
double-importing.

## Interlinks

Everything the importer writes joins the one id-space — models by
`ai_models.id`, vendors by `vendors.id`, risks by `risks.id` — never by name
or business code:

- vendors → models (`linked_models`), models ← vendors via backlinks
- risks → models (`linked_model_ids`), vendors (`linked_vendor_ids`),
  incidents (`linked_incident_ids`), controls (`linked_control_ids`)
- incident → vendor (`vendor_id`), risk (`linked_risk_ids`), model (`model_id`)
- assessments / SLAs / documents → vendor (`vendor_id`)
- AIBOM record → model + vendor; components → AIBOM + vendor
- attestations → subject (`subject_type`/`subject_id`) + model / vendor
- provenance nodes → model / vendor; edges → nodes
- carbon / energy → model + `emission_factor_id` (citable catalog row)
- ESG report → carbon record ids, energy metric ids, model ids
- tasks → vendor / risk (`linked_entity_type` / `linked_entity_id`)

## Compliance

- **Demo data is fictional and labelled** (gate 4): role labels instead of
  named people, `.example` domains, "(Demo)" names, and the removable
  `demo_seed` marker. No personal data is seeded.
- **No fabricated assurance or measurements:** attestations stay `pending`,
  the AIBOM stays `draft`/unscanned/unverified, SLA status is derived by the
  DB view from a recorded value, carbon/energy figures are `estimated` and
  cite a real emission factor (or the step is skipped), and the ESG report
  stays `draft` with no scores and no approver.
- **Art. 12 traceability:** every underlying service write logs itself, and
  the importer additionally writes a `settings` / `demo_import` audit entry
  for the overall `import` and `remove` outcomes — including failed attempts.
- **Org isolation:** all writes rely on DB-side defaults and RLS; the importer
  cannot write into another org, and removal is likewise RLS-scoped.
- The audit trail itself is **never** seeded — fabricated audit events would
  forge the evidence chain.

## Operations

- **Import:** Settings → Demo data → *Import demo data* (confirm). Watch the
  step list; a failure names the failing step and shows the service error
  verbatim.
- **Remove:** Settings → Demo data → *Remove demo data* (confirm). Deletes
  only rows whose `metadata` contains `demo_seed: true`, children before
  parents (tasks → ESG → energy/carbon → provenance → attestations → AIBOM →
  vendor documents (including the stored files, via the service) → SLAs →
  assessments → incidents → risks → vendors → models), and reports the row
  count per step.
- **Partial import cleanup:** if an import fails midway, run Remove — it
  deletes whatever marked rows exist, in the safe order.
- Registering demo models emits the same `MODEL_REGISTERED` governance-bus
  event as any real registration; records the autonomous mesh creates in
  response are agent-owned (not marker-carrying) and are governed by the
  mesh's own lifecycle, not by demo removal.
