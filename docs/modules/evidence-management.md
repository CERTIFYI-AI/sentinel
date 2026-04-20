# Evidence Management (Vault, Chain, Sync, Export)

**Routes:** `/evidence`, `/evidence-chain`, `/evidence-vault`, `/evidence-sync`, `/export-center` · **Services:** `evidenceService.ts`, `documentsService.ts`

## Purpose
End-to-end evidence management: ingestion, classification, freshness tracking, cryptographic chaining, retrieval, and export for audits and regulator requests.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.33 | Protection of records |
| SOC 2 CC4.1, CC4.2 | Monitoring, reporting deficiencies |
| eIDAS / US E-SIGN | Electronic records integrity |
| ISO/IEC 27037 | Digital evidence handling |
| GDPR Art.5(2) | Accountability |

## Evidence Chain
`entry[n].chain_hash = SHA256(entry[n].payload_hash + entry[n-1].chain_hash)` with WORM RLS policy. Offline verification via exported manifest.

## Freshness
`freshness-checker` edge function downgrades items to Stale when past their cadence (e.g. annual policy review, 90-day SOC 2 refresh), opening tasks automatically.

## Export Center
Auditor packages (CSV, JSON, PDF), regulator-specific exports (EU AI Act Annex IV, SOC 2 workpapers, ISO Statement of Applicability) with manifest and chain verification report.
