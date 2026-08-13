# Archive

**These are historical engineering working notes, retained for provenance. They
are not product documentation.**

Everything here was written to coordinate or record a specific piece of
engineering work — a workstream plan, an audit snapshot, a session context file.
Each document describes the state of the repository at the time it was written,
and much of it is stale. Nothing here is maintained, and none of it should be
read as a description of how Sentinel currently behaves. For that, start at
[the documentation index](../README.md).

They are kept because they explain *why* parts of the system look the way they
do, and because the audits record findings that may not all be closed yet.

This page is the index for the whole archive, including its subdirectories —
they deliberately carry no index pages of their own.

## Session and release context

| Document | What it recorded |
|---|---|
| [AGENT_CONTEXT.md](AGENT_CONTEXT.md) | Engineering context handed to AI coding sessions: stack, design tokens, and the conventions expected of new code |
| [CHECKPOINT.md](CHECKPOINT.md) | Release checkpoints and deployment notes, newest first |

## Audits and reviews

| Document | What it recorded |
|---|---|
| [MODULES_AUDIT.md](MODULES_AUDIT.md) | Module-by-module audit of what was actually wired versus what the documentation claimed |
| [AUDIT_REPORT.md](AUDIT_REPORT.md) | Platform audit written during the Platform Unification Sprint |
| [audits/](audits/) | Phase 5 completion matrix and the new findings raised alongside it |
| [crud-audit/](crud-audit/) | WS3 CRUD completeness and service-hardening review, with its generated report in Markdown and JSON |

## Workstream plans

| Document | What it recorded |
|---|---|
| [ph3-combined-roadmap/](ph3-combined-roadmap/) | Proposed merge of the Phase 3 foundation programme with the UX sprint |
| [ph3-foundation-pack/](ph3-foundation-pack/) | Consolidated Phase 3 foundation workstreams (audit chain app layer, form framework, observability, CI/test harness) |
| [ph3-ws01-data-layer/](ph3-ws01-data-layer/) | Typed data-layer contract for reaching Supabase from application code |
| [ph3-ws02-rls-sweep/](ph3-ws02-rls-sweep/) | Row-level-security sweep across tenant-scoped tables |
| [ph3-ws03-rbac/](ph3-ws03-rbac/) | RBAC workstream plan |
| [scaffolded-modules/](scaffolded-modules/) | WS2 scaffolding of GA-critical module shells so navigation resolved before services landed |

## Where the living versions are

| Instead of an archived note, read |
|---|
| Conventions for new code: [`CLAUDE.md`](../../CLAUDE.md) and [`CONTRIBUTING.md`](../../CONTRIBUTING.md) |
| Release history: [`CHANGELOG.md`](../../CHANGELOG.md) |
| Current module reference: [modules/](../modules/README.md) |
| Current architecture: [architecture/](../architecture/README.md) |
