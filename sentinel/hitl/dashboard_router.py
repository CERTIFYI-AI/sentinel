"""FastAPI router for HITL dashboard endpoints.

Provides REST API endpoints for the human-in-the-loop review workflow.
Included in the main FastAPI app via app.include_router(hitl_router).
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from sentinel.hitl import queue as hitl_queue

logger = logging.getLogger(__name__)

hitl_router = APIRouter(prefix="/api/hitl", tags=["hitl"])


@hitl_router.get("/queue")
async def get_queue(tenant_id: str = "default") -> list[dict[str, Any]]:
    """Get pending HITL review jobs for the authenticated tenant.

    Returns jobs sorted by creation time (newest first). The tenant_id
    is resolved from the JWT token in the auth middleware; the query
    parameter is a fallback for development/testing.
    """
    jobs = await hitl_queue.get_pending_jobs(tenant_id)
    return jobs


@hitl_router.get("/job/{job_id}")
async def get_job(job_id: str) -> dict[str, Any]:
    """Get a single HITL job by ID."""
    job = await hitl_queue.get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail=f"HITL job {job_id} not found. It may have been completed or expired.",
        )
    return job


@hitl_router.post("/review/{job_id}")
async def submit_review(
    job_id: str,
    review: dict[str, Any],
) -> dict[str, str]:
    """Submit a human review decision for an HITL job.

    The review dict should contain:
    - approved_response: str (the reviewer's chosen/edited response)
    - reviewer_notes: str (optional notes for the audit log)
    - reviewer_id: str (who reviewed this)
    """
    job = await hitl_queue.get_job(job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail=f"HITL job {job_id} not found.",
        )
    if job.get("status") == "completed":
        raise HTTPException(
            status_code=409,
            detail=f"HITL job {job_id} has already been reviewed.",
        )

    await hitl_queue.complete_job(job_id, review)
    logger.info("HITL review submitted for job %s", job_id)

    return {"status": "completed", "job_id": job_id}
