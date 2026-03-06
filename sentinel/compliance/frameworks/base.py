from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional
import enum


# Standalone compliance-only models (independent of sentinel.compliance.models)
class ControlStatus(str, enum.Enum):
    PASS = "pass"
    FAIL = "fail"
    NA = "na"
    PARTIAL = "partial"


@dataclass
class EvidenceRecord:
    signal_key: str
    signal_value: str


@dataclass
class ControlDefinition:
    control_id: str
    title: str
    category: str
    is_organisational: bool = False


@dataclass
class ComplianceResult:
    tenant_id: str
    framework_id: str
    control_id: str
    status: ControlStatus
    evidence: list
    remediation: Optional[str] = None
    scope_note: Optional[str] = None


class BaseFramework(ABC):
    framework_id: str = ""
    display_name: str = ""
    version: str = ""
    legal_weight: str = "informational"  # regulatory | contractual | best-practice | informational

    @abstractmethod
    def get_controls(self) -> list[ControlDefinition]:
        ...

    @abstractmethod
    def evaluate(self, signals: dict[str, Any], tenant_id: str) -> list[ComplianceResult]:
        ...

    def _make_result(
        self,
        tenant_id: str,
        ctrl_id: str,
        status: ControlStatus,
        evidence: dict,
        remediation: Optional[str] = None,
        scope_note: Optional[str] = None,
    ) -> ComplianceResult:
        evs = [EvidenceRecord(signal_key=k, signal_value=str(v)) for k, v in evidence.items()]
        return ComplianceResult(
            tenant_id=tenant_id,
            framework_id=self.framework_id,
            control_id=ctrl_id,
            status=status,
            evidence=evs,
            remediation=remediation,
            scope_note=scope_note,
        )
ComplianceFramework = BaseFramework
