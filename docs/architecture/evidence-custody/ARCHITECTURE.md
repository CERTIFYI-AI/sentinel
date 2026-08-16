# Evidence Chain-of-Custody — Architecture (WS0.4)

## Problem

Fortune 500 compliance programs need tamper-evident proof that the
evidence submitted during an audit is byte-identical to what was
uploaded. Regulators (SOX, HIPAA, 23 NYCRR 500) increasingly ask for a
verifiable chain of custody, including silent-corruption detection and
insider-threat deterrence.

## Design

Three immutable components plus one nightly worker:

1. **`evidence_artifacts`** — metadata row per uploaded file.
   Content lives in Supabase Storage; this row is the authoritative
   index (`storage_bucket`, `storage_path`, `sha256_hex`,
   `classification`, `legal_hold`, `custody_tip_hash`,
   `last_verified_at`, `last_verified_ok`). Dual-digest column
   `sha3_256_hex` is reserved for defence-in-depth algorithm rotation.

2. **`evidence_custody_events`** — append-only, hash-chained ledger.
   Writes are allowed only via the `evidence_append_custody_event`
   SECURITY DEFINER RPC. `UPDATE` / `DELETE` are denied for every role
   including `service_role`. Each event's `event_hash` is
   sha256-over-canonicalized fields (`seq|artifact_id|event_type|actor_kind|actor_id|observed_sha256|previous_hash|recorded_at|details_json`)
   and every row references the prior row's hash via `previous_hash`.
   The trigger that fires on artifact INSERT writes a genesis
   `uploaded` event.

3. **`evidence_rehash_queue`** — loosely-coupled work queue of
   artifacts due for verification. A DB trigger auto-enqueues new
   artifacts and a re-enqueue cron job can add rows by age.

4. **`evidence-rehash` edge function** — nightly worker that
   downloads each queued object, recomputes SHA-256, compares to the
   authoritative digest, and writes a `rehash_ok` or `rehash_failed`
   custody event. Guarded by `X-Cron-Secret` header; uses
   `service_role` but writes flow through the SECURITY DEFINER RPC to
   preserve the chain.

## Canonicalisation format

```
seq | artifact_id | event_type | actor_kind | actor_id_or_empty
    | observed_sha256_or_empty | previous_hash_or_empty
    | recorded_at_iso | json_details_compact
```

Changing this format is a **breaking migration** — independent
verifiers (SIEM, export tools, downstream auditors) must be updated in
lock-step. Version bump is tracked in `audit_log` with
`event_type='evidence.custody.format_migration'`.

## RLS model

- `evidence_artifacts` — standard `ws01_org_*` policies scope by
  `auth.current_org_id()`. Soft-delete via `deleted_at`. `legal_hold`
  rows are filtered out of the delete path in the application layer
  AND a DB CHECK on UPDATE (enforced via trigger) blocks deletion.
- `evidence_custody_events` — SELECT scoped by org; all write DML
  blocked at RLS level. Writers use `evidence_append_custody_event`
  RPC which SETs `local role = 'rls_bypass_custody'` and re-enters
  with CHECK bypass only for the chain insert.

## Why this design resists tampering

| Attack | Defence |
|---|---|
| Operator edits a custody event | `UPDATE` blocked by RLS for all roles; even DB owners must go through a visible DDL change |
| Operator deletes a custody event | `DELETE` blocked by RLS; chain recomputation detects missing `seq` |
| Operator rewrites storage object | Nightly re-hash compares to `sha256_hex` recorded at upload |
| Operator also rewrites `sha256_hex` | Requires UPDATE on `evidence_artifacts`, which fires an `audit_log` event (WS0.3) |
| Operator splices in a fake event | Requires knowing `previous_hash`; independent client verifies chain |

Paired with WS0.3 (global audit log), any mutation of the index row
is itself logged to a separate append-only ledger, so the
intersection of the two feeds gives a full tamper-evident history.

## Nightly verification job

- Cron: 02:00 UTC (or equivalent Supabase scheduled function).
- Batch: 100 artifacts per run; max 240 s per invocation.
- Re-queues failed items with increasing `attempts` counter; operator
  alert fires when `attempts >= 3`.
- Secrets: `CRON_SECRET` required, delivered via the header
  `X-Cron-Secret`. Constant-time comparison.

## Follow-ups (not in WS0.4)

- Sign custody-event roots to a transparency log (Sigstore Rekor) —
  targeted in WS0.6.
- Dual-digest rotation plan (BLAKE3 alongside SHA-256).
- Lifecycle rules: classification-driven retention (7y restricted,
  3y confidential, 1y internal) — queued for WS5.

## Dev / DBA runbook

Migration: `supabase/migrations/20260421000017_ws04_evidence_custody.sql`.

Apply:

```bash
supabase db push --include-all
```

Re-hash probe (staging):

```bash
curl -X POST \
  -H "X-Cron-Secret: $CRON_SECRET" \
  https://<project>.functions.supabase.co/evidence-rehash
```

Verify chain for a single artifact (server-side):

```sql
select seq, event_type, previous_hash, event_hash
  from public.evidence_custody_events
 where artifact_id = '<uuid>'
 order by seq;
```

Then recompute in any SHA-256 tool; first row's `previous_hash`
should be NULL. Each subsequent row's `previous_hash` must equal the
prior row's `event_hash`. The artifact's `custody_tip_hash` must
equal the final row's `event_hash`.
