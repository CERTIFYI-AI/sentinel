# Benchmarking & Maturity Assessment

**Routes:** `/benchmark`, `/examination-manager`, `/maturity`
**Status:** Production (Maturity); Beta (Benchmark, Examination Manager)
**Owner:** Compliance · **Backing table(s):** `maturity_assessments` (org-scoped, RLS)

## Purpose
Per-domain maturity assessment of AI governance capabilities, benchmarked to
CMMI and NIST CSF tiers. External benchmarking of AI systems' quality/safety
and structured management of regulator examinations.

## Why it exists
EU AI Act Art. 43 requires conformity assessment. ISO/IEC 42001 9.2 mandates
internal audit. SOC 2 CC4.1 requires monitoring activities. An organisation
needs to measure where it stands across governance domains and track
improvement over time — maturity scoring provides that structured
self-assessment.

## How it works
1. Maturity is assessed across governance dimensions (Initial → Managed →
   Defined → Quantitatively Managed → Optimising).
2. Assessments are stored in `maturity_assessments` with per-dimension
   scores.
3. A radar chart visualises the multi-dimensional assessment.
4. The Assessment Wizard guides a structured self-assessment walk-through.
5. Benchmarking compares against CMMI and NIST CSF tiers.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| KPI tiles | MetricTile row | Overall maturity, dimension count, last assessment, target | Read-only from `maturity_assessments` |
| Radar chart | Recharts RadarChart | Multi-dimensional maturity visualisation | Read-only derived |
| Progress summary | card | Maturity band and trend | Read-only |
| Dimension table | table | Per-dimension scores with current and target levels | Read-only |
| Assessment Wizard | modal | Guided self-assessment across dimensions | Writes to `maturity_assessments` |

Nulls: dimensions not yet assessed show `—`. An empty state renders when no
assessment has been completed.

**Known limitation:** `industryPercentile` (line 144) is a hardcoded
illustrative value (68). This should be labelled as simulated or removed.
Assessment Wizard results persist via the save hook.

## Interlinks
- **Outbound** — none currently.
- **Inbound** — reachable from sidebar nav (Assess & Validate group).

## Compliance
- **EU AI Act** — Art. 43 (conformity assessment): maturity as evidence of
  governance capability.
- **ISO/IEC 42001** — 9.2 (internal audit): structured self-assessment.
- **SOC 2** — CC4.1 (monitoring activities).
- **SR 11-7 / OCC 2011-12** — model validation (benchmark track).

## Operations
Empty state: when no assessments exist, shows an honest empty state with
guidance to start the Assessment Wizard. Writes throw on failure. Realtime:
not realtime; staleTime-based React Query refresh.
