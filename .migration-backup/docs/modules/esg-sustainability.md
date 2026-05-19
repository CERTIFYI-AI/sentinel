# ESG & Sustainability (Carbon, Energy, Financial)

**Routes:** `/carbon-ledger`, `/energy-efficiency`, `/esg`, `/esg-reports`, `/financial-risk` · **Services:** `carbonRecordsService.ts`

## Purpose
Track AI-related environmental footprint (energy, compute, water, carbon) and financial-risk exposure for disclosure and internal optimisation.

## Standards Alignment
| Control | Requirement |
|---|---|
| GHG Protocol Corporate Standard | Scope 1–3 emissions |
| ISO 14064-1 | GHG quantification and reporting |
| CSRD / ESRS E1 | EU sustainability reporting |
| SEC Climate Disclosure (2024) | US climate-related risk |
| TCFD / ISSB IFRS S2 | Climate disclosures |
| SASB | Industry sustainability accounting |

## Carbon Ledger
Per model training/inference run: kWh, PUE, grid intensity, tCO2e, water usage, compute region. Aggregated by model, team, and tenant.

## Financial Risk
Maps AI financial exposure (vendor concentration, model-risk capital, incident-loss forecast) to Risk Register and Executive Center KPIs.
