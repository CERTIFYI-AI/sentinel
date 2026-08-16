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

## Backend (updated 2026-08-16)

Backed by the canonical org-scoped `controls` table (service:
`complianceControlsService.ts`, hook: `useControls`). The page previously read
the generic `compliancecontrols_table (id, doc jsonb)` demo table **while the
real table already held 385 control records that were never displayed**.

`status` is constrained to `implemented`|`partially_implemented`|
`not_implemented`|`not_applicable`. `score` and `evidence_count` are nullable
and render as `—` when never scored/counted — never as `0`. Coverage is
computed over in-scope controls only (excluding `not_applicable`) and shows
`—` when the library is empty.

**Interlinks:** Frameworks, Evidence.
