# Knowledge Graph & Marketplace

**Routes:** `/knowledge-graph`, `/marketplace`, `/use-cases`
**Status:** Production
**Owner:** Platform · **Backing table(s):** Knowledge Graph: aggregates from `ai_models`, `use_cases`, `datasets`, `agent_gov_registry` (org-scoped, RLS). Marketplace and Use Cases: their own respective tables.

## Purpose
Graph view of organisational entities (models, use cases, datasets, agents)
for contextual analytics and blast-radius analysis. Marketplace provides
curated templates and eval packs. Use Case library maps business outcomes to
model and control bundles.

## Why it exists
ISO/IEC 27001:2022 6.1 requires actions to address risks and opportunities
in context. NIST AI RMF GOVERN 2.1 requires documented policies and
processes. Understanding entity relationships — which models serve which use
cases, which datasets trained which models, which agents operate on which
entities — is prerequisite to impact analysis when something changes.

## How it works

### Knowledge Graph
1. Reads entities from `ai_models`, `use_cases`, `datasets`, and the agent
   registry — no separate graph table.
2. Renders an interactive SVG graph where nodes are clickable, navigating to
   the entity's detail page.
3. Three views: Visual Graph, Data-to-Use-Case Chains, and Entity Index
   table.
4. Entity counts are shown as KPI tiles (4 entity types).

### Marketplace
All marketplace items are open-source, signed, and reviewed; installation
requires explicit admin approval.

### Use Cases
Maps business outcomes to model and control bundles via the `use_cases`
table.

## Features — full breakdown

| Element | Type | What it does | Result / side-effect |
|---|---|---|---|
| Entity KPI tiles | metric row | Counts per entity type (models, use cases, datasets, agents) | Read-only aggregated |
| Visual Graph | SVG interactive | Entity relationship graph with clickable nodes | Read-only; navigate on click |
| Data Chains tab | list | Dataset → model → use case chains | Read-only derived |
| Entity Index tab | table | All entities in a searchable table | Read-only |
| Node click | navigation | Opens the entity's detail page | → `/models/inventory/:id`, `/datasets/:id`, etc. |

Nulls: entities with no relationships appear as isolated nodes. An empty
state renders when no entities exist.

## Interlinks
- **Outbound** — node clicks navigate to `/models/inventory/:id`,
  `/datasets/:id`, `/use-cases/:id`, `/agents/:id`.
- **Inbound** — reachable from sidebar nav (Executive & Reporting group).

## Compliance
- **ISO/IEC 27001:2022** — 6.1 (actions to address risks and opportunities).
- **NIST AI RMF** — GOVERN 2.1 (policies, processes, procedures).
- **COBIT 2019** — APO01 (managed I&T framework).

## Operations
Empty state: when no entities exist in any of the source tables, shows an
honest empty state. Pure read-only: graph is derived from existing entity
tables — no separate data storage. Realtime: not realtime; staleTime-based
React Query refresh.
