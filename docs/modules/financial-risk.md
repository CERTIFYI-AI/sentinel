# Financial Risk Quantification

**Routes:** `/financial-risk`
**Status:** Production
**Owner:** Risk · **Backing table(s):** `financial_risks` (org-scoped, RLS)

## Purpose
FAIR-style quantification of AI risk scenarios: loss event frequency × loss
magnitude → annualized loss expectancy (ALE), with per-scenario controls
(cost vs. risk-reduction) and insurance mapping.

## Why it exists
ISO/IEC 42001 6.1.4 requires AI system impact assessment including the
financial dimension. Open FAIR provides the standard taxonomy for loss-event
frequency and magnitude. Regulators (BCBS 239 for financial services) expect
risk data aggregation for model-driven exposures. This module stores the
quantification — not fabricated Monte Carlo output, only quantities derived
from stored records.

## How it works
1. Each scenario is stored in `financial_risks` with FAIR primitives as real
   columns: threat event frequency, vulnerability, primary/secondary loss
   event frequency, primary/secondary loss magnitude.
2. ALE is computed by `computeFair` at render time — never typed in directly.
3. `model_id` links to `ai_models.id` (the risk scenario's subject model).
4. `linked_risk_id` links to `risks.id` (the operational risk this quantifies).
5. Controls per scenario carry cost and risk-reduction percentage.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | metric row | Total scenarios, total ALE, highest ALE, avg ALE | Read-only from `financial_risks` |
| Scenario list | table | Each scenario with model, ALE, loss frequency, magnitude | Read-only |
| Create scenario | button + dialog | Creates a FAIR risk scenario | Writes to `financial_risks` |
| Edit scenario | dialog | Updates FAIR parameters | Updates `financial_risks` |
| Delete scenario | ConfirmDialog | Removes a scenario | Deletes from `financial_risks` |
| Model link | PillLink | Navigate to the subject model | → `/models/inventory/:id` |
| Risk link | PillLink | Navigate to the linked operational risk | → `/risks?open=<id>` |
| ALE computation | derived | Computes ALE from FAIR inputs at render | Client-side; never stored |

Nulls: a scenario with no linked model shows `—`. An unresolvable `model_id`
shows "Unavailable".

## Interlinks
- **Outbound** — PillLink to `/models/inventory/:id` (subject model),
  PillLink to `/risks?open=<id>` (linked risk).
- **Inbound** — reachable from sidebar nav (Risk & Oversight group);
  risk detail pages can link to financial quantification.

## Compliance
- **EU AI Act** — Art. 9 (risk management): financial dimension of AI risk.
- **ISO/IEC 42001** — 6.1.4 (AI system impact assessment): financial impact
  quantification.
- **Open FAIR** — O-RT / O-RA: loss-event frequency and magnitude taxonomy.
- **BCBS 239** — risk data aggregation for model-driven exposures.

## Operations
Empty state: when no scenarios exist, shows an honest empty state. ALE is
derived, never fabricated. No simulated Monte Carlo output is displayed.
Writes throw on failure. Realtime: not realtime; staleTime-based React Query
refresh.
