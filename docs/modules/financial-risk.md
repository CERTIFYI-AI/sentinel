# Financial Risk Quantification

**Route:** `/financial-risk` · **Service:** `riskGroupService.ts` · **Table:** `public.financial_risks`

## Purpose
FAIR-style quantification of AI risk scenarios: loss event frequency × loss magnitude → annualized loss expectancy (ALE), with per-scenario controls (cost vs. risk-reduction) and insurance mapping.

## Standards Alignment
| Control | Requirement |
|---|---|
| Open FAIR O-RT / O-RA | Loss-event frequency and magnitude taxonomy |
| ISO/IEC 42001 6.1.4 | AI system impact assessment (financial dimension) |
| BCBS 239 | Risk data aggregation for model-driven exposures |

## Data backing (wired 2026-08)
- `public.financial_risks` (uuid PK, org-scoped RLS `financial_risks_org_all`): FAIR primitives as real columns; ALE is computed (`computeFair`), never typed in; `model_id` → `ai_models.id`, `linked_risk_id` → `risks.id`.
- No simulated Monte Carlo output is displayed — only quantities derived from stored records.
