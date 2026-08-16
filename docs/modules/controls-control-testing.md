# Controls & Control Testing

**Route:** `/controls`, `/control-testing`, `/compliance-controls` · **Service:** `controlService.ts`

## Purpose
Library of implemented controls mapped to multiple frameworks, with scheduled operational-effectiveness testing, evidence collection, and exception handling.

## Standards Alignment
| Framework | Coverage |
|---|---|
| SOC 2 TSC 2017 (2022 points of focus) | CC + trust service criteria |
| ISO/IEC 27001:2022 Annex A | 93 controls |
| ISO/IEC 42001:2023 Annex A | AI management controls |
| NIST SP 800-53 Rev.5 | Security and privacy controls |
| CIS Controls v8 | Cyber hygiene |
| PCI DSS v4.0 | Where scoped |

## Control Record
ID, description, framework mappings, design, owner, frequency, test procedure, evidence requirement, operating-effectiveness history.

## Testing Cycle
Planned test → Collect evidence → Evaluate (Effective / Deficient / Not applicable) → Exception or remediation task → Sign-off. Four-eyes for high-criticality controls.

## Outputs
SOC 2 / ISO audit-ready control matrix and testing workpapers exportable from Evidence Vault.

## Backend (updated 2026-08-16, controls/evidence wave)

Backed by the canonical org-scoped `controls` table. Service:
`controlService.ts` (control CRUD, camelCase↔snake_case, writes throw), hook:
`hooks/queries/useControls`. Control tests live in `control_tests` via
`complianceOpsService.ts` (`useControlTests`). The superseded
`complianceControlsService.ts` was deleted (zero live importers). The page
previously read the generic `compliancecontrols_table (id, doc jsonb)` demo
table **while the real table already held 385 control records that were never
displayed**.

`implementation_status`/`status` include `not_applicable` (out of scope —
excluded from coverage and gap analysis). `score`/`effectiveness_score` and
`evidence_count` are nullable and render as `—` when never scored/counted —
never as `0`. Coverage is computed over in-scope controls only and shows `—`
when the library is empty.

**Test cadence:** recording a test (`saveControlTest`) writes the
`control_tests` row AND stamps the control (`last_tested_at`, `test_result`)
and advances `next_test_at = tested_at + test_frequency`, parsing the seeded
vocabulary `monthly | quarterly | semiannual | annual`; a control without a
declared frequency keeps its existing schedule. All writes are checked — a
half-applied result throws. Each recorded test also writes an Art. 12
`audit_log` row via `logAction`.

`control_tests` currently carries only `control_id, result, tester, notes,
tested_at` — **no** `test_procedure` / `evidence_ref` / `sample_size` columns
exist yet; richer testing workpapers are future schema work (do not render
fields the schema does not have).

**Interlinks (both ways):**
- outbound: `linked_model_ids` → `/models/inventory/:id`; `linked_risk_ids` →
  `/risks?open=` (resolved risk titles); `linked_policy_ids` →
  `/policies?open=` (resolved policy titles); Frameworks; Gap Analysis.
- inbound: audit findings (`audit_findings.linked_control_id`), evidence
  (`evidence.linked_controls`), risks (`risks.linked_control_ids`), model
  detail backlink card (`controls.linked_model_ids`), the compliance calendar
  (test-due events from `next_test_at` deep-link `/compliance/controls?open=`),
  and `?model=<uuid>` deep links with a dismissible chip.
