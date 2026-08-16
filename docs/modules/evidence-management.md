# Evidence Management (Vault, Chain, Sync, Export)

**Routes:** `/evidence`, `/evidence-chain`, `/evidence-vault`, `/evidence-sync`, `/export-center` · **Services:** `evidenceService.ts`, `documentsService.ts`

## Purpose
End-to-end evidence management: ingestion, classification, freshness tracking, cryptographic chaining, retrieval, and export for audits and regulator requests.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.33 | Protection of records |
| SOC 2 CC4.1, CC4.2 | Monitoring, reporting deficiencies |
| eIDAS / US E-SIGN | Electronic records integrity |
| ISO/IEC 27037 | Digital evidence handling |
| GDPR Art.5(2) | Accountability |

## Evidence Chain
`entry[n].chain_hash = SHA256(entry[n].payload_hash + entry[n-1].chain_hash)` with WORM RLS policy. Offline verification via exported manifest.

## Freshness
`freshness-checker` edge function downgrades items to Stale when past their cadence (e.g. annual policy review, 90-day SOC 2 refresh), opening tasks automatically.

## Export Center
Auditor packages (CSV, JSON, PDF), regulator-specific exports (EU AI Act Annex IV, SOC 2 workpapers, ISO Statement of Applicability) with manifest and chain verification report.


## Data backing (corrected 2026-08)
- Route is `/evidence-vault` (aliases redirect). Records: `evidence` (org-scoped RLS — the earlier allow_all policy is closed; `url` and source links `linked_incident_id`/`linked_assessment_id` are real columns). Chain: `evidence_chain`, now genuinely append-only (INSERT+SELECT policies only), with entity deep links to incidents/risks.
- The previously documented `freshness-checker` edge function and offline manifest verification do not exist.

## Freshness & interlinks (updated 2026-08-16, controls/evidence wave)
- **Freshness is derived at READ time** in `evidenceService.ts` from
  `expiry_date ?? collection_date` — never written into the row: with an
  expiry date, past = `expired`, within 30 days = `aging`, else `fresh`;
  without one, collection age ≤30d = `fresh`, ≤90d = `aging`, else `stale`;
  with neither date the status is unknown, not asserted. The stored
  `freshness_status` column is legacy and is overridden on read; writes strip
  it.
- `expiry_date` is mapped and editable in the Add-Evidence dialog; the vault
  shows an **"Expiring ≤ 30d" KPI** derived from declared expiry dates.
- `linked_controls` stores `controls.id` uuids and renders as InterlinkChips
  to `/compliance/controls?open=<id>` with resolved `control_ref — name`
  labels ("Unavailable" when unresolvable — never a raw uuid). The
  Add-Evidence dialog has checkbox multi-selects for linked controls and
  linked models (ids stored, names display-only).
- Saves and soft-deletes write Art. 12 `audit_log` rows via `logAction` with
  the real session actor.
- The ws04 custody explorer (`/evidence/custody/:artifactId` over
  `evidence_artifacts`/`evidence_custody_events`) is unreachable and its
  tables are empty — consolidation onto `evidence_chain` is tracked as TD-007
  in `docs/reference/technical-debt.md`; no Chain-tab link was added to it.
