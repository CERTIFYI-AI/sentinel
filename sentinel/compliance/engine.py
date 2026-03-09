"""Compliance evaluation engine.

Evaluates Sentinel signals against framework controls to produce
real-time compliance evidence. Runs as a background task, never
in the request path.

Hard rules:
- Never mark a control PASS if the underlying signal was not computed
- Never mark an organisational control anything other than NA
- Never run compliance evaluation in the request path
"""
from __future__ import annotations

import logging
from typing import Any

from sentinel.compliance.models import (
    ComplianceFramework,
    ComplianceResult,
    ControlCategory,
    ControlDefinition,
    ControlResult,
    ControlStatus,
    EvidenceRecord,
)

logger = logging.getLogger(__name__)


def _extract_signal(
    signals: dict[str, Any],
    control: ControlDefinition,
) -> float | None:
    """Extract the signal value for a control from the signals dict."""
    if control.signal_source is None:
        return None
    return signals.get(control.signal_source.value)


def _evaluate_control(
    control: ControlDefinition,
    signals: dict[str, Any],
    tenant_id: str,
    framework_id: str,
) -> ControlResult:
    """Evaluate a single control against available signals."""
    # Organisational controls are always NA
    if control.category == ControlCategory.ORGANISATIONAL:
        evidence = EvidenceRecord(
            control_id=control.control_id,
            framework_id=framework_id,
            tenant_id=tenant_id,
            signal_source=control.signal_source.value if control.signal_source else "none",
            signal_value=None,
            threshold=None,
            status=ControlStatus.NA,
            evidence_text=(
                f"{control.title}: Organisational control — "
                "requires manual attestation. Not evaluated automatically."
            ),
        )
        return ControlResult(
            control_id=control.control_id,
            title=control.title,
            status=ControlStatus.NA,
            evidence=evidence,
            category=control.category.value,
            signal_source=control.signal_source.value if control.signal_source else None,
            signal_value=None,
            threshold=None,
            remediation=control.remediation,
        )

    signal_value = _extract_signal(signals, control)

    # Signal not computed — cannot PASS
    if signal_value is None:
        evidence = EvidenceRecord(
            control_id=control.control_id,
            framework_id=framework_id,
            tenant_id=tenant_id,
            signal_source=control.signal_source.value if control.signal_source else "none",
            signal_value=None,
            threshold=control.pass_threshold,
            status=ControlStatus.ERROR,
            evidence_text=(
                f"{control.title}: Signal '{control.signal_source.value if control.signal_source else 'unknown'}' "
                "was not computed. Control cannot be evaluated."
            ),
        )
        return ControlResult(
            control_id=control.control_id,
            title=control.title,
            status=ControlStatus.ERROR,
            evidence=evidence,
            category=control.category.value,
            signal_source=control.signal_source.value if control.signal_source else None,
            signal_value=None,
            threshold=control.pass_threshold,
            remediation=control.remediation,
        )

    # Determine status
    status = _compute_status(signal_value, control)
    evidence_text = control.evidence_template.format(
        value=signal_value,
        threshold=control.pass_threshold,
        status=status.value,
    )

    evidence = EvidenceRecord(
        control_id=control.control_id,
        framework_id=framework_id,
        tenant_id=tenant_id,
        signal_source=control.signal_source.value if control.signal_source else "none",
        signal_value=signal_value,
        threshold=control.pass_threshold,
        status=status,
        evidence_text=evidence_text,
        raw_data={"signal_value": signal_value, "signals_snapshot": signals},
    )

    return ControlResult(
        control_id=control.control_id,
        title=control.title,
        status=status,
        evidence=evidence,
        category=control.category.value,
        signal_source=control.signal_source.value if control.signal_source else None,
        signal_value=signal_value,
        threshold=control.pass_threshold,
        remediation=control.remediation,
    )


def _compute_status(
    value: float,
    control: ControlDefinition,
) -> ControlStatus:
    """Determine PASS/FAIL/PARTIAL based on thresholds.

    For most signals, higher is better (e.g. trust_score >= 0.85 = PASS).
    For inverted signals (injection_score, toxicity_score), lower is better.
    """
    inverted_signals = {"injection_score", "toxicity_score"}
    source_name = control.signal_source.value if control.signal_source else ""

    if source_name in inverted_signals:
        # Lower is better: pass if value <= pass_threshold
        if control.pass_threshold is not None and value <= control.pass_threshold:
            return ControlStatus.PASS
        if control.fail_threshold is not None and value > control.fail_threshold:
            return ControlStatus.FAIL
        return ControlStatus.PARTIAL
    else:
        # Higher is better: pass if value >= pass_threshold
        if control.pass_threshold is not None and value >= control.pass_threshold:
            return ControlStatus.PASS
        if control.fail_threshold is not None and value < control.fail_threshold:
            return ControlStatus.FAIL
        return ControlStatus.PARTIAL


class ComplianceEngine:
    """Evaluate Sentinel signals against compliance frameworks.

    Usage:
        engine = ComplianceEngine()
        result = engine.evaluate(
            framework=eu_ai_act,
            signals={"trust_score": 0.92, "injection_score": 0.12, ...},
            tenant_id="tenant-123",
            request_id="req-456",
        )
    """

    def evaluate(
        self,
        framework: ComplianceFramework,
        signals: dict[str, Any],
        tenant_id: str,
        request_id: str,
    ) -> ComplianceResult:
        """Evaluate all controls in a framework against signals.

        This method is synchronous and should be called from a
        background task, never from the request path.
        """
        results: list[ControlResult] = []
        for control in framework.controls:
            try:
                result = _evaluate_control(
                    control, signals, tenant_id, framework.framework_id,
                )
                results.append(result)
            except Exception:
                logger.exception(
                    "Failed to evaluate control %s in %s",
                    control.control_id,
                    framework.framework_id,
                )
                evidence = EvidenceRecord(
                    control_id=control.control_id,
                    framework_id=framework.framework_id,
                    tenant_id=tenant_id,
                    status=ControlStatus.ERROR,
                    evidence_text=f"Evaluation error for {control.control_id}",
                )
                results.append(ControlResult(
                    control_id=control.control_id,
                    title=control.title,
                    status=ControlStatus.ERROR,
                    evidence=evidence,
                    category=control.category.value,
                    signal_source=control.signal_source.value if control.signal_source else None,
                    signal_value=None,
                    threshold=control.pass_threshold,
                    remediation=control.remediation,
                ))

        return ComplianceResult(
            framework_id=framework.framework_id,
            framework_name=framework.name,
            framework_version=framework.version,
            tenant_id=tenant_id,
            request_id=request_id,
            controls=results,
        )

    def evaluate_all(
        self,
        frameworks: list[ComplianceFramework],
        signals: dict[str, Any],
        tenant_id: str,
        request_id: str,
    ) -> list[ComplianceResult]:
        """Evaluate signals against multiple frameworks."""
        return [
            self.evaluate(fw, signals, tenant_id, request_id)
            for fw in frameworks
        ]



# Module-level singleton for import convenience
compliance_engine = ComplianceEngine()