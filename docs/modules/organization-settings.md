# Organization Settings

**Route:** `/settings` → **General** and **Notifications** tabs ·
**Backing:** `organizations` (the tenant record), `notification_prefs` ·
**Service:** `dashboard/src/services/organizationService.ts`,
`dashboard/src/services/notificationPrefsService.ts` ·
**Hook:** `dashboard/src/hooks/useOrganization.ts`,
`dashboard/src/hooks/useNotificationPrefs.ts` ·
**Code:** `dashboard/src/pages/Settings.tsx` ·
**Migration:** `20260901000003_organization_settings_writable.sql`

## Purpose

Hold what this tenant is — its name, domain, industry, contact, timezone,
fiscal year — and let an administrator change it, with every screen following.

## Why it exists

The organisation's name is the most-shown string in the product. **28 pages**
put it in their subtitle, the board report prints it on every page and in its
provenance table, and the narrative engine writes it into prose an auditor
reads.

It came from a **hardcoded default in a browser localStorage store**:

```ts
// dashboard/src/stores/settingsStore.ts — deleted by this change
orgName: 'Dignep Group Pvt.Ltd.',
domain: 'certifyi.ai',
primaryContact: 'admin@certifyi.ai',
```

Three things were wrong with that, and they compound:

1. **Every tenant saw the same company.** A new customer's board report was
   headed with a demo company's name until somebody noticed and typed over it.
2. **The value never left one browser.** A second device, a colleague, or the
   same user after clearing site data was back to the default. Nothing was
   shared, so "the org name" was not a property of the organisation at all.
3. **Settings → General was a mock-up.** It rendered `defaultValue="CertifyI"`,
   a made-up `tenant_certifyi_prod` id, and a Save button wired to nothing.
   Typing a name and pressing Save changed neither the store nor the database.

Meanwhile `organizations` already had every one of those columns — `name`,
`domain`, `industry`, `company_size`, `primary_contact`, `timezone`,
`fiscal_year_start` (from `006_core` and `20260421000003`) — and no code read
them. The demo tenant was even seeded as **"Demo Tenant"**, so the name shown
in the product was never the name in the database.

## How it works

### One source of truth

`organizations` is it. `useOrgName()` reads it through a shared React Query key,
so a rename shows on all 28 pages at once rather than on whichever screens
happen to remount. `settingsStore.ts` is deleted — a second, client-side copy
of a governed value is exactly the shadow id-space the platform's first
principle rules out.

An unset name renders as **"Your organisation"**, never as a blank subtitle and
never as a placeholder company. The platform genuinely does not know the name
until somebody sets it, and saying so is the honest rendering.

### Who may change it

`ws02_org_self_read` (20260421000014) granted authenticated **SELECT only**, so
before this change a save would have failed at the database with a policy error
the operator could do nothing about. `20260901000003` adds the UPDATE policy,
scoped two ways:

| Clause | What it stops |
| --- | --- |
| `id = auth.current_org_id()` | renaming **another tenant's** organisation |
| `auth.has_permission('org.update')` | a non-administrator renaming this one |

Both appear in `USING` **and** `WITH CHECK`. `USING` decides which row you may
touch; `WITH CHECK` decides what it may look like afterwards. Without the
second, an administrator could move their organisation to another tenant's id.

Today only `org_admin` satisfies `org.update`, through its `'*'` grant. No
other role is given it, deliberately — renaming the organisation changes what
every exported report says the company is called.

### The refusal is silent, so the service is not

A PostgREST `UPDATE` that RLS refuses returns **no error and no row**. Treating
that as success is precisely the fake-success failure mode, so
`updateOrganization` throws when the update returns nothing:

> The change was not saved. Only an organisation administrator can edit these
> settings.

### Notifications

`notification_prefs` has existed since `20260421000003`, org-scoped with RLS,
and had **zero readers**. The tab that claimed to configure it rendered six
toggles whose on/off state was a literal in the JSX and whose clicks went
nowhere. Every switch now writes, and `org_id` is filled DB-side by
`get_org_id()` rather than sent from the browser.

The event types offered are the ones **this organisation has actually
emitted**, read from `governance_events`. Shipping a menu of events the
platform might one day raise would put rules in front of an operator for things
that never fire — coverage the platform does not have. An org that has emitted
nothing gets an honest empty state and a free-text field.

No rules configured means **nothing is being sent**, and the empty state says
so rather than implying a hidden default set.

### Three tabs retired

