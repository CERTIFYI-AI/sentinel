# Business Impact Analysis (BIA)

**Route:** `/bia` · **Service:** `bcpPlansService.ts`

## Purpose
Quantify the operational, financial, regulatory, and reputational impact of disruption to each business process and AI system, setting Recovery Time Objectives (RTO), Recovery Point Objectives (RPO), and Maximum Tolerable Downtime (MTD).

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO 22301:2019 8.2.2 | Business Impact Analysis |
| ISO/IEC 27031 | ICT readiness for business continuity |
| NIST SP 800-34 | Contingency Planning |
| DORA Art.11–12 | ICT business continuity and recovery objectives |
| Basel / OCC sound practices | Operational resilience |

## Record Schema
- Process name, owner, supporting assets, dependencies (upstream/downstream, third-party).
- Criticality tier and impact over time (1h, 4h, 24h, 72h, 7d).
- RTO, RPO, MTD, MBCO (Minimum Business Continuity Objective).
- Financial impact estimate and regulatory consequence.
- Linked Risk Register entries and BCP plan.

## Workflow
Process owner drafts → BCM reviews → Executive approval → Annual reassessment. Dependency graph reuses Asset Management relationships.

## Outputs
- Tiering report (Tier 1–4) driving BCP and DR plan scope.
- Heatmap by function and by time horizon.
- Evidence package for regulator and auditor review.
