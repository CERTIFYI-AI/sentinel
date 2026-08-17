# Provenance Graph

**Route:** `/provenance` ·
**Backing:** `provenance_nodes` + `provenance_edges` (org-scoped RLS) ·
**Code:** `dashboard/src/pages/ProvenanceGraph.tsx`,
`dashboard/src/services/provenanceService.ts`,
`dashboard/src/hooks/useProvenanceData.ts`,
`dashboard/src/hooks/useSupplyChainEntities.ts` (name resolution)

## Purpose

A typed, directed graph of where a model came from: the datasets it was trained
on, the components it was built from, the pipelines that fed it, and the
cross-border transfers along the way.

## Why it exists

EU AI Act Art. 10 requires data governance over training and operational data,
and incident forensics requires a specific question to be answerable: *what fed
this model on the date of the incident?* That needs typed edges with temporal
validity, not a picture.

Before the rebuild the page had no backend at all — two in-file literals keyed
by the business code `'MDL-001'`, which collided with a *different* `MDL-001` in
the Supply Chain Graph. The renderer discarded the declared `children` edges and
drew a flat root-plus-children list, so a depth-3 lineage was unrenderable and
the drawing misrepresented the data it was given. "Provenance Verified" was a
boolean literal, and Export was a success toast.

## How it works

- Nodes and edges are real rows. Edges are typed (`derived_from`, `trained_on`,
  `built_by`, `deployed_as`, `feeds`, `uses`, `produces`) and carry
  `valid_from` / `valid_to`, so the graph can be read as of a date.
- `provenanceService` builds the adjacency from the edge rows
  (`buildAdjacency`), finds roots (`rootNodeIds`), walks both directions
  (`descendantIds`, `ancestorIds`) and computes ranks (`computeRanks`) for
  layout. The renderer follows the real edges — arbitrary depth, no flattening.
- A `CHECK` constraint (`provenance_edges_no_self_loop`) prevents an edge from
  pointing at its own source.
- **Cross-border facts are recorded, not concluded.** `source_jurisdiction`,
  `target_jurisdiction`, `transfer_mechanism`, `legal_basis`, `pii_categories`
  and `retention_period` live on the edge. `isCrossBorder` and
  `transferMechanismLabel` render what is recorded; the page no longer asserts
  "SCCs required" from a hardcoded boolean with no jurisdiction input.
- **Verification is not performed.** `verification_status` defaults to
  `unverified` on every node and is written only by a verifier, alongside
  `verified_at`, `verified_by` and `verification_method`. The SLSA and in-toto
  fields (`slsa_level`, `predicate_type`, `builder_identity`,
  `artifact_digest`) exist so real attestation verification has somewhere to
  land — nothing verifies them today (TD-011).
- `org_id` is filled by the DB default `current_user_org_id()`.
- Node and edge create/update/delete all call `logAction` (EU AI Act Art. 12).
- `?model=<ai_models.id>` scopes the graph to that model's lineage with a
  dismissible chip; `?open=<provenance_nodes.id>` selects a node.
- Null renders `—`; an unresolvable entity id renders "Unavailable", never a raw
  uuid.

## Fields (`provenance_nodes`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `node_type` | text NOT NULL | `model` / `dataset` / `component` / `vendor` / `data_source` / `pipeline` / `output` |
| `label` | text NOT NULL | Display label |
| `model_id` | uuid → `ai_models(id)` ON DELETE CASCADE | Set when the node *is* a governed model |
| `vendor_id` | uuid → `vendors(id)` ON DELETE SET NULL | |
| `dataset_id` | uuid | → dataset catalog id |
| `use_case_id` | uuid | → `use_cases.id` |
| `version` | text | |
| `artifact_uri` | text | Immutable OCI/artifact reference |
| `artifact_digest` | text | |
| `source_repo` / `source_commit` / `build_id` | text | Build provenance |
| `builder_identity` | text | |
| `built_at` | timestamptz | |
| `slsa_level` | text | SLSA Build L1–L3 |
| `predicate_type` | text | in-toto predicate |
| `verification_status` | text NOT NULL, default `unverified` | Written only by a verifier |
| `verified_at` | timestamptz | Written only by a verifier |
| `verified_by` | uuid | Written only by a verifier |
| `verification_method` | text | Written only by a verifier |
| `license_spdx` | text | |
| `metadata` | jsonb NOT NULL, default `{}` | |
| `created_at` / `updated_at` | timestamptz NOT NULL, default `now()` | |

