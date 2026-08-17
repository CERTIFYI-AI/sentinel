# AI Supply Chain Graph

**Route:** `/supply-chain/graph` ·
**Backing:** derived — `provenance_nodes` + `provenance_edges` joined to
`ai_models`, `vendors`, datasets and `use_cases` (all org-scoped RLS). The graph
owns no table of its own ·
**Code:** `dashboard/src/pages/SupplyChainGraph.tsx`, reading through
`dashboard/src/hooks/useProvenanceData.ts` (`useProvenanceGraph`) and
`dashboard/src/hooks/useSupplyChainEntities.ts`

## Purpose

The interactive canvas over the AI supply chain: data sources, datasets, models,
pipelines, vendors and use cases as one connected picture, with downstream
blast-radius analysis for incident response.

## Why it exists

When a dataset is withdrawn or a vendor suffers a breach, the first question is
*what does this touch?* That is a graph traversal over the same entities the
platform already governs — it should not be a separate drawing.

Before the rebuild the canvas was frozen `NODES`/`EDGES` literals with no
backend. The headline "Supply Chain Risk Score /100" was
`mean(riskLevel label) × 25`, which could neither fall below 25 nor reach 100.
Throughput figures ('890K/day', '50K decisions/mo') were invented, both export
buttons only fired toasts, "SCCs required" came from a hardcoded boolean with no
jurisdiction input, and `useNavigate` was imported but never called — every node
was a dead end.

## How it works

- **Nodes** are built from `provenance_nodes` joined to the canonical registers
  through `useSupplyChainEntities`, which resolves `ai_models.id`,
  `vendors.id`, dataset ids and `use_cases.id` to display names. Inventory
  entities that have no lineage recorded yet are shown honestly behind a
  toggle, rather than omitted or invented.
- **Edges** come from `provenance_edges` — the same rows the
  [Provenance Graph](provenance.md) renders, so the two views cannot disagree.
- **Layout is computed** from the graph's longest-path ranks. There are no
  hardcoded coordinates.
- **Risk is read, not synthesised.** Each node shows the classification its own
  register records; a node whose register records none says so. There is no
  composite "/100" score.
- **Cross-border facts are reported as recorded.** `isCrossBorder` and
  `transferMechanismLabel` render `source_jurisdiction`,
  `target_jurisdiction` and `transfer_mechanism` from the edge, and state
  plainly when no mechanism is recorded. The page draws no legal conclusion.
- **Downstream impact** is a real BFS over the edge set (kept from the previous
  implementation, which was sound).
- **Export** downloads real files; the toast-only exports are gone.
- Every node deep-links to its record. `?model=<ai_models.id>` focuses the graph
  on that model with a dismissible chip.
- The canvas is read-only; it creates and mutates nothing, so it emits no
  `logAction` entries of its own — [Provenance](provenance.md), which owns the
  writes, does.

## Fields

This module has no table. Its inputs:

| Source | Used for | Module doc |
| --- | --- | --- |
| `provenance_nodes` | Node set, node type, verification state, artifact refs | [Provenance](provenance.md) |
| `provenance_edges` | Edges, edge type, jurisdictions, transfer mechanism, temporal validity | [Provenance](provenance.md) |
| `ai_models` | Model node names and classification (`ai_models.id`) | [Model Inventory](model-inventory.md) |
| `vendors` | Vendor node names and criticality (`vendors.id`) | [Vendor Registry](vendor-registry.md) |
| Dataset catalog | Dataset node names | [Data Governance](data-governance.md) |
| `use_cases` | Use-case node names (`use_cases.id`) | [Knowledge Graph & Use Cases](knowledge-and-marketplace.md) |

Field-level schema for the two backing tables lives in
[`provenance.md`](provenance.md).

## Interlinks

Outbound (all by uuid; unresolvable ids render "Unavailable", never a raw uuid):
- **Model** → `/models/inventory/<ai_models.id>`.
- **Vendor** → `/vendors/<vendors.id>`.
- **AIBOM** → `/aibom?model=<ai_models.id>`.
- **Attestations** → `/supply-chain?model=<ai_models.id>`.
- **Provenance** → `/provenance?model=<ai_models.id>`.

Inbound:
- `?model=<ai_models.id>` with a dismissible chip, from
  [AIBOM](aibom.md), [Attestations](supply-chain-attestations.md) and
  [Provenance](provenance.md).
- Reached from the AI Supply Chain area navigation. Note the sibling route:
  `/supply-chain` is the
  [attestations register](supply-chain-attestations.md); `/supply-chain/graph`
  is this canvas.

## Compliance

Mapped in [`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
and [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability", through the
provenance rows it renders.

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 10 | Visual traversal of the data lineage recorded in `provenance_edges` |
| EU AI Act Art. 25 | Value-chain view spanning vendors, models and datasets |
| EU AI Act Art. 73 | Blast-radius analysis for supplier- or data-caused incidents |
| ISO/IEC 42001 A.7.2 | Data provenance made inspectable |
| GDPR Chapter V | Cross-border edges reported with the jurisdictions and mechanism actually recorded — no asserted conclusion |

Org isolation is inherited from the RLS on `provenance_nodes`,
`provenance_edges` and the registers it joins to.

## Operations

- No service of its own; reads go through `useProvenanceGraph` and
  `useSupplyChainEntities`, so any fix to provenance or name resolution lands
  here automatically.
- Loading renders a skeleton, failure a real error state, an org with no lineage
  an honest empty state.
- Migration: its inputs are created by
  `supabase/migrations/20260822000002_supply_chain_esg_canonical.sql`.
