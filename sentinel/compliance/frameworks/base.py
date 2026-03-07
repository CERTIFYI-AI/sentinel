"""
Base classes and data models for the compliance framework engine.
Implements the exact data model from the specification.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
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
    NOT_APPLICABLE = "N/A"
    PENDING = "PENDING"


@dataclass
class Control:
    control_id: str
    title: str
    description: str
    category: str
    severity: Literal["critical", "high", "medium", "low"]
    automated: bool = True
    tags: list[str] = field(default_factory=list)


@dataclass
class EvidenceRecord:
    control_id: str
    framework_id: str
    tenant_id: str
    request_id: str
    status: ControlStatus
    score: float
    rationale: str
    timestamp: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class FrameworkConfig:
    framework_id: str
    enabled: bool = True
    in_scope_controls: list[str] = field(default_factory=list)
    thresholds: dict[str, float] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class FrameworkMetadata:
    framework_id: str
    name: str
    version: str
    status: FrameworkStatus
    description: str
    controls_count: int
    tags: list[str] = field(default_factory=list)


class BaseFramework(ABC):
    """
    Abstract base class for all compliance frameworks.

    Subclasses must implement `_evaluate_control()` which is called once per
    in-scope control during each evaluation cycle.
    """

    framework_id: str
    metadata: FrameworkMetadata
    controls: list[Control]

    def evaluate(
        self,
        audit_entry: Any,
        pipeline_result: Any,
        config: FrameworkConfig,
    ) -> list[EvidenceRecord]:
        """
        Evaluates all in-scope controls and returns evidence records.
        Called by the compliance engine as a background task after every request.
        """
        evidence: list[EvidenceRecord] = []
        in_scope = (
            set(config.in_scope_controls)
            if config.in_scope_controls
            else {c.control_id for c in self.controls}
        )

        for control in self.controls:
            if control.control_id not in in_scope:
                continue
            try:
                record = self._evaluate_control(
                    control, audit_entry, pipeline_result, config
                )
                evidence.append(record)
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "Control evaluation failed",
                    framework_id=self.framework_id,
                    control_id=control.control_id,
                    error=str(exc),
                )
        return evidence

    @abstractmethod
    def _evaluate_control(
        self,
        control: Control,
        entry: Any,
        result: Any,
        config: FrameworkConfig,
    ) -> EvidenceRecord:
        """
        Subclasses must implement per-control evaluation logic.
        Called once per in-scope control by the base evaluate() method.
        """
