"""
Base classes and data models for the compliance framework engine.
Implements the exact data model from the specification.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Literal
import logging

logger = logging.getLogger(__name__)


class FrameworkStatus(StrEnum):
    MANDATORY_LAW = "mandatory-law"
    CERTIFIABLE = "certifiable"
    VOLUNTARY = "voluntary"
    POLICY_GUIDE = "policy-guide"
    TECH_STANDARD = "tech-standard"


class ControlStatus(StrEnum):
    PASS = "PASS"
    FAIL = "FAIL"
    PARTIAL = "PARTIAL"
    NA = "NA"


@dataclass(frozen=True)
class Control:
    control_id: str
    control_name: str
    article_ref: str
    description: str
    sentinel_scope: bool
    scope_note: str = ""


@dataclass
class EvidenceRecord:
    framework_id: str
    framework_name: str
    control_id: str
    control_name: str
    article_ref: str
    status: ControlStatus
    score: float
    signal_used: str
    signal_value: Any
    evidence_text: str
    remediation: str | None = None

    def dict(self) -> dict:
        return {
            "framework_id": self.framework_id,
            "framework_name": self.framework_name,
            "control_id": self.control_id,
            "control_name": self.control_name,
            "article_ref": self.article_ref,
            "status": self.status.value,
            "score": self.score,
            "signal_used": self.signal_used,
            "signal_value": self.signal_value,
            "evidence_text": self.evidence_text,
            "remediation": self.remediation,
        }


@dataclass
class FrameworkMetadata:
    framework_id: str
    framework_name: str
    version: str
    status: FrameworkStatus
    jurisdiction: str
    enforcement_date: str
    primary_source: str
    sentinel_coverage_note: str


class BaseFramework:
    metadata: FrameworkMetadata
    controls: list[Control]

    def evaluate(
        self,
        entry: dict,
        result: dict,
        config: dict,
    ) -> list[EvidenceRecord]:
        """Evaluate every control for one completed request.
        Returns exactly len(self.controls) EvidenceRecord objects.
        Controls with sentinel_scope=False return status=NA.
        Never raises; catches all exceptions, returns FAIL with error.
        """
        records: list[EvidenceRecord] = []
        for control in self.controls:
            if not control.sentinel_scope:
                records.append(EvidenceRecord(
                    framework_id=self.metadata.framework_id,
                    framework_name=self.metadata.framework_name,
                    control_id=control.control_id,
                    control_name=control.control_name,
                    article_ref=control.article_ref,
                    status=ControlStatus.NA,
                    score=-1.0,
                    signal_used="organisational",
                    signal_value=None,
                    evidence_text=control.scope_note,
                    remediation=None,
                ))
            else:
                try:
                    records.append(
                        self._evaluate_control(control, entry, result, config)
                    )
                except Exception as exc:
                    logger.error(
                        "Control evaluation failed",
                        extra={"control": control.control_id, "error": str(exc)},
                        exc_info=True,
                    )
                    records.append(EvidenceRecord(
                        framework_id=self.metadata.framework_id,
                        framework_name=self.metadata.framework_name,
                        control_id=control.control_id,
                        control_name=control.control_name,
                        article_ref=control.article_ref,
                        status=ControlStatus.FAIL,
                        score=0.0,
                        signal_used="error",
                        signal_value=str(exc),
                        evidence_text=f"Evaluation error: {exc}",
                        remediation="Check logs for exception details.",
                    ))
        return records

    def _evaluate_control(
        self,
        control: Control,
        entry: dict,
        result: dict,
        config: dict,
    ) -> EvidenceRecord:
        raise NotImplementedError

    def compliance_score(self, records: list[EvidenceRecord]) -> float:
        """Fraction of in-scope controls that PASS or PARTIAL.
        NA controls excluded from both numerator and denominator.
        Returns 1.0 if all controls are NA.
        """
        in_scope = [r for r in records if r.status != ControlStatus.NA]
        if not in_scope:
            return 1.0
        passed = sum(
            1 for r in in_scope
            if r.status in (ControlStatus.PASS, ControlStatus.PARTIAL)
        )
        return round(passed / len(in_scope), 4)

    def get_controls(self) -> list[Control]:
        return self.controls
