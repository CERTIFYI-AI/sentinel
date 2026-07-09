"""Security Posture Calculator for Sentinel.

Computes an aggregate security posture score from multiple signal
categories: vulnerability findings, policy compliance, access-control
health, and data-protection coverage.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


SEVERITY_WEIGHTS: dict[Severity, float] = {
    Severity.CRITICAL: 1.0,
    Severity.HIGH: 0.75,
    Severity.MEDIUM: 0.5,
    Severity.LOW: 0.25,
    Severity.INFO: 0.0,
}


@dataclass
class Finding:
    """A single security finding / vulnerability."""

    id: str
    title: str
    severity: Severity
    category: str = "general"
    resolved: bool = False
    detected_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class PostureReport:
    """Snapshot of the security posture at a point in time."""

    tenant_id: str
    overall_score: float
    category_scores: dict[str, float]
    open_findings: int
    critical_findings: int
    trend: str = "stable"  # improving | stable | declining
    computed_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class PostureHistoryStore:
    """In-memory rolling history of posture scores per tenant.

    Used to derive a trend (improving/stable/declining) without a database
    round-trip. Not persisted across process restarts — acceptable for now
    since it mirrors the existing in-memory findings store on
    :class:`PostureCalculator`.
    """

    def __init__(self, max_entries: int = 90) -> None:
        self._history: dict[str, list[tuple[str, float]]] = {}
        self._max_entries = max_entries

    def record(self, tenant_id: str, score: float) -> None:
        entries = self._history.setdefault(tenant_id, [])
        entries.append((datetime.now(timezone.utc).isoformat(), score))
        if len(entries) > self._max_entries:
            del entries[: len(entries) - self._max_entries]

    def get_trend(
        self, tenant_id: str, current_score: float, *, threshold: float = 1.0
    ) -> str:
        """Compare *current_score* to the most recently recorded score.

        Call this *before* :meth:`record` for the current score, so the
        comparison is against the prior computation rather than itself.
        """
        entries = self._history.get(tenant_id, [])
        if not entries:
            return "stable"
        previous_score = entries[-1][1]
        delta = current_score - previous_score
        if delta > threshold:
            return "improving"
        if delta < -threshold:
            return "declining"
        return "stable"

    def get_history(self, tenant_id: str) -> list[tuple[str, float]]:
        return list(self._history.get(tenant_id, []))


class PostureCalculator:
    """Compute security-posture scores for a tenant.

    The calculator maintains an in-memory list of findings per tenant and
    derives a 0–100 score where 100 == fully secure (no open findings).
    """

    def __init__(self, *, max_findings_per_tenant: int = 500) -> None:
        self._findings: dict[str, list[Finding]] = {}
        self.history = PostureHistoryStore()
        self._max_findings_per_tenant = max_findings_per_tenant

    # -- mutations ----------------------------------------------------------

    def add_finding(self, tenant_id: str, finding: Finding) -> None:
        entries = self._findings.setdefault(tenant_id, [])
        # De-dupe: a finding id is expected to be unique (e.g. tied to a
        # request id); if a caller re-adds the same id, replace rather than
        # accumulate duplicates.
        entries[:] = [f for f in entries if f.id != finding.id]
        entries.append(finding)
        if len(entries) > self._max_findings_per_tenant:
            # Bound memory for long-running processes: trim resolved
            # (oldest first), then unresolved-but-oldest, once real traffic
            # starts feeding this continuously.
            entries.sort(key=lambda f: (not f.resolved, f.detected_at))
            del entries[: len(entries) - self._max_findings_per_tenant]
        logger.info(
            "Finding %s (%s) added for tenant %s",
            finding.id,
            finding.severity.value,
            tenant_id,
        )

    def resolve_finding(
        self, tenant_id: str, finding_id: str
    ) -> bool:
        for f in self._findings.get(tenant_id, []):
            if f.id == finding_id and not f.resolved:
                f.resolved = True
                logger.info(
                    "Finding %s resolved for tenant %s",
                    finding_id,
                    tenant_id,
                )
                return True
        return False

    # -- queries ------------------------------------------------------------

    def get_findings(
        self,
        tenant_id: str,
        *,
        include_resolved: bool = False,
    ) -> list[Finding]:
        findings = self._findings.get(tenant_id, [])
        if include_resolved:
            return list(findings)
        return [f for f in findings if not f.resolved]

    def compute(
        self,
        tenant_id: str,
    ) -> PostureReport:
        """Return a :class:`PostureReport` for *tenant_id*."""
        open_findings = self.get_findings(tenant_id)

        if not open_findings:
            overall_score = 100.0
            category_scores: dict[str, float] = {}
            open_count = 0
            critical_count = 0
        else:
            # Weighted penalty per finding (max penalty capped at 100)
            total_penalty = 0.0
            category_penalties: dict[str, float] = {}
            critical_count = 0

            for f in open_findings:
                weight = SEVERITY_WEIGHTS.get(f.severity, 0.5)
                penalty = weight * 10  # each finding can cost up to 10 pts
                total_penalty += penalty
                category_penalties.setdefault(f.category, 0.0)
                category_penalties[f.category] += penalty
                if f.severity == Severity.CRITICAL:
                    critical_count += 1

            overall_score = max(0.0, 100.0 - total_penalty)
            category_scores = {
                cat: round(max(0.0, 100.0 - pen), 2)
                for cat, pen in category_penalties.items()
            }
            overall_score = round(overall_score, 2)
            open_count = len(open_findings)

        # Trend must be derived from history recorded *before* this call.
        trend = self.history.get_trend(tenant_id, overall_score)
        self.history.record(tenant_id, overall_score)

        return PostureReport(
            tenant_id=tenant_id,
            overall_score=overall_score,
            category_scores=category_scores,
            open_findings=open_count,
            critical_findings=critical_count,
            trend=trend,
        )


# -- Module-level convenience functions ----------------------------

_default_calculator = PostureCalculator()

# Public alias: this is the one shared PostureCalculator instance that all
# routers/producers should use. Previously sentinel/api/ciso_router.py
# instantiated its own separate PostureCalculator(), so it could never see
# findings recorded anywhere else in the process — that's fixed by having
# it import `default_calculator` instead.
default_calculator = _default_calculator


# Severity thresholds for the two pipeline signals that are available
# synchronously, in-memory, at the point every request is audited
# (see sentinel/layers/auditor.py::log). No DB round-trip required.
_TRUST_SCORE_SEVERITY: list[tuple[float, Severity]] = [
    (0.40, Severity.CRITICAL),
    (0.60, Severity.HIGH),
    (0.80, Severity.MEDIUM),
]

# InterventionLevel is NONE=0, REGENERATE=1, UPGRADE=2, HITL=3
# (sentinel/models.py). HITL/UPGRADE/REGENERATE all represent the pipeline
# stepping in, in increasing order of severity.
_INTERVENTION_SEVERITY: dict[int, Severity] = {
    3: Severity.CRITICAL,  # HITL
    2: Severity.HIGH,      # UPGRADE
    1: Severity.MEDIUM,    # REGENERATE
}


def record_pipeline_signals(
    tenant_id: str,
    *,
    request_id: str,
    trust_score: float | None = None,
    intervention_level: int | None = None,
    calculator: "PostureCalculator | None" = None,
) -> None:
    """Derive and record posture findings from a single pipeline request.

    This is the minimal integration point between the Sentinel request
    pipeline and the security posture calculator: it is synchronous,
    in-memory, and uses signals (`trust_score`, `intervention_level`)
    that are already computed for every audited request — no new data
    source or DB dependency required. Call this once per request, right
    after (or alongside) the audit_log write in
    sentinel/layers/auditor.py::log.

    Before this, PostureCalculator.add_finding() was never called by
    anything in the codebase, so /posture, /risk-heatmap, and
    /compliance's passing_controls were always empty/zero regardless of
    real system behaviour.
    """
    calc = calculator or _default_calculator

    if trust_score is not None:
        severity = next(
            (sev for threshold, sev in _TRUST_SCORE_SEVERITY if trust_score < threshold),
            None,
        )
        if severity is not None:
            calc.add_finding(
                tenant_id,
                Finding(
                    id=f"{request_id}:trust_score",
                    title=f"Low trust score ({trust_score:.2f}) on request {request_id}",
                    severity=severity,
                    category="trust",
                    metadata={"trust_score": trust_score, "request_id": request_id},
                ),
            )

    if intervention_level is not None:
        severity = _INTERVENTION_SEVERITY.get(intervention_level)
        if severity is not None:
            calc.add_finding(
                tenant_id,
                Finding(
                    id=f"{request_id}:intervention",
                    title=(
                        f"Pipeline intervention (level {intervention_level}) "
                        f"on request {request_id}"
                    ),
                    severity=severity,
                    category="pipeline_intervention",
                    metadata={
                        "intervention_level": intervention_level,
                        "request_id": request_id,
                    },
                ),
            )


async def get_security_score(tenant_id: str) -> float:
    """Return the overall security posture score for *tenant_id*."""
    report = _default_calculator.compute(tenant_id)
    return report.overall_score


async def get_open_findings(tenant_id: str) -> int:
    """Return the count of open findings for *tenant_id*."""
    findings = _default_calculator.get_findings(tenant_id)
    return len(findings)


async def get_top_findings(
    tenant_id: str, *, limit: int = 10
) -> list[dict[str, Any]]:
    """Return the top (most severe) open findings for *tenant_id*."""
    from dataclasses import asdict

    findings = _default_calculator.get_findings(tenant_id)
    ranked = sorted(
        findings,
        key=lambda f: SEVERITY_WEIGHTS.get(f.severity, 0.0),
        reverse=True,
    )
    return [asdict(f) for f in ranked[:limit]]