## Fields (`provenance_edges`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, default `gen_random_uuid()` | Primary key |
| `org_id` | uuid NOT NULL, default `current_user_org_id()` | Tenant scope (DB-filled) |
| `source_node_id` | uuid NOT NULL → `provenance_nodes(id)` ON DELETE CASCADE | |
| `target_node_id` | uuid NOT NULL → `provenance_nodes(id)` ON DELETE CASCADE | |
| `edge_type` | text NOT NULL | `derived_from` / `trained_on` / `built_by` / `deployed_as` / `feeds` / `uses` / `produces` |
| `source_jurisdiction` / `target_jurisdiction` | text | Recorded facts, not conclusions |
| `transfer_mechanism` | text | `SCC` / `BCR` / `adequacy` / `derogation` / `none` |
| `legal_basis` | text | |
| `pii_categories` | text[] NOT NULL, default `{}` | |
| `retention_period` | text | |
| `valid_from` / `valid_to` | timestamptz | Temporal validity — makes "what fed this model on date X" answerable |
| `metadata` | jsonb NOT NULL, default `{}` | |
| `created_at` | timestamptz NOT NULL, default `now()` | |
| — | CHECK `provenance_edges_no_self_loop` | `source_node_id <> target_node_id` |

## Interlinks

Outbound (all by uuid):
- **Model** → `/models/inventory/<model_id>` for any node carrying one.
- **Vendor** → `/vendors/<vendor_id>`.
- **AIBOM** → `/aibom?model=<model_id>`.
- **Attestations** → `/supply-chain?model=<model_id>`.
- **Supply chain graph** → `/supply-chain/graph?model=<model_id>`.

Inbound:
- `?model=<ai_models.id>` with a dismissible chip, from
  [AIBOM](aibom.md), [Attestations](supply-chain-attestations.md) and the
  [Supply Chain Graph](supply-chain-graph.md).
- `?open=<provenance_nodes.id>` selects a node directly.
- The [Supply Chain Graph](supply-chain-graph.md) derives its edges from
  `provenance_edges`, so the two views share one edge set.

## Compliance

Mapped in [`../compliance/eu-ai-act-mapping.md`](../compliance/eu-ai-act-mapping.md)
and [`../compliance/iso-42001-mapping.md`](../compliance/iso-42001-mapping.md),
"Module Coverage — Vendors/TPRM, AI Supply Chain & Sustainability".

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 10 | Data governance — typed `trained_on` / `derived_from` edges with temporal validity |
| EU AI Act Art. 12 | Node and edge lifecycle audit-logged via `logAction` |
| EU AI Act Art. 13 | Traceability of the components and data behind a system |
| ISO/IEC 42001 A.7.2 | Data for AI systems — provenance with artifact digests, build/source refs and SLSA level fields |
| GDPR Chapter V | Transfer facts (`source_jurisdiction`, `target_jurisdiction`, `transfer_mechanism`, `legal_basis`) recorded on the edge |

**Not implemented:** attestation/signature verification. Every node reads
`unverified`; see TD-011 in
[`../reference/technical-debt.md`](../reference/technical-debt.md). The page
does not render a "Provenance Verified" badge.

Org isolation: RLS policies `provenance_nodes_org_all` and
`provenance_edges_org_all` on `org_id`, filled by the DB default. The demo graph
is depth 3 by design so the recursive edge-following is genuinely exercised.

## Operations

- Service: `provenanceService.ts` — `fetchProvenanceNodes`,
  `fetchProvenanceEdges`, `createProvenanceNode`, `updateProvenanceNode`,
  `deleteProvenanceNode`, `createProvenanceEdge`, `deleteProvenanceEdge`, plus
  the graph helpers `buildAdjacency`, `rootNodeIds`, `descendantIds`,
  `ancestorIds`, `computeRanks`, `isCrossBorder`, `transferMechanismLabel`.
  All writes throw on error.
- Hook: `useProvenanceData.ts`, invalidating the node and edge query keys
  together.
- Migration:
  `supabase/migrations/20260822000002_supply_chain_esg_canonical.sql`.
