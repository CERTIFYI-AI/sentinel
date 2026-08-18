# Model Risk Committee (MRC)

**Route:** `/mrc` ·
**Backing:** `mrc_meetings` + `mrc_agenda_items` + `mrc_votes` +
`mrc_committee_members` (all org-scoped RLS) ·
**Code:** `dashboard/src/pages/ModelRiskCommittee.tsx`,
`dashboard/src/services/mrcService.ts`, `dashboard/src/hooks/useAiiaData.ts`
(`useMrc`)

## Purpose

The committee that approves models for production and records the vote. Meetings
hold agenda items (model reviews); each item accrues votes and a recorded
committee decision; quorum is counted from the committee roster.

## Why it exists

SR 11-7 §IV.C and EU AI Act Art. 9 require documented model-approval governance
with recorded, quorate decisions. The meetings, agenda items and votes were
already on real org-scoped tables — but the **committee roster** lived in
`modelriskcommittee_table (id, doc jsonb)`: no tenant column, no RLS, seeded
from seven hardcoded names in the page file. Quorum is the only thing that makes
a vote binding, and it was being computed from fiction. The 2026-08-25 wave
moves the roster to `mrc_committee_members` (real table, RLS, linked to the org
directory).

**The model interlink was broken and invisible.** On a from-zero replay,
`mrc_agenda_items.model_id` and `mrc_votes.model_id` resolved to **0 of 12**
`ai_models` rows — the AIIA seed wrote model uuids that exist in no registry
row, while the tables' denormalised `model_name` rendered a plausible name over
a dead link. `model_id` was `text` with no foreign key, so any string was legal.
`20260825000003_last_demo_table_retirement.sql` converts it to `uuid`,
re-resolves each reference by name against `ai_models` (nulling what does not
resolve — never inventing), then adds the FK. Post-migration: **agenda items
4/4, votes 8/8 resolve**, and a fabricated id is now rejected by the database.

## How it works

- **Real tables, org-scoped.** `mrcService` reads/writes all four tables;
  `org_id` filled by the DB default `current_user_org_id()`. Writes throw;
  every create / decision / vote / member change calls `logAction` (Art. 12).
- **Decision is derived from the record, quorum from the roster.** `tallyVotes`
  sums the recorded votes; quorum counts `mrc_committee_members` rows with
  `counts_toward_quorum = true`. Neither is hand-authored.
- **Model names resolve, never fall back to the stale label.** An agenda item
  whose `model_id` does not resolve renders "Unavailable" — the denormalised
  `model_name` is display metadata only and is never shown in its place. The
  model pill links to `/models/inventory/:id`.
- **A thrown query renders an `ErrorState`**, never an empty agenda.
- `?model=<ai_models.id>` narrows the agenda to a model with a dismissible chip;
  `?open=<mrc_agenda_items.id>` opens that item's vote dialog (applied-once).

## Fields

`mrc_agenda_items` (the model-review record):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `org_id` | uuid, default `current_user_org_id()` | Tenant scope |
| `meeting_id` | uuid → `mrc_meetings(id)` | |
| `title` | text NOT NULL | |
| `model_id` | uuid → `ai_models(id)` ON DELETE SET NULL | **The** model link (converted from text + FK added 2026-08-25) |
| `model_name` | text | Denormalised display label only |
| `review_type` | text | `Model Review` / `Go-Live` / `Incident` / `Periodic` |
| `decision` | text | `pending` / `approved` / `rejected` / `deferred` / `conditional` |
| `decided_at` | timestamptz | |

`mrc_committee_members` (the roster, new 2026-08-25):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `org_id` | uuid, default `current_user_org_id()` | Tenant scope |
| `user_id` | uuid → `user_profiles(id)` | The real person |
| `member_name` | text NOT NULL | Display label |
| `committee_role` | text | |
| `is_chair` | boolean | |
| `counts_toward_quorum` | boolean | Quorum is counted from this |

`mrc_votes` carries `agenda_item_id`, `model_id` (→ `ai_models`, FK added
2026-08-25), `voter_id`, `vote` (`approve`/`reject`/`abstain`), `rationale`.

## Interlinks (both directions)

- **Outbound:** agenda items and votes → the model detail page; committee
  members → the org directory (`user_profiles`).
- **Inbound:** a model's detail page reaches its committee reviews via
  `/mrc?model=<id>`; `?open=<id>` opens an agenda item.

## Compliance

- Federal Reserve SR 11-7 (model risk management, quorum, recorded dissent).
- EU AI Act Art. 9 (risk-management system), Art. 14 (human oversight — the
  committee is the oversight body). Art. 12 audit logging via `logAction`.

## Operations

Members are drawn from the org directory; account permissions remain governed in
Access Control. A vote requires a rationale (audit trail). Quorum status is
shown against the next upcoming (else most recent) meeting.
