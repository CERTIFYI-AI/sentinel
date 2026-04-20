# Benchmarking & Examination Manager

**Routes:** `/benchmark`, `/examination-manager`, `/genai-risks` · **Services:** `benchmarkService.ts` (aggregate), `conformityService.ts`

## Purpose
External and internal benchmarking of AI systems' quality/safety and structured management of regulator examinations (onsite inspections, supervisory reviews, audits).

## Standards Alignment
| Control | Requirement |
|---|---|
| EU AI Act Art.43, 70 | Conformity assessment, national supervisory authorities |
| SR 11-7 / OCC 2011-12 | Model validation, challenger models |
| ISO/IEC 42001 9.2 | Internal audit |
| SOC 2 CC4.1 | Monitoring activities |

## Benchmark
Challenger-model evaluation, public-benchmark tracking (HELM, MMLU-style), and domain-specific eval suites. Results tie to Model Inventory.

## Examination Manager
Scope, request list, response library, working-paper trail, and exit-conference records for regulator examinations.
