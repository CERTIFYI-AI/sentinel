# Notifications

**Route:** `/notifications` ·
**Backing:** `notifications` (org-scoped) ·
**Code:** `dashboard/src/components/ui/NotificationDrawer.tsx`,
`dashboard/src/pages/Notifications.tsx` ·
**Writers:** `dashboard/src/agents/notificationAgent.ts`,
`dashboard/src/agents/sentinels/reporting.ts`,
`supabase/functions/mesh-sentinels/index.ts`,
`supabase/functions/governance-dispatcher/index.ts`

## Purpose

The cross-module inbox. Governance events that need a human's attention —
a model registered, a risk detected, an incident created, a containment
executed, a regulator notified, a carbon budget exceeded — surface here with a
deep link to the record that produced them.

## Why it exists

A governance platform that only shows you things when you go looking is a
filing cabinet. Notifications are the push half: the mechanism by which an
autonomous agent's finding reaches a person. That makes this table part of the
human-oversight path, not a convenience feature.

## How it works

- The drawer reads the most recent rows and renders unread state, tone (derived
  from `notification_type`) and a deep link (`url_path`) into the originating
  module.
- Marking as read is a **checked write**: the update must return the affected
  ids, otherwise it throws. A row the reader cannot update (an RLS-denied
  broadcast, for example) never shows a fake "read" state.
- Reads throw on failure so the page renders a real error rather than an empty
  inbox — an empty inbox and a broken inbox must not look the same.
- Writers are both client-side agents and server-side edge functions; all of
  them insert with the canonical column names below.

## Fields

Canonical set, guaranteed present by
`20260828000001_notifications_schema_convergence.sql`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | text | Tenant scoping (era-1 lineage) |
| `org_id` | uuid | Tenant scoping (phase-4 lineage); kept consistent with `tenant_id` |
| `user_id` | text | Recipient; `'system'` for broadcasts |
| `title` | text | Headline shown in the drawer |
| `message` | text | Body text |
| `notification_type` | text | Event type — drives the tone chip; default `'info'` |
| `entity_type` | text | Kind of record that produced it (`model`, `incident`, `mesh`, `event`) |
| `entity_id` | text | The record's id, for the deep link |
| `is_read` | boolean | Default `false`; never null, so the unread count is meaningful |
| `read_at` | timestamptz | When it was read |
| `url_path` | text | In-app deep link to the originating record |
| `created_at` | timestamptz | Default `now()` |

## Interlinks

- **→ Model Registry / Incidents / Risks.** `url_path` and `entity_type` +
  `entity_id` deep-link to the record that raised the notification.
- **← Governance Mesh.** The sentinel fleet's digest and findings arrive here.
- **← Governance dispatcher.** Important platform events are fanned out here.

## Compliance

- **EU AI Act Art. 14 (human oversight).** Notifications are how an autonomous
  agent's finding reaches a person who can act on it. A dropped notification is
  a missed escalation, which is why every writer now checks its insert.
- **EU AI Act Art. 73 (serious incident reporting).** Incident notifications
  carry the deep link that starts the reporting clock.
- **ISO/IEC 42001 §9.1** — monitoring and evaluation feeding back to people.

## Operations

### The two-era schema, and the outage it caused

This table was created **twice**, in two eras with different column names, and
the second `CREATE TABLE` is `IF NOT EXISTS` — so whichever migration reached a
given database first silently won:

| Era | Migration | Columns |
| --- | --- | --- |
| 1 | `20260418000002_core_grc_tables` | `tenant_id`, `notification_type`, `message`, `entity_type`, `entity_id` |
| 2 | `20260421000006_phase4_foundation` | `org_id`, `type`, `body`, `resource_type`, `resource_id`, `url_path` |

The phase-4 migration heals an era-1 database *forward* (adding `org_id`,
`url_path`, `resource_*`), but nothing healed an era-2 database *back*. The
application reads era-1 names, so on an era-2 database every read failed with:

```
Could not load notifications: column notifications.notification_type does not exist
```

The application was split the same way: the drawer and two of three writers used
era-1 names, while `governance-dispatcher` wrote era-2 names **plus a `severity`
column that never existed in either era** — and did not check the insert result,
so those notifications were discarded silently.

`20260828000001_notifications_schema_convergence.sql` converges the table on the
canonical set above. It is **additive only** — it never drops a column, because
a deployment's starting shape cannot be observed from the repo and a dropped
column is unrecoverable — and it carries data across the naming split
(`type`→`notification_type`, `body`→`message`, `resource_*`→`entity_*`) so no
notification is lost. It then asserts that every column the drawer selects
exists, and fails loudly if not.

Verified against a real Postgres in both starting states: an era-2 table
(reproducing the reported error) and an era-1 table, each converging with its
existing row's content preserved, and re-running cleanly.

### Residual debt

The era-2 columns (`type`, `body`, `resource_type`, `resource_id`) are left in
place, empty, rather than dropped. Once every deployment is confirmed converged
they can be removed in a follow-up migration. Until then, **do not write to
them** — writers must use the canonical names.
