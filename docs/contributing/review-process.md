# Mandatory Review Process

> **This process is binding.** No change reaches `main` until all four role gates
> below have been run and recorded. The gates are not advisory and they are not
> optional for "small" changes — a one-line change that silently drops org
> scoping is more dangerous than a thousand-line feature.

Sentinel is a regulated-industry product: customers use it as the system of
record for AI Act and ISO/IEC 42001 conformity. A defect here is not a broken
screen, it is a governance record that a regulator may later rely on. That is why
review is structured as four distinct roles rather than one generic "code review".

---

## The four gates

Every change passes all four, **in order**, and each gate checks the previous
ones rather than trusting them.

| # | Gate | Owner role | Blocks merge on |
| --- | --- | --- | --- |
| 1 | Engineering & QA/QC | QA/QC Engineer | Fake success, unscoped writes, broken interlinks, failing typecheck |
| 2 | UI/UX consistency | UI/UX Engineer | Off-pattern components, invented metrics, dead-end records |
| 3 | Documentation | Documentation Expert | Undocumented module, stale field list, missing user guide |
| 4 | Compliance | Senior Compliance Officer | Unmapped control, weakened evidence chain, unjustified claim |

### Cross-checking is required

Each gate explicitly re-checks the gate before it. This is the point of the
process — a single reviewer wearing four hats in sequence will rubber-stamp
their own earlier decision.

- **UI/UX** re-checks that what QA passed actually renders honestly (a passing
  test with a fabricated `0` is a UI/UX failure, not a QA success).
- **Documentation** re-checks that the fields UI/UX approved match what the
  service actually reads and writes. A field in the UI but not in the doc means
  one of the two is wrong.
- **Compliance** re-checks all three: it asks whether the documented behaviour,
  as implemented and as rendered, would survive an auditor asking "show me".

If a later gate finds a defect, the change goes back to the failing gate. It does
not get waived because the change is "already reviewed".

---

## Gate 1 — Engineering & QA/QC

**Question the reviewer is answering:** *if this ships, can it silently produce a
wrong governance record?*

### Hard blockers

- [ ] `cd dashboard && npx tsc --noEmit` passes with zero errors.
- [ ] **No fake success.** Every service write throws on failure; every success
      toast fires only after the write resolves. A `.catch()` that swallows an
      error and returns the input record is an automatic fail.
- [ ] **No demo tables.** No page reads a generic `<name>_table (id, doc jsonb)`
      table. Reads and writes go to the real, tenant-scoped table.
- [ ] **Org scoping is DB-side.** The tenant column is filled by the
      `current_user_org_id()` default, never sent by the client. A literal
      (`tenant_id: 'default'`) is an automatic fail.
- [ ] **RLS is enabled** on every new table, with an isolation policy covering
      both `using` and `with check`.
- [ ] **One id-space.** Entities are referenced by uuid (`ai_models.id`,
      `use_cases.id`, …), never by name, slug or business code. Display names
      resolve at render time.
- [ ] **No local-only mutation.** A page must not hold a shadow copy of server
      state that its mutations write to instead of the backend.

### Interlink verification (run it, don't assume it)

Every new relationship is proven with a query before merge, not eyeballed:

```sql
-- Template: does every stored reference actually resolve?
select 'child→parent' as link,
       count(*) filter (where fk_col is not null)                      as total,
       count(*) filter (where fk_col in (select id from parent_table))  as resolves
from child_table;
```

`total` must equal `resolves`. Record the result in the PR description.

- [ ] Every new foreign key / id array resolves 100%.
- [ ] The new module has at least one **inbound** link from elsewhere in the
      platform, and at least one **outbound** link out of it. A module reachable
      only from the sidebar is unfinished — see the isolation check below.

```bash
# Inbound-link check for a route, excluding chrome (sidebar, routes, breadcrumbs,
# command palette, user guide). Zero means the module is isolated.
grep -rn -- "'/your-route'" --include=*.tsx --include=*.ts dashboard/src \
  | grep -v "components/Sidebar.tsx\|App.tsx\|lib/breadcrumbs.ts\|CommandPalette.tsx\|UserGuideDrawer.tsx" \
  | wc -l
```

---

## Gate 2 — UI/UX consistency

**Question the reviewer is answering:** *would a Fortune 500 risk officer trust
what this screen is telling them?*

### Pattern conformance

The platform has one visual language. New screens use the existing primitives
rather than inventing parallel ones:

- [ ] `PageHeader` with title, subtitle and icon — not a bespoke heading.
- [ ] `DataTable` for list views (sort / search / paginate come free).
- [ ] `FormDialog` + `Field` for create/edit; `ConfirmDialog` for destructive
      actions, with `isDestructive` set.
- [ ] `TableSkeleton` / `EmptyState` / `ErrorState` for the three non-happy
      states. All three must be handled — a screen with no error state is
      incomplete.
- [ ] Semantic colour tokens only (`hsl(var(--s-ok-tx))`, `--s-wn-*`, `--s-er-*`,
      `--text-1..4`, `--border`). No raw hex, no hard-coded light/dark colours.
- [ ] Status and risk vocabularies match the rest of the platform; a new module
      does not invent a fifth spelling of "in progress".

### Honesty of the interface

This is where the platform's credibility lives:

- [ ] **No invented data.** Nothing is displayed as measured unless it was
      measured. No placeholder percentages, no illustrative counts.
- [ ] **Null is not zero.** "Not measured" renders as `—`. A metric that has
      never been collected must never render as `0`, which reads as "measured,
      and the answer was none".
