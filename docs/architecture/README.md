# Architecture

How Sentinel is built: the request pipeline, the Supabase backend, how modules
connect to each other, and the decisions behind them.

| Document | What it covers |
|---|---|
| [overview.md](overview.md) | 30-minute deep dive: dual pipeline, the five governance layers, domain models, configuration, storage, concurrency, extension points |
| [how-it-works.md](how-it-works.md) | 5-minute read: the request lifecycle stage by stage, trust score computation, response headers, latency budget |
| [backend.md](backend.md) | Supabase backend summary: stack, multi-tenancy, core tables, autonomous agents, evidence chain |
| [INTERLINKS.md](INTERLINKS.md) | Canonical module-to-module data-flow reference; every arrow is a real table relationship, event or edge function |
| [SUPABASE_INTEGRATION.md](SUPABASE_INTEGRATION.md) | The contract between `dashboard/src` and the database: schema, RLS, Auth, Storage, Realtime, Edge Functions |
| [FUNCTIONAL_ACTIVATION.md](FUNCTIONAL_ACTIVATION.md) | Tier-by-tier plan to take each module from static UI to fully functional, with the triggers, crons and channels each needs |
| [ACTIVATION_RUNBOOK.md](ACTIVATION_RUNBOOK.md) | Step-by-step activation checklist derived from the plan above |

## Subsystem architecture

| Document | What it covers |
|---|---|
| [audit-log/ARCHITECTURE.md](audit-log/ARCHITECTURE.md) | Append-only, hash-chained `audit_log` table for WORM compliance, and how it relates to `audit_events` |
| [evidence-custody/ARCHITECTURE.md](evidence-custody/ARCHITECTURE.md) | Tamper-evident chain of custody for uploaded evidence, including the nightly verification worker |
| [governance-mesh/ARCHITECTURE.md](governance-mesh/ARCHITECTURE.md) | Event-driven agent fabric that turns business events into idempotent agent cascades |
| [db/schema_consolidation_plan.sql](db/schema_consolidation_plan.sql) | SQL plan for consolidating duplicate and legacy tables |

## Decision records

| Document | What it covers |
|---|---|
| [adr/README.md](adr/README.md) | Index of architecture decision records |

## Related

- [Modules reference](../modules/README.md)
- [Security model](../security/security-model.md)
- [Compliance frameworks](../compliance/overview.md)
- [Operations](../operations/README.md)
