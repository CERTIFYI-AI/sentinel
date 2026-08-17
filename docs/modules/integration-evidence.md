# Integration Evidence Pipeline

**Tables:** `integration_catalog`, `integrations` (extended), `background_jobs`, `integration_findings`, `control_finding_evidence` · **Python:** `sentinel/integrations/` · **Worker:** `python -m sentinel.integrations.worker` · **TS registry:** `dashboard/src/integrations/`

## Purpose

Continuous GRC: pull security-posture evidence from connected providers
(GitHub first; 219 products catalogued) on a durable server-side schedule,
normalize it into findings, and link each finding to the controls it
evidences — so a control's posture is citable to a provider API response
with a timestamp, not to an assertion.

## Why it exists

The in-browser agent mesh cannot collect evidence: it stops when the tab
closes, and evidence collection must not depend on a UI being open. This
pipeline is the platform's first durable job infrastructure —
`background_jobs` claimed with `FOR UPDATE SKIP LOCKED`, exponential backoff
with jitter, stuck-job recovery, terminal failure state — enqueued daily by
pg_cron and consumed by a long-lived Python worker.

## How it works

1. **Catalog** (`integration_catalog`, 219 rows seeded from the Continuous
   GRC & AI Integrations master workbook, 2026-08-25): what can be connected,
   per-product evidence summary, connection steps, category
   (16 categories incl. `ai`), rollout tier and `adapter_status`.
   Reference data — authenticated read, service-role write.
2. **Connect**: an org row in `integrations` gains `catalog_slug` and
   `credentials_encrypted` — an AES-256-GCM blob produced by
   `sentinel/integrations/crypto.py` (key: `SENTINEL_CREDENTIALS_KEY`, backend
   env only; fail-closed). The browser never sees plaintext or the key.
3. **Enqueue**: pg_cron job `daily-integration-sync` (02:00 UTC) inserts one
   `integration_sync` job per connected, credentialed integration, skipping
   any with a queued/running job.
4. **Sync**: the worker claims a job, re-checks the integration belongs to
   the job's org (service role bypasses RLS, so the boundary is enforced in
   code), decrypts, calls the adapter (`validate()` then `fetch_all()`), and
   upserts findings by stable `check_id`.
5. **Map**: `control_mapping.py` links findings to controls via
   `check_category` → (framework, control ref) pairs, resolving against the
   org's actual framework catalog — a framework the org has not enabled
   contributes no links. Verified on the demo org: GDPR Art. 25/28/30/32/33
   all resolve; SOC 2 / ISO 27001 / HIPAA / PCI activate when enabled.
6. **Posture**: the `control_evidence_posture` view aggregates per-control
   evidence (passing / needs_review / failing / no_evidence);
   `recompute_control_evidence(org)` rolls facts into the columns controls
   already carries (`evidence_count`, `automation_status`, `last_tested_at`).
   The human-owned `controls.status` is **never** overwritten by automation.
7. **Notify**: completion inserts `INTEGRATION_SYNC_COMPLETE` into
   `governance_events` with agent provenance (`source: auto-agent`,
   `auto_generated: true`, source job id) and an idempotency key.

## GitHub adapter (first shipped)

`sentinel/integrations/github/adapter.py` (PyGithub): org 2FA requirement,
owner-role sprawl, repo visibility, default-branch protection, secret
scanning, Dependabot alerts, audit-log availability. Seven checks, each
handling PASSED / FAILED / WARNING / NOT_AVAILABLE honestly (a token that
cannot read a setting reports NOT_AVAILABLE, never PASSED). Control mapping
table in the adapter docstring.

## Interlinks

- **Outbound:** `integration_findings` → `controls` via
  `control_finding_evidence` (both directions queryable); catalog slug ties
  `integrations` to `integration_catalog`.
- **Inbound:** controls surface evidence counts/postures; governance events
  reference the sync job.

## Compliance

The pipeline is evidence *collection*, not compliance *attestation* — a
passing finding is a measured provider state at `collected_at`, mapped to
controls for reviewer convenience. ISO/IEC 42001 A.8 (data/evidence),
EU AI Act Art. 12 (logging via governance_events + audit trail in
`result_details`). Secrets stored encrypted, never plaintext (CLAUDE.md
compliance gate).

## Operations

- Worker: `SENTINEL_DATABASE_URL` + `SENTINEL_CREDENTIALS_KEY` required;
  fails closed without them. Run under a supervisor; multiple instances are
  safe (SKIP LOCKED).
- Failure response: jobs retry with backoff up to `max_attempts` (5), then
  `status='failed'` with `last_error`; the integration row shows
  `last_run_status='error'` and `health='degraded'` in the UI.
- Tests: `tests/integrations/` (32) — adapter checks per status, crypto
  round-trip/tamper/fail-closed, mapping-table completeness, backoff.
