# Four-role review — PRIVACY group (DSR, Consent, RoPA, DPIA, TIA)

Branch `claude/modules-audit-akm64k`. Gates run in order per
[`review-process.md`](../review-process.md); each re-checked the one before it.

## 1. Engineering & QA/QC — **PASS**

**Typecheck** — `cd dashboard && npx tsc --noEmit` clean.

**No fake success.** Four instances removed, all of which reported success over
a write that did not happen:

| Where | What it claimed | What happened |
|---|---|---|
| `dsrImpactAgent` | `status: 'succeeded'`, Art. 34 record created | Insert rejected on 5 wrong column names and 2 out-of-vocabulary values; `safeInsert` swallowed it |
| Consent withdrawal | "AI systems notified", withdrawal dated | Hardcoded `2026-04-10` written to local state; nothing notified |
| DSR export | "DSR exported as PDF" | No file produced |
| Consent export | success toast | No file produced |

All four now either write and confirm, or throw/return `failed`.

**No demo `<name>_table`.** All five pages read their canonical tables.

**Org scoping DB-side.** `org_id` / `tenant_id` default to
`current_user_org_id()` on all five tables; no service sends a tenant. The eight
tables that still carried a literal `'default'` default were corrected in
`20260816_reclaim_default_tenant_orphans.sql`.

**RLS.** No new tables. Removed a byte-identical duplicate `ALL` policy on
`consent_records` (`consent_records_org_isolation`, identical to
`consent_records_org`).

**Interlinks proven with a query.** All 17 satisfy `total = resolves`:

```
consent → model[]      10/10   dsar → consent          2/2    ropa → use_case   5/5
consent → ropa         10/10   dsar → dataset          4/4    ropa → vendor     3/3
dpia → model[]          4/4    dsar → model[]        13/13    tia → model[]     1/1
dpia → risk             3/3    dsar → ropa           10/10    tia → ropa        1/1
dpia → ropa             4/4    ropa → dataset[]        8/8    tia → vendor      4/4
dpia → use_case         3/3    ropa → model[]        14/14
```

**Vocabularies constrained, no stragglers.** 7 CHECK constraints across
`dsar_requests` and `consent_records`; distinct stored values after
normalisation:

```
dsar.status          completed, in_progress, in_review, pending
dsar.request_type    access, erasure, objection, portability, rectification
dsar.priority        high, normal
consent.status       expired, granted, withdrawn
consent.type         explicit, implicit
consent.legal_basis  consent, contract, legitimate_interests
tenant_id='default'  0 rows across all 8 affected tables
```

**Inbound and outbound links.** Every page both reaches other modules and is
reachable: `?open=<id>` on RoPA and Consent, `?model=<uuid>` filters on DSR,
Consent and RoPA, and Audit Trail now routes all five privacy entity types.

## 2. UI/UX — **PASS**

- **Platform primitives only.** DSR and Consent rebuilt on `PageHeader`,
  `DataTable`, `FormDialog`, `ConfirmDialog`; RoPA, DPIA and TIA already were.
  All five have skeleton, empty and error states.
- **Semantic colour tokens** throughout; no literal hex.
- **Null renders `—`, never `0`.** Enforced centrally in the new `LinkChips` /
  `LinkChip`, plus a deliberate distinction on the DSR clock: no deadline
  recorded renders "no deadline set", never "0d", which would read as due today.
- **Unresolvable ids show "Unavailable"**, also enforced in `LinkChips`. The raw
  uuid is now never shown at all — both pages had been printing it as the record
  id, and both tables gained citable references.
- **Simulated values labelled.** The 14-day cessation service level in
  `ConsentWithdrawalAgent` is Sentinel's own, not statutory, and says so; the
  withdrawal dialog states plainly that recording a withdrawal does not itself
  stop any system.
- **No dead-end records.** The Audit Trail gap was the significant one: no
  privacy entity type had a route, so every privacy entry terminated on exactly
  the records an auditor follows.

Two link targets were wrong and are fixed: `/risk?open=` loses its query string
through the `/risk → /risks` redirect, and vendors uses `/vendors/:id` rather
than `?open=`.

## 3. Documentation — **PASS**

- New group doc [`docs/modules/privacy.md`](../../modules/privacy.md) — purpose,
  why it exists, how it works, field tables for all five registers, interlinks
  both ways, compliance, operations. Linked from `docs/modules/README.md`.
- `docs/modules/dsr-consent.md` corrected: its field list advertised
  `ai_systems_affected` / `ai_systems`, both now dropped, and its vocabulary
  section claimed deriving values from stored data was sufficient — it was not,
  which is why the CHECK constraints exist.
- `CHANGELOG.md` updated.
- Every migration carries a *why* comment, including what was checked before the
  destructive one.

## 4. Compliance — **PASS**

- **Mapped** in `docs/compliance/eu-ai-act-mapping.md`, extended with a section
  for the autonomous agents. Stale `ai_systems_affected` references corrected.
- **Art. 12 audit logging** via `logAction` on every privacy write, including
  the new `withdraw` action. Agent writes additionally carry `source`,
  `auto_generated`, `created_by_agent` and `source_event_id`.
- **Art. 14 human oversight.** The agents open risks and tasks; none closes a
  risk, accepts a residual risk, or edits a statutory record. Judging a transfer
  lawful or a residual risk acceptable stays a human decision.
- **Evidence chain not weakened — strengthened.** DSR delete became a soft
  delete (the record is the proof the one-month clock was met), reads now filter
  `is_deleted`, and 15 rows that were unreachable under RLS were recovered.
- **Secrets.** N/A — this change stores no credentials.

## Accepted debt

None new. One pre-existing observation, recorded rather than fixed here:
`audit_log` holds 2 rows platform-wide, because seed data was inserted through
SQL migrations rather than through the UI, and `logAction` only runs in the
browser. The insert policy and column default agree
(`current_user_org_id()`), so the trail works when driven from the product —
but it has not been exercised end-to-end, and that is worth a deliberate test
rather than an assumption. Not introduced by this change.
