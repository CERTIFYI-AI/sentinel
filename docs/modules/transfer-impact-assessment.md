# Transfer Impact Assessment (TIA)

**Route:** `/tia` · **Service:** `dataGovernanceService.ts`

## Purpose
Assess the lawfulness and risk of cross-border personal data transfers following Schrems II and EDPB Recommendations 01/2020, producing a documented decision with mitigating measures.

## Standards Alignment
| Control | Requirement |
|---|---|
| GDPR Art. 44–49 | Transfers to third countries |
| GDPR Art. 46 | Appropriate safeguards (SCC, BCR, codes of conduct) |
| GDPR Art. 49 | Derogations |
| EDPB Recommendations 01/2020 | Six-step TIA methodology |
| Schrems II (C-311/18) | Essential equivalence test |
| UK IDTA / Addendum | UK transfer mechanism |

## Six-Step Workflow
1. **Know your transfer** — exporter, importer, data, purpose.
2. **Identify transfer tool** — SCC, BCR, DPF, Adequacy, derogation.
3. **Assess effectiveness** — destination-country law and practice (government access, redress).
4. **Adopt supplementary measures** — technical (encryption, pseudonymisation), contractual, organisational.
5. **Procedural steps** — execute and notify where required.
6. **Re-evaluate** — scheduled and on change.

Each step captures evidence; DPO sign-off gate at step 5.

## Linkages
TIA is attached to a RoPA record and referenced by the affected Vendor, Asset, and DPA.

## Output
Exportable TIA report with risk score (Low/Medium/High/Prohibited) and residual-risk rationale.

## Backend (updated 2026-08-16)

Backed by the canonical org-scoped `transfer_impact_assessments` table
(service: `privacyRecordsService.ts`, hook: `useTiaRecords`). The page
previously read the generic `tia_table (id, doc jsonb)` demo table.

`transfer_mechanism` is constrained to `adequacy_decision`,
`standard_contractual_clauses`, `binding_corporate_rules`, `derogation`,
`other`. There is deliberately **no `none` member**: a transfer with no
mechanism is represented by leaving the field unset, which the list flags in
the error tone and the header counts as "No mechanism — unlawful if
transferring". `status` is constrained to `draft`|`in_progress`|`completed`|
`approved`.

**Interlinks:** RoPA ↔ TIA (cross-border activities link here); Vendors.
