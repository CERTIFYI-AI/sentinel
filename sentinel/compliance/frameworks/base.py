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
    NA = "N/A"
    PENDING = "PENDING"


@dataclass
class Control:
    control_id: str
    control_name: str = ""
    title: str = ""
    description: str = ""
    category: str = ""
    severity: str = "medium"
    automated: bool = True
    is_organisational: bool = False
    tags: list[str] = field(default_factory=list)
    article_ref: str = ""
    sentinel_scope: bool = True
    signal_source: str = ""
    signal_value: Any = None
    status: ControlStatus | str = ControlStatus.PENDING
    remediation: str | None = None
    scope_note: str = ""
    threshold: float | str | None = None


ControlDefinition = Control  # backward-compat alias

@dataclass
class EvidenceRecord:
    control_id: str = ""
    framework_id: str = ""
    framework_name: str = ""
    tenant_id: str = ""
    request_id: str = ""
    status: ControlStatus | str = ControlStatus.PENDING
    score: float = 0.0
    rationale: str = ""
    timestamp: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    control_name: str = ""
    article_ref: str = ""
    signal_used: str = ""
    signal_value: Any = None
    evidence_text: str = ""
    remediation: str | None = None


@dataclass
class FrameworkConfig:
    framework_id: str = ""
    enabled: bool = True
    in_scope_controls: list[str] = field(default_factory=list)
    thresholds: dict[str, float] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def get(self, key: str, default: Any = None) -> Any:
        """Allow dict-like access for config values."""
        if hasattr(self, key):
            return getattr(self, key)
        return self.thresholds.get(key, self.metadata.get(key, default))


@dataclass
class FrameworkMetadata:
    framework_id: str = ""
    name: str = ""
    framework_name: str = ""
    version: str = ""
    status: FrameworkStatus | str = FrameworkStatus.VOLUNTARY
    description: str = ""
    controls_count: int = 0
    tags: list[str] = field(default_factory=list)
    jurisdiction: str = ""
    enforcement_date: str = ""
    primary_source: str = ""
    sentinel_coverage_note: str = ""
    display_name: str = ""
    legal_weight: str = ""
    country: str = ""

    def __post_init__(self) -> None:
        # Sync name/framework_name/display_name
        if self.framework_name and not self.name:
            self.name = self.framework_name
        elif self.name and not self.framework_name:
            self.framework_name = self.name
        if self.display_name and not self.name:
            self.name = self.display_name
            self.framework_name = self.display_name
        if not self.display_name:
            self.display_name = self.name or self.framework_name
        # Sync legal_weight with status
        if self.legal_weight and not self.status:
            self.status = self.legal_weight
        elif self.status and not self.legal_weight:
            self.legal_weight = str(self.status)


@dataclass
class FrameworkEvalResult:
    """Result of evaluating a framework: metadata + evaluated controls."""
    metadata: FrameworkMetadata
    controls: list[Control] = field(default_factory=list)


class BaseFramework(ABC):
    """
    Abstract base class for all compliance frameworks.
    Subclasses must implement `_evaluate_control()` which is called once per
    in-scope control during each evaluation cycle.
    """
    framework_id: str = ""
    metadata: FrameworkMetadata
    controls: list[Control]

    def evaluate(
        self,
        signals: Any,
        tenant_id: str = "",
        config: dict[str, Any] | FrameworkConfig | None = None,
    ) -> list[EvidenceRecord]:
        """
        Evaluates all in-scope controls and returns evidence records.
        Accepts signals as a dict and optional tenant_id for simplified API.
        """
        if config is None:
            config = {}

        evidence: list[EvidenceRecord] = []
        for control in self.controls:
            try:
                record = self._evaluate_control(
                    control, signals, signals, config
                )
                evidence.append(record)
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "Control evaluation failed: framework_id=%s control_id=%s error=%s",
                    getattr(self, 'framework_id', ''),
                    control.control_id,
                    str(exc),
                )
        return evidence

    def get_metadata(self) -> FrameworkMetadata:
        """Return the framework metadata."""
        return self.metadata

    @abstractmethod
    def _evaluate_control(
        self,
        control: Control,
        entry: Any,
        result: Any,
        config: Any,
    ) -> EvidenceRecord:
        """
        Subclasses must implement per-control evaluation logic.
        Called once per in-scope control by the base evaluate() method.
        """
