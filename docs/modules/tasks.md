# Tasks

**Route:** `/tasks` · **Service:** `taskService.ts` · **Hook:** `useTaskData.ts`
**Table:** `tasks`

## Purpose

The platform's governance work queue. Every finding that requires human action —
a bias gap, a failed validation, a degraded connector, an overdue training —
becomes a task with an owner, a due date and a link back to the record that
raised it.

## Why this module exists

Governance findings that do not become tracked work are findings that do not get
fixed. The AI Act's risk-management obligation (Art. 9) is continuous: it is not
satisfied by *detecting* a risk but by *managing* it to closure, with evidence of
the path taken.

This module is where that evidence accumulates:

1. **Accountability** — every finding has a named owner and a due date.
   (ISO 42001 A.3.2)
2. **Traceability** — `linked_entity_type` / `linked_entity_id` tie the task to
   the governed entity, so a model record can show its open work and a task can
   show what it is about. (Art. 12 record-keeping)
3. **Timeliness** — SLA fields make lateness a computed fact.
   (Art. 9 continuous risk management)
4. **Escalation** — blocked-by relationships and watchers make dependencies and
   interested parties explicit.

## How it works

Tasks live in the canonical org-scoped `tasks` table. The board supports a table
view and a Kanban view; **every mutation persists** — create, edit, delete, bulk
status/priority change, and Kanban drag all write to the backend and only then
report success.

The service maps the UI's flat shape onto the richer table: `assignee` ↔
`assignees[0]`, `dueDate` ↔ `due_date`, and the display source fields into
`linked_items` jsonb, while `linked_entity_type` / `linked_entity_id` carry the
canonical interlink. Unknown keys are dropped rather than sent, because Postgres
rejects unknown columns and silently swallowing that error is what previously
made failed writes look successful.

Deletion is a **soft delete** (`is_deleted`), because a closed remediation task
is evidence of how a risk was managed.

## Fields

| Column | Type | Meaning |
|---|---|---|
| `id` | text | Task id |
| `tenant_id` | text | Tenant, defaulted DB-side to `current_user_org_id()::text` |
| `title` / `description` | text | What must be done |
| `status` | text | `todo` · `in_progress` · `review` · `done` · `overdue` · `blocked` (legacy values normalised on read) |
| `priority` | text | `critical` · `high` · `medium` · `low` |
| `assignees` | text[] | Owners; the UI surfaces the first as primary |
| `watchers` | uuid[] | Interested parties |
| `due_date` | timestamptz | Target date |
| `sla_due_at` / `sla_breached` | timestamptz / bool | SLA tracking |
| `linked_entity_type` | text | `model` · `integration` · `training` · `vendor` · … |
| `linked_entity_id` | uuid | Canonical id of the governed entity |
| `linked_items` | jsonb | Display source label and deep link |
| `blocked_by` | uuid[] | Dependency edges |
| `categories` | text[] | Grouping |
| `recurrence_rule` / `recurrence_next` | text / date | Recurring obligations |
| `effort_estimate_hours` / `actual_hours` | numeric | Effort tracking |
| `auto_generated` | boolean | Raised by a governance agent rather than a human |
| `is_deleted` | boolean | Soft delete — closed tasks are evidence |

## Interlinks

- **Tasks → Models / Integrations / Trainings / Vendors** — via
  `linked_entity_type` + `linked_entity_id`; `linked_items.sourceLink` carries
  the deep link the row renders.
- **Governance agents → Tasks** — `HITLAgent`, `RemediationPlannerAgent` and
  `TrainingUpdateAgent` create tasks as part of their cascades, with
  `auto_generated` set.
- **Integrations → Tasks** — the issue-tracker connector syncs tasks two ways.

## Compliance

| Control | How this module satisfies it |
|---|---|
| EU AI Act Art. 9 | Continuous risk management — findings tracked to closure with SLA |
| EU AI Act Art. 12 | Task lifecycle audit-logged; closed tasks retained as evidence |
| EU AI Act Art. 14 | Human-in-the-loop reviews are raised here as tasks |
| ISO/IEC 42001 A.3.2 | Documented accountability per finding |
| ISO/IEC 42001 A.6.2.8 | Corrective action and continual improvement |

## Operations

- **Bulk changes** are applied across the selection and the toast fires only
  after every write resolves; on failure the selection is retained for retry.
- **Kanban drag** persists the column move; the board re-renders from the
  invalidated query rather than from optimistic local state.
- **Retention:** never hard-delete. A remediation task is the record of how a
  risk was closed.

## History

The page previously read the real `tasks` table but used it only to seed local
state — every mutation wrote to memory and toasted success regardless. The
service swallowed all errors and returned the input record, sent a client-supplied
`tenant_id: 'default'` (so new rows landed outside org isolation), and read an
`assignee` column that does not exist. See
`supabase/migrations/20260816_integrations_canonical.sql` for the tenant-default
repair.
