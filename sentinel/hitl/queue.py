"""Human-in-the-loop review queue with dual-mode operation.

PRODUCTION MODE: When REDIS_URL is set and Celery is importable, jobs
are enqueued to a Redis-backed Celery task queue. This survives process
restarts and supports distributed workers.

FALLBACK MODE: When Redis/Celery are unavailable, jobs are stored in
an in-memory asyncio.Queue. This lets the circuit breaker's Level 3
work during development but jobs will be lost on restart.

Both modes expose the same interface so the circuit breaker does not
need to know which backend is active.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# Try to import Celery — optional dependency
_celery_app: Any | None = None
_use_celery = False

try:
    from celery import Celery
    _celery_available = True
except ImportError:
    _celery_available = False

# In-memory fallback storage
_memory_jobs: dict[str, dict[str, Any]] = {}
_memory_queue: asyncio.Queue[str] | None = None


def init_queue(redis_url: str | None = None, queue_name: str = "sentinel-hitl") -> None:
    """Initialize the HITL queue backend.

    Auto-selects between Celery (production) and in-memory (development)
    based on whether Redis is configured and Celery is installed.

    Args:
        redis_url: Redis connection string for Celery broker. If None,
            falls back to in-memory mode.
        queue_name: Celery queue name for HITL tasks.
    """
    global _celery_app, _use_celery, _memory_queue  # noqa: PLW0603

    if redis_url and _celery_available:
        _celery_app = Celery(
            "sentinel-hitl",
            broker=redis_url,
            backend=redis_url,
        )
        _celery_app.conf.task_default_queue = queue_name
        _celery_app.conf.task_serializer = "json"
        _celery_app.conf.result_serializer = "json"
        _celery_app.conf.accept_content = ["json"]
        _use_celery = True
        logger.info(
            "HITL queue initialized with Celery (broker=%s, queue=%s)",
            redis_url.split("@")[-1] if "@" in redis_url else redis_url,
            queue_name,
        )
    else:
        _memory_queue = asyncio.Queue()
        _use_celery = False
        if not redis_url:
            logger.warning(
                "HITL queue running in-memory mode. Jobs will be lost on restart. "
                "Set REDIS_URL for production."
            )
        elif not _celery_available:
            logger.warning(
                "Celery not installed. HITL queue running in-memory mode. "
                "Install with: pip install 'celery[redis]'"
            )


async def enqueue_job(job_data: dict[str, Any]) -> str:
    """Add a new HITL review job to the queue.

    Creates a job record with a unique ID and timestamps, then enqueues
    it via the active backend (Celery or in-memory).

    Args:
        job_data: Dict containing prompt, responses, scores, tenant_id,
            and request_id from the circuit breaker.

    Returns:
        The generated job_id string.
    """
    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id,
        "status": "pending",
        "created_at": datetime.now(tz=timezone.utc).isoformat(),
        "updated_at": datetime.now(tz=timezone.utc).isoformat(),
        **job_data,
    }

    if _use_celery and _celery_app is not None:
        _celery_app.send_task(
            "sentinel.hitl.queue.process_hitl_job",
            args=[job_id],
            kwargs={"job_data": job},
        )
        logger.info("HITL job %s enqueued via Celery", job_id)
    else:
        _memory_jobs[job_id] = job
        if _memory_queue is not None:
            await _memory_queue.put(job_id)
        logger.info("HITL job %s enqueued in-memory", job_id)

    return job_id


async def get_pending_jobs(tenant_id: str) -> list[dict[str, Any]]:
    """Get all pending review jobs for a tenant.

    In Celery mode, queries the Redis backend. In memory mode, filters
    the in-memory dict.
    """
    if _use_celery and _celery_app is not None:
        # In Celery mode, pending jobs are tracked in Redis
        # We store them as a Redis hash alongside the Celery tasks
        try:
            import redis
            r = redis.from_url(_celery_app.conf.broker_url)
            keys = r.keys("hitl:job:*")
            jobs = []
            for key in keys:
                data = r.get(key)
                if data:
                    job = json.loads(data)
                    if job.get("tenant_id") == tenant_id and job.get("status") == "pending":
                        jobs.append(job)
            return sorted(jobs, key=lambda j: j.get("created_at", ""), reverse=True)
        except Exception:
            logger.warning("Failed to query Celery backend, falling back to empty list")
            return []
    else:
        return [
            job for job in _memory_jobs.values()
            if job.get("tenant_id") == tenant_id and job.get("status") == "pending"
        ]


async def get_job(job_id: str) -> dict[str, Any] | None:
    """Get a single job by ID."""
    if _use_celery and _celery_app is not None:
        try:
            import redis
            r = redis.from_url(_celery_app.conf.broker_url)
            data = r.get(f"hitl:job:{job_id}")
            if data:
                return json.loads(data)
            return None
        except Exception:
            return None
    else:
        return _memory_jobs.get(job_id)


async def complete_job(job_id: str, review: dict[str, Any]) -> None:
    """Mark a job as completed with the reviewer's decision.

    Updates the job status to 'completed' and stores the review data
    (approved response, reviewer notes, timestamp).
    """
    if _use_celery and _celery_app is not None:
        try:
            import redis
            r = redis.from_url(_celery_app.conf.broker_url)
            data = r.get(f"hitl:job:{job_id}")
            if data:
                job = json.loads(data)
                job["status"] = "completed"
                job["review"] = review
                job["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
                r.set(f"hitl:job:{job_id}", json.dumps(job))
        except Exception:
            logger.error("Failed to complete job %s in Celery backend", job_id)
    else:
        if job_id in _memory_jobs:
            _memory_jobs[job_id]["status"] = "completed"
            _memory_jobs[job_id]["review"] = review
            _memory_jobs[job_id]["updated_at"] = datetime.now(tz=timezone.utc).isoformat()

    logger.info("HITL job %s completed", job_id)