Team, API Keys and Compliance each rendered a hardcoded array with buttons that
did nothing, duplicating a module that already exists and works. A second, fake
copy of a real screen is worse than no copy: it splits where people look, and
it invents state.

| Retired tab | What it faked | Where the real thing is |
| --- | --- | --- |
| Team | 5 fixed people; "Invite Member" did nothing | `/access-control/users`, `/access-control/roles`, `/access-control/departments` |
| API Keys | 4 fixed keys; "Generate Key" did nothing | `/security/keys` (Keys Vault, real `api_keys`) |
| Compliance | 5 toggles describing platform behaviour, none stored | `/compliance/controls`, `/evidence-vault`, `/integrations`, `/autopilot` |

They are **not deleted outright**: `?tab=team`, `?tab=api-keys` and
`?tab=compliance` still resolve, to a card naming where the subject went and
linking to it. A tab people have used should not vanish (no dead ends). They no
longer appear in the sidebar.

The Compliance one is worth stating plainly: "Audit trail immutability" was a
switch. The audit chain is append-only by construction, not by preference —
offering it as a toggle implied it could be turned off, and implied somebody's
setting was keeping it on.

## Fields

### `organizations`

| Field | Column | Notes |
| --- | --- | --- |
| `id` | `id` | The tenant id. Read-only in the UI; every record in the workspace is scoped to it |
| `name` | `name` | **Required.** Shown on 28 pages, in the board report and in generated narrative |
| `domain` | `domain` | Unique across tenants |
| `industry` | `industry` | |
| `companySize` | `company_size` | Read falls back to the older `size` column so pre-20260421 rows are not shown blank |
| `primaryContact` | `primary_contact` | |
| `timezone` | `timezone` | Defaults `UTC`; used when a report states when its figures were measured |
| `fiscalYearStart` | `fiscal_year_start` | Defaults `January` |

### `notification_prefs`

| Field | Column | Notes |
| --- | --- | --- |
| `channel` | `channel` | `in_app` \| `email` \| `slack` \| `sms` |
| `eventType` | `event_type` | A `governance_events.event_type` value |
| `isEnabled` | `is_enabled` | |
| — | `org_id` | Filled DB-side by `get_org_id()`; never sent by the client |

## Interlinks

- **Organization → every page.** `useOrgName()` is read by 28 page components;
  a rename propagates through one shared query key.
- **Organization → board report.** The provenance table names `organizations`
  as the source of the organisation name, so the figure can be traced.
- **Settings → the modules that replaced its fake tabs.** Users Registry, Roles
  Management, Departments, Keys Vault, Controls, Evidence Vault, evidence
  sources and Autopilot are all linked from the retired tabs.
- **Notification prefs → governance events.** Rules are keyed on the event
  vocabulary the platform actually emits, not on a parallel list.

## Compliance

- **EU AI Act Art. 12 (record-keeping).** Renaming the organisation and every
  notification-rule change are audit-logged with a real actor via `logAction`.
  The row itself cannot carry who changed it; the audit entry can.
- **ISO/IEC 42001 §5.3 (roles and authorities).** Changing what the
  organisation is called is restricted to `org_admin` at the database, not by
  hiding a button.
- **Org isolation.** Both the read and the write policies are scoped to
  `auth.current_org_id()`, verified with a two-org probe: an administrator of
  org A cannot rename org B, and cannot move org A onto org B's id.
- **No fabricated state.** The retired tabs displayed people, credentials and
  compliance settings that did not exist. Nothing on this page is now shown
  that is not stored.

## Operations

- Renaming requires `org.update`. A user without it gets the database's refusal
  surfaced as a real error, not a silently dropped change.
- The old `sentinel-settings` localStorage key is now unused. It is left alone
  rather than migrated: it held one browser's copy of values that now come from
  the server, and reading it back would reintroduce the defect.
- The demo tenant is seeded as **Demo Tenant**
  (`00000000-0000-0000-0000-000000000001`). Rename it in Settings → General;
  no code change is needed and none is possible.

## History

- **2026-09-01** — Module created. The organisation name moved from a hardcoded
  string in a browser localStorage store to the `organizations` row, with the
  RLS UPDATE policy that made saving possible; `settingsStore.ts` deleted and
  its 28 consumers moved to `useOrgName()`. Settings → General rebuilt on the
  real record. Notifications given its first reader and writer against
  `notification_prefs`. Team, API Keys and Compliance retired to pointers at the
  modules that already do those jobs.
