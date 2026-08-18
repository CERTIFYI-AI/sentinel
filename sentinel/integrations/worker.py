# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Durable integration sync worker.

A long-lived Python process (``python -m sentinel.integrations.worker``) that
claims ``integration_sync`` jobs from ``background_jobs`` with
``FOR UPDATE SKIP LOCKED``, runs the provider adapter, persists findings, maps
them to controls, and refreshes evidence rollups. This — not the browser event
bus — is where governance evidence collection happens, so it keeps running
when no dashboard is open.

Retry policy: exponential backoff with full jitter
(``min(2**attempts, 32) minutes * random()``), terminal ``failed`` after
``max_attempts``. Stuck-job recovery: a job ``running`` longer than
``JOB_TIMEOUT`` is requeued on the next poll — worker death never wedges a
sync.

Connection: ``SENTINEL_DATABASE_URL`` (service role; RLS does not apply, which
is why every read is explicitly org-checked against the job payload).
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import signal
from datetime import UTC, datetime

import asyncpg

from sentinel.integrations.control_mapping import ControlMapper
from sentinel.integrations.crypto import decrypt_credentials
from sentinel.integrations.registry import get_adapter_class

logger = logging.getLogger("sentinel.integrations.worker")

WORKER_ID = f"integration-worker-{os.getpid()}"
POLL_INTERVAL_SECONDS = 5.0
JOB_TIMEOUT_MINUTES = 30
MAX_BACKOFF_MINUTES = 32


def backoff_minutes(attempts: int, rand=random.random) -> float:
    """Full-jitter exponential backoff, capped."""
    return min(2 ** attempts, MAX_BACKOFF_MINUTES) * rand()


async def claim_next_job(conn: asyncpg.Connection) -> asyncpg.Record | None:
    """Atomically claim one queued job; also rescues timed-out running jobs."""
    await conn.execute(
        """
        UPDATE public.background_jobs
        SET status = 'queued', locked_at = NULL, locked_by = NULL,
            last_error = coalesce(last_error, '') || ' [requeued: worker timeout]'
        WHERE status = 'running'
          AND locked_at < now() - make_interval(mins => $1)
        """,
        JOB_TIMEOUT_MINUTES,
    )
    return await conn.fetchrow(
        """
        WITH candidate AS (
          SELECT id FROM public.background_jobs
          WHERE status = 'queued'
            AND job_type = 'integration_sync'
            AND available_at <= now()
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE public.background_jobs j
        SET status = 'running', locked_at = now(), locked_by = $1,
            attempts = attempts + 1
        FROM candidate
        WHERE j.id = candidate.id
        RETURNING j.*
        """,
        WORKER_ID,
    )


