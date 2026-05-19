# Third-Party / Vendor Risk Management (TPRM)

**Route:** `/vendors`, `/supply-chain-attestations`, `/supply-chain-graph` · **Services:** `vendorService.ts`, `attestationsService.ts` · **Agent:** `vendorRiskAgent.ts`

## Purpose
Onboard, assess, and continuously monitor third parties (SaaS providers, model vendors, data processors, cloud, sub-processors) including AI-specific supply-chain risks (model provenance, training data origin, fine-tune chain, jailbreak exposure).

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.19–A.5.23 | Supplier relationships, ICT supply chain |
| SOC 2 CC9.2 | Vendor and business partner risk |
| NIST SP 800-161 | C-SCRM |
| EU AI Act Art.25 | Obligations along the value chain |
| DORA Art.28–30 | ICT third-party risk, register of information |
| GDPR Art.28 | Processor agreements |

## Lifecycle
Intake → Tiering (criticality + data class + AI involvement) → Due diligence questionnaire (SIG, CAIQ, AI addendum) → Contract controls (DPA, SCC, SLA, security addendum) → Onboarding → Continuous monitoring (attestations, SOC 2 collection, breach signal) → Offboarding.

## Supply-Chain Graph
Directed graph of organisation → vendor → sub-processor → model/dataset lineage. Used for blast-radius analysis during incidents and regulator reporting.

## Evidence
Each vendor record carries a living evidence folder (contracts, SOC 2 / ISO cert, pen-test summary, insurance, DPIA, TIA) with freshness status driven by the `freshness-checker` edge function.
