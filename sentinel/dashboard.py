"""Monitoring dashboard for Certifyi Sentinel.

Provides a FastAPI-based dashboard with endpoints for
viewing audit logs, request statistics, and system health.
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse

from sentinel.audit import AuditLogger
from sentinel.config import DashboardConfig
from sentinel.models import HealthStatus, RequestStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_dashboard_routes(audit_logger: AuditLogger, config: DashboardConfig) -> APIRouter:
    """Create dashboard routes with injected dependencies."""

    @router.get("/", response_class=HTMLResponse)
    async def dashboard_home() -> str:
        """Simple HTML dashboard page."""
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Certifyi Sentinel Dashboard</title>
            <style>
                body { font-family: system-ui, sans-serif; margin: 2rem; background: #0f172a; color: #e2e8f0; }
                h1 { color: #38bdf8; }
                .card { background: #1e293b; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
                .stat { font-size: 2rem; font-weight: bold; color: #38bdf8; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
                a { color: #38bdf8; }
            </style>
        </head>
        <body>
            <h1>Certifyi Sentinel</h1>
            <p>Real-time AI reliability and governance middleware</p>
            <div class="grid">
                <div class="card">
                    <h3>API Endpoints</h3>
                    <ul>
                        <li><a href="/dashboard/stats">/dashboard/stats</a></li>
                        <li><a href="/dashboard/events">/dashboard/events</a></li>
                        <li><a href="/health">/health</a></li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
        """

    @router.get("/stats")
    async def get_stats(
        hours: int = Query(24, ge=1, le=720),
    ) -> RequestStats:
        """Get request statistics for the given time period."""
        end = datetime.utcnow()
        start = end - timedelta(hours=hours)
        events = await audit_logger.query(start=start, end=end, limit=10000)

        total = len([e for e in events if e.get("event_type") == "request_received"])
        blocked = len([e for e in events if e.get("event_type") == "policy_evaluated"
                       and e.get("policy_result") and '"block"' in str(e.get("policy_result", ""))])
        flagged = len([e for e in events if e.get("event_type") == "policy_evaluated"
                       and e.get("policy_result") and '"flag"' in str(e.get("policy_result", ""))])
        fc_events = [e for e in events if e.get("event_type") == "fact_check_run"]

        latencies = []
        for e in events:
            if e.get("event_type") == "response_sent":
                data = e.get("data", "{}")
                if isinstance(data, str):
                    import json
                    try:
                        data = json.loads(data)
                    except Exception:
                        data = {}
                lat = data.get("latency_ms", 0)
                if lat:
                    latencies.append(lat)

        return RequestStats(
            total_requests=total,
            blocked_requests=blocked,
            flagged_requests=flagged,
            avg_latency_ms=sum(latencies) / len(latencies) if latencies else 0.0,
            fact_checks_run=len(fc_events),
            policy_violations=blocked + flagged,
            period_start=start,
            period_end=end,
        )

    @router.get("/events")
    async def get_events(
        request_id: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = Query(50, ge=1, le=1000),
    ) -> List[Dict[str, Any]]:
        """Query audit events."""
        return await audit_logger.query(
            request_id=request_id,
            event_type=event_type,
            limit=limit,
        )

    @router.get("/events/{request_id}")
    async def get_request_events(request_id: str) -> List[Dict[str, Any]]:
        """Get all events for a specific request."""
        events = await audit_logger.query(request_id=request_id, limit=100)
        if not events:
            raise HTTPException(status_code=404, detail="Request not found")
        return events

    return router