async def process_job(conn: asyncpg.Connection, job: asyncpg.Record) -> None:
    payload = job["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    org_id = payload["org_id"]
    integration_id = payload["integration_id"]
    slug = payload["integration_slug"]

    # Service role bypasses RLS, so the org boundary is enforced here: the
    # integration row must belong to the org named in the job.
    integration = await conn.fetchrow(
        "SELECT * FROM public.integrations"
        " WHERE id = $1 AND org_id = $2 AND is_deleted = false",
        integration_id, org_id,
    )
    if integration is None:
        raise RuntimeError(
            f"integration {integration_id} not found in org {org_id} — refusing to sync"
        )
    blob = integration["credentials_encrypted"]
    if blob is None:
        raise RuntimeError(f"integration {integration_id} has no stored credentials")
    if isinstance(blob, str):
        blob = json.loads(blob)

    adapter_cls, credentials_cls = get_adapter_class(slug)
    adapter = adapter_cls(credentials_cls(**decrypt_credentials(blob)))

    try:
        await adapter.validate()
        findings = await adapter.fetch_all()
    finally:
        # An adapter that holds a connection pool (the Azure one keeps an
        # httpx client) releases it here. Optional by design: adapters with
        # nothing to release do not implement it.
        aclose = getattr(adapter, "aclose", None)
        if aclose is not None:
            await aclose()

    for f in findings:
        await conn.execute(
            """
            INSERT INTO public.integration_findings
              (org_id, integration_id, check_id, title, description, remediation,
               status, severity, check_category, result_details, collected_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb, now())
            ON CONFLICT (integration_id, check_id)
            DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              remediation = EXCLUDED.remediation,
              status = EXCLUDED.status,
              severity = EXCLUDED.severity,
              result_details = EXCLUDED.result_details,
              collected_at = EXCLUDED.collected_at
            """,
            org_id, integration_id, f.check_id, f.title, f.description,
            f.remediation, f.status, f.severity, f.check_category,
            json.dumps(f.result_details),
        )

    linked = await ControlMapper(conn).map(org_id, findings)
    await conn.execute("SELECT public.recompute_control_evidence($1)", org_id)

    await conn.execute(
        """
        UPDATE public.background_jobs
        SET status = 'completed', completed_at = now(), last_error = NULL
        WHERE id = $1
        """,
        job["id"],
    )
    await conn.execute(
        """
        UPDATE public.integrations
        SET last_sync_at      = now(),
            last_run_status   = 'success',
            last_run_error    = NULL,
            health            = 'healthy',
            -- PROMOTE OUT OF 'configuring'. The connect endpoint creates the
            -- row as 'configuring' — linked, not yet proven — and until this
            -- line existed nothing ever moved it on. That mattered because the
            -- `daily-integration-sync` schedule enqueues only
            -- `where status = 'connected'`, so a source collected once at
            -- connect time and then never again: the whole point of continuous
            -- monitoring, silently absent. A successful sync IS the proof, so
            -- this is the right place to record it.
            status            = 'connected',
            updated_at        = now()
        WHERE id = $1
        """,
        integration_id,
    )
    # Surface completion to the dashboard through the durable governance
    # events table (Realtime channel), with provenance and idempotency.
    await conn.execute(
        """
        INSERT INTO public.governance_events
          (org_id, event_type, source_module, payload, idempotency_key, status)
        VALUES ($1, 'INTEGRATION_SYNC_COMPLETE', 'integrations', $2::jsonb, $3, 'completed')
        ON CONFLICT DO NOTHING
        """,
        org_id,
        json.dumps({
            "integration_id": integration_id,
            "integration_slug": slug,
            "findings_count": len(findings),
            "controls_linked": linked,
            "source": "auto-agent",
            "auto_generated": True,
            "source_job_id": str(job["id"]),
        }),
        f"integration-sync-{job['id']}",
    )
    logger.info("synced %s: %d findings, %d control links", slug, len(findings), linked)


async def fail_job(conn: asyncpg.Connection, job: asyncpg.Record, error: Exception) -> None:
    terminal = job["attempts"] >= job["max_attempts"]
    if terminal:
        await conn.execute(
            """
            UPDATE public.background_jobs
            SET status = 'failed', last_error = $2, completed_at = now()
            WHERE id = $1
            """,
            job["id"], f"{type(error).__name__}: {error}",
        )
    else:
        delay = backoff_minutes(job["attempts"])
        await conn.execute(
            """
            UPDATE public.background_jobs
            SET status = 'queued', locked_at = NULL, locked_by = NULL,
                available_at = now() + make_interval(mins => $2),
                last_error = $3
            WHERE id = $1
            """,
            job["id"], delay, f"{type(error).__name__}: {error}",
        )
    payload = job["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    integration_id = payload.get("integration_id")
    if integration_id:
        await conn.execute(
            """
            UPDATE public.integrations
            SET last_run_status = 'error', last_run_error = $2,
                health = 'degraded', updated_at = now()
            WHERE id = $1
            """,
            integration_id, str(error)[:2000],
        )
    logger.error("job %s %s: %s", job["id"],
                 "failed terminally" if terminal else "requeued", error)


async def run(stop_event: asyncio.Event | None = None) -> None:
    dsn = os.environ.get("SENTINEL_DATABASE_URL")
    if not dsn:
        raise RuntimeError("SENTINEL_DATABASE_URL is not set — worker cannot start")
    stop = stop_event or asyncio.Event()
    pool = await asyncpg.create_pool(dsn, min_size=1, max_size=4)
    logger.info("%s started at %s", WORKER_ID, datetime.now(UTC).isoformat())
    try:
        while not stop.is_set():
            async with pool.acquire() as conn:
                async with conn.transaction():
                    job = await claim_next_job(conn)
                if job is None:
                    try:
                        await asyncio.wait_for(stop.wait(), POLL_INTERVAL_SECONDS)
                    except TimeoutError:
                        pass
                    continue
                try:
                    await process_job(conn, job)
                except Exception as exc:  # noqa: BLE001 — every failure is recorded
                    await fail_job(conn, job, exc)
    finally:
        await pool.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(name)s %(levelname)s %(message)s")
    stop = asyncio.Event()
    loop = asyncio.new_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)
    loop.run_until_complete(run(stop))


if __name__ == "__main__":
    main()
