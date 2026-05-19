# Disaster Recovery — Restore Runbook

**RTO target: 2 hours · RPO target: 5 minutes**

This runbook covers the full restore procedure for the Sentinel
control plane. It is dry-run tested monthly in staging; the test
record lives in `compliance/dr-test-log`.

## Declare the incident

1. On-call runs `/incident declare sev-1 "Primary region down"` in the
   incident channel. This opens the war-room, pages the rest of the
   rotation, and creates a tracking incident in Sentinel itself.
2. The commander confirms the outage scope:
   - Supabase Postgres (primary): `vhparvughsygyknblkzt`.
   - Cloudflare Workers: is the colo reachable? (`curl -I
     https://sentinel.certifyi.ai/healthz`)
   - CDN caches: are stale assets still serving?

## Restore Postgres (primary path)

1. **Confirm PITR window** — Supabase dashboard shows the latest
   recoverable timestamp. Target restore time = `T - 5 min` of the
   failure.
2. **Provision restore target** — create a fresh Supabase project
   `sentinel-dr-<date>` in `us-west-2`. Capture the new project ref.
3. **Kick off PITR** — in the Supabase dashboard, choose
   "Recover to a point in time" and select the target timestamp.
   Expected duration: 10–40 minutes depending on WAL volume.
4. **Re-apply post-snapshot migrations** — any migration applied after
   the snapshot is re-run from
   `supabase/migrations/` via
   `supabase db push --db-url "$DR_DB_URL"`.
5. **Re-seed non-replicated state** — JWT secrets, edge-function
   secrets, and Storage bucket policies are rehydrated from the
   `dr-secrets` vault item.

## Repoint the fleet

1. **Cloudflare Worker environment** — update the
   `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` secrets to point at the
   DR project. Run `wrangler secret put` for every environment
   (`production`, `staging`).
2. **Dashboard** — bump `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`,
   redeploy via `wrangler pages deploy`.
3. **DNS** — Cloudflare Load Balancer's active origin pool is flipped
   from `us-east-1` to `us-west-2`. Propagation is near-instant via
   Cloudflare's Anycast.

## Validation

Run the post-restore smoke test:

```bash
npm --prefix dashboard run e2e -- --grep "@smoke"
```

And the tamper-evidence spot-check (WS0.3):

```bash
node scripts/audit-chain-verify.mjs --since "$(date -u -d '24 hours ago' '+%Y-%m-%dT%H:%M:%SZ')"
```

Both must pass before the incident is downgraded to sev-2.

## Declare recovery

1. Commander posts "Primary restored" in the war-room.
2. Audit-log export for the incident window is written to the
   evidence chain for regulator notification. This is automatic on
   every sev-1 declaration.
3. Post-mortem opens within 72 hours, filed in
   `/incidents/post-mortems` (WS2 scaffolded page).

## Monthly test

Record of the last successful DR drill (month · commander · duration):

| Month | Commander | RTO achieved | RPO achieved |
|---|---|---|---|
| _to be populated monthly_ | | | |
