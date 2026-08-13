<!-- Licensed to CERTIFYI-AI under the Apache License, Version 2.0. -->

# Append-Only Audit Log (WS0.3)

**Status:** Landed in `feat/ws03-audit-log`.

## 1. Why a new table?

Sentinel already has `audit_events` — a mutable, query-optimised log used
for live dashboards. WS0.3 introduces **`audit_log`**, a parallel,
append-only, hash-chained record designed for:

- **WORM compliance** (SEC 17a-4, GDPR Art. 30 record-of-processing,
  ISO/IEC 27001 A.8.15).
- **Forensic integrity** — any row tampering is mechanically detectable.
- **Cross-tool SIEM export** (ArcSight, QRadar, Splunk, generic syslog).

Both tables will coexist; applications should write governance-critical
events to **both** via the audit dispatcher (WS0.6).

## 2. Hash chain construction

Each row computes `row_hash` as:

```
row_hash = sha256(id | org | seq | occurred_at | actor_id | actor_type
                | action | resource_type | resource_id | outcome
                | severity | metadata_json | previous_hash)
```

Fields are joined with `|` (pipe) and ordered deterministically. Changing
this canonicalisation is a breaking change — verifiers written at time T
will reject rows written after a format change.

`previous_hash` is the `row_hash` of the preceding row in the same org's
chain. Sequence `#1` has `previous_hash = null`.

**`audit_log_head(org_id)`** stores the tip of each chain. `audit_log_append()`
atomically increments `last_sequence` under row-level lock and stamps
the tip, so concurrent callers can never produce the same sequence
number.

## 3. Writing

Application code **never** `INSERT`s into `audit_log` directly — RLS
denies it. Instead call the RPC:

```ts
await supabase.rpc('audit_log_append', {
  p_org_id: orgId,
  p_action: 'model.approved',
  p_resource_type: 'ai_models',
  p_resource_id: modelId,
  p_actor_id: userId,
  p_metadata: { risk_tier: 'high', framework: 'EU_AI_ACT' },
})
```

Callable from edge functions (service-role) and from Workers with a
service key. End-user JWTs cannot invoke the RPC.

## 4. Reading

`audit_log` has a tenant-scoped SELECT policy. End users can read their
org's rows via the normal Supabase client. The `/audit-log/chain` page
is a read-only explorer with filter, pagination, and verify button.

## 5. Verification

```sql
SELECT * FROM audit_log_verify_chain('<org-id>'::uuid);
```

Returns `(ok, failed_at_sequence, failed_reason)`. The explorer page
exposes this as a button. Run nightly as a cron (see WS0.6) and alert
security on any `ok = false` result.

Operators can run a partial verify:

```sql
SELECT * FROM audit_log_verify_chain(
  '<org-id>'::uuid,
  p_from_seq => 100000,
  p_to_seq   => 100999
);
```

## 6. Immutability guarantees

- `UPDATE` policy → `USING (false)`: *no role*, including `service_role`,
  can modify a row through normal SQL. The Supabase dashboard user can
  still force an update via `pg_catalog`; DBAs signing the runbook
  accept that as a trust boundary.
- `DELETE` policy → `USING (false)`: same treatment.
- If legal redaction is required (GDPR right-to-erasure on an actor ID),
  follow the documented procedure: rotate the canonical hash key used
  by downstream verifiers and write a **new** row (`action=pii.redacted`,
  `metadata={target_seq: …}`). The original row's hash remains valid,
  so the chain stays intact — only the downstream interpretation changes.

## 7. Exporters

`audit-export` edge function returns the same data in five formats:

| Format  | MIME                     | Use |
|---------|--------------------------|-----|
| `ndjson`| `application/x-ndjson`   | Generic streaming into anything |
| `splunk`| `application/x-ndjson`   | Splunk HEC raw JSON |
| `cef`   | `text/plain`             | ArcSight (ASCII 7, CRLF-safe escapes) |
| `leef`  | `text/plain`             | IBM QRadar v2.0 |
| `syslog`| `text/plain`             | RFC 5424 with `[audit@61868]` structured data |

All exports require the caller's JWT `app_metadata.org_id` to match the
`?org_id` query param — never trust client-supplied org ids.

## 8. Open items

- **S3/GCS sink cron** — WS0.6 will add a scheduled export to immutable
  object storage (Object Lock / bucket lock) for belt-and-suspenders.
- **Real IANA PEN** for the syslog structured data element (placeholder
  61868 today).
- **Webhook sink** — WS8 will let orgs POST each row to their own
  endpoint; the bearer auth scheme is already designed.
