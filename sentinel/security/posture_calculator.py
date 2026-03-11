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
    computed_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class PostureCalculator:
    """Compute security-posture scores for a tenant.

    The calculator maintains an in-memory list of findings per tenant and
    derives a 0–100 score where 100 == fully secure (no open findings).
    """

    def __init__(self) -> None:
        self._findings: dict[str, list[Finding]] = {}

    # -- mutations ----------------------------------------------------------

    def add_finding(self, tenant_id: str, finding: Finding) -> None:
        self._findings.setdefault(tenant_id, []).append(finding)
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
            return PostureReport(
                tenant_id=tenant_id,
                overall_score=100.0,
                category_scores={},
                open_findings=0,
                critical_findings=0,
            )

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

        overall = max(0.0, 100.0 - total_penalty)

        category_scores: dict[str, float] = {}
        for cat, pen in category_penalties.items():
            category_scores[cat] = max(0.0, 100.0 - pen)

        return PostureReport(
            tenant_id=tenant_id,
            overall_score=round(overall, 2),
            category_scores={
                k: round(v, 2) for k, v in category_scores.items()
            },
            open_findings=len(open_findings),
            critical_findings=critical_count,
        )


# -- Module-level convenience functions ----------------------------

_default_calculator = PostureCalculator()


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