- [ ] **Simulations are labelled.** Anything generated locally to rehearse
      behaviour says so on screen, and points to where the real telemetry lives.
- [ ] **Unresolvable ids show "Unavailable"** — never a raw uuid.
- [ ] **No dead ends.** A record links to the entities it references, and is
      reachable back from them. Prefer an embedded real figure over a bare link:
      "Fallback failovers · 3, 1 failed" beats "Fallback failovers →".
- [ ] Loading states never flash a premature zero into a stat tile.

---

## Gate 3 — Documentation

**Question the reviewer is answering:** *could a new user, and a new engineer,
each do their job from the docs alone?*

- [ ] `docs/modules/<module>.md` exists and follows the standard shape (purpose,
      why it exists, how it works, fields, interlinks, compliance, operations).
      **A new module without a module doc does not merge.**
- [ ] The **field table matches the schema.** Every column the service reads or
      writes appears, with its type and meaning. Renaming a field without
      updating the doc is a documentation failure, not a nit.
- [ ] Interlinks are documented in both directions: what this module links to,
      and what links back to it.
- [ ] `README.md` is updated when the change alters the platform surface,
      architecture, or agent mesh.
- [ ] `CHANGELOG.md` reflects user-visible change.
- [ ] Migration files live in `supabase/migrations/`, are idempotent, and carry a
      header comment explaining *why* the change was needed — not just what it
      does. The file stays in the repo even when applied live.
- [ ] Counts and claims in documentation are verified against the code, not
      carried over from a previous draft. (A hardcoded "27 agents" banner that
      disagreed with the 26 real agents shipped for months — this check exists
      because of that.)

---

## Gate 4 — Compliance

**Question the reviewer is answering:** *if a regulator asked us to evidence
this, could we?*

Reviewed against **EU AI Act** and **ISO/IEC 42001** (the AI management system
standard — note it is 42001, not 4200), plus GDPR where personal data is in
scope.

- [ ] The module is mapped in `docs/compliance/eu-ai-act-mapping.md` and
      `docs/compliance/iso-42001-mapping.md`, or is explicitly recorded as
      out of scope with a reason.
- [ ] **Article 12 (record-keeping):** governance actions are audit-logged via
      `logAction`, with module, entity type, entity id and action.
- [ ] **Article 14 (human oversight):** where the module can act autonomously,
      a human review path exists and is reachable.
- [ ] **Article 10 (data governance):** where training or evaluation data is
      touched, provenance, PII status and representativeness are recorded.
- [ ] **Article 13 (transparency):** what the system produced versus what a human
      decided is distinguishable in the record.
- [ ] **Evidence integrity:** changes near evidence capture must not weaken the
      tamper-evident hash chain. Soft-delete (`is_deleted`) is used rather than
      hard delete wherever a record may be evidence.
- [ ] **Data minimisation:** no secret is stored in plaintext (store a digest and
      a display prefix); no personal data is introduced without a lawful basis
      recorded in the RoPA module.
- [ ] Retention and deletion behaviour is stated in the module doc.

### Tenant-isolation regression query (run on any RLS change)

Postgres **OR-combines** PERMISSIVE policies, so a single policy without a
tenant predicate silently defeats every correct policy on the same table.
"RLS is enabled" and "an isolation policy exists" are both insufficient.

This must return **zero rows**:

```sql
select p.tablename, p.policyname, p.cmd, p.qual
from pg_policies p
where p.schemaname='public'
  and p.permissive='PERMISSIVE'
  and p.tablename not like '%\_table'            -- demo tables: see TD-001
  and not (p.roles::text='{service_role}')
  and coalesce(p.qual,'') not like '%org_id%'
  and coalesce(p.qual,'') not like '%tenant_id%'
  and coalesce(p.qual,'') not like '%auth.uid%'
  and coalesce(p.qual,'') not like '%service_role%'
  and p.cmd in ('SELECT','ALL')
  and exists (select 1 from information_schema.columns c
              where c.table_schema='public' and c.table_name=p.tablename
                and c.column_name in ('org_id','tenant_id'));
```

- [ ] The query above returns zero rows.
- [ ] New policies use `current_user_org_id()` — not one of the four legacy
      helpers (see TD-003 in the technical-debt register).

---

## Recording the review

The PR description carries a completed checklist — four sections, each with the
reviewer role and the evidence:

```markdown
## Gate 1 — QA/QC
- typecheck: pass
- interlink: task→model 4/4, task→integration 2/2 (query output pasted)
- inbound links to /new-module: 3

## Gate 2 — UI/UX
- primitives: PageHeader, DataTable, FormDialog, ConfirmDialog, all three states
- honesty: null renders "—"; no simulated values shown as measured

## Gate 3 — Documentation
- docs/modules/new-module.md added; field table matches migration
- README platform surface updated; CHANGELOG entry added

## Gate 4 — Compliance
- EU AI Act: Art. 12 logAction wired; Art. 14 HITL path present
- ISO/IEC 42001: mapped to A.6.2.6, A.8.3
- evidence: soft-delete only; secrets stored as sha256 digest
```

A gate that genuinely does not apply is marked **N/A with a reason**. It is never
left blank, and "N/A" without a reason is treated as a failed gate.

---

## When a gate fails

State the failure plainly, fix it, and re-run the gate. Do not:

- widen scope to work around it,
- ship it behind a flag and promise to fix it later without a tracked entry, or
- record it as passing because the rest of the change is good.

Known, accepted debt goes in `docs/reference/technical-debt.md` with an owner and
a reason. Debt that is not written down does not exist, and will be rediscovered
by an auditor instead of by us.
