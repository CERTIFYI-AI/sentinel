"""Compliance data models.

All data structures for the compliance engine: frameworks, controls,
evidence records, and evaluation results.
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4


class ControlStatus(str, enum.Enum):
    """Evaluation status for a single control."""
    PASS = "PASS"
    FAIL = "FAIL"
    PARTIAL = "PARTIAL"
    NA = "NA"
    ERROR = "ERROR"


class ControlCategory(str, enum.Enum):
    """Control classification."""
    TECHNICAL = "technical"
    ORGANISATIONAL = "organisational"
    DOCUMENTATION = "documentation"

class SignalSource(str, enum.Enum):
    """Where the compliance signal originates in Sentinel."""
    INJECTION_SCORE = "injection_score"
    PII_DETECTED = "pii_detected"
    TRUST_SCORE = "trust_score"
    RAG_ENTAILMENT = "rag_entailment"
    CROSS_CHECK = "cross_check_agreement"
    TOXICITY_SCORE = "toxicity_score"
    AUDIT_LOG = "audit_log"
    CIRCUIT_BREAKER = "circuit_breaker_state"
    HITL_TRIGGERED = "hitl_triggered"
    GOLDEN_SOURCE_EMPTY = "golden_source_empty"
    SEMANTIC_DRIFT = "semantic_drift_score"
    POLICY_VIOLATIONS = "policy_violations"


@dataclass(frozen=True)
class ControlDefinition:
    """Static definition of a compliance control."""
    control_id: str
    title: str
    description: str
    category: ControlCategory
    signal_source: SignalSource | None  # None for organisational controls
    pass_threshold: float | None  # None for organisational (always NA)
    fail_threshold: float | None
    evidence_template: str
    remediation: str


@dataclass(frozen=True)
class ComplianceFramework:
    """A complete compliance framework with its controls."""
    framework_id: str
    name: str
    version: str
    description: str
    controls: tuple[ControlDefinition, ...] | list[ControlDefinition]

    @property
    def control_count(self) -> int:
        return len(self.controls)

    @property
    def technical_controls(self) -> list[ControlDefinition]:
        return [c for c in self.controls if c.category == ControlCategory.TECHNICAL]

    @property
    def organisational_controls(self) -> list[ControlDefinition]:
        return [c for c in self.controls if c.category == ControlCategory.ORGANISATIONAL]


@dataclass
class EvidenceRecord:
    """A single piece of evidence for a control evaluation."""
    evidence_id: UUID = field(default_factory=uuid4)
    control_id: str = ""
    framework_id: str = ""
    tenant_id: str = ""
    signal_source: str = ""
    signal_value: float | None = None
    threshold: float | None = None
    status: ControlStatus = ControlStatus.NA
    evidence_text: str = ""
    raw_data: dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ControlResult:
    """Result of evaluating a single control."""
    control_id: str
    title: str
    status: ControlStatus
    evidence: EvidenceRecord
    category: str
    signal_source: str | None
    signal_value: float | None
    threshold: float | None
    remediation: str


@dataclass
class ComplianceResult:
    """Result of evaluating an entire framework."""
    framework_id: str
    framework_name: str
    framework_version: str
    tenant_id: str
    request_id: str
    evaluated_at: datetime = field(default_factory=datetime.utcnow)
    controls: list[ControlResult] = field(default_factory=list)

    @property
    def pass_count(self) -> int:
        return sum(1 for c in self.controls if c.status == ControlStatus.PASS)

    @property
    def fail_count(self) -> int:
        return sum(1 for c in self.controls if c.status == ControlStatus.FAIL)

    @property
    def partial_count(self) -> int:
        return sum(1 for c in self.controls if c.status == ControlStatus.PARTIAL)

    @property
    def na_count(self) -> int:
        return sum(1 for c in self.controls if c.status == ControlStatus.NA)

    @property
    def pass_rate(self) -> float:
        evaluated = [c for c in self.controls if c.status != ControlStatus.NA]
        if not evaluated:
            return 0.0
        return self.pass_count / len(evaluated)

    def to_dict(self) -> dict[str, Any]:
        return {
            "framework_id": self.framework_id,
            "framework_name": self.framework_name,
            "framework_version": self.framework_version,
            "tenant_id": self.tenant_id,
            "request_id": self.request_id,
            "evaluated_at": self.evaluated_at.isoformat(),
            "summary": {
                "pass": self.pass_count,
                "fail": self.fail_count,
                "partial": self.partial_count,
                "na": self.na_count,
                "pass_rate": round(self.pass_rate, 4),
            },
            "controls": [
                {
                    "control_id": c.control_id,
                    "title": c.title,
                    "status": c.status.value,
                    "category": c.category,
                    "signal_source": c.signal_source,
                    "signal_value": c.signal_value,
                    "threshold": c.threshold,
                    "evidence": c.evidence.evidence_text,
                    "remediation": c.remediation if c.status != ControlStatus.PASS else "",
                }
                for c in self.controls
            ],
        }
