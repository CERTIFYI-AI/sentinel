"""
Certifyi Sentinel — Compliance Evaluator

Called as a background task after every successful audit log write.
Evaluates all AUTO controls against the 8 pipeline signals in the audit entry.
Returns one ControlEvalResult per AUTO control — no I/O until persist step.

PASS  — signal_value >= threshold (or boolean pass condition met)
WARN  — signal_value within 10% below threshold
FAIL  — signal_value below warn band — remediation instruction included
NA    — control.eval_type is NA — evidence requirements returned
MANUAL — control.eval_type is MANUAL — attestation status returned
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from sentinel.compliance.control_registry import (
    ALL_CONTROLS, Control, EvalType, ControlSeverity
)
from sentinel.models import InterventionLevel, normalize_intervention_level


class ControlStatus(str, Enum):
    PASS    = "PASS"
    FAIL    = "FAIL"
    WARN    = "WARN"
    NA      = "NA"
    MANUAL  = "MANUAL"
    PENDING = "PENDING"   # Signal present in entry but not yet evaluated
    NC      = "NC"        # Formal Non-Conformance raised


@dataclass
class ControlEvalResult:
    control_id:       str
    framework_id:     str
    status:           ControlStatus
    signal_name:      Optional[str]
    signal_value:     Optional[float]
    threshold:        Optional[float]
    delta:            Optional[float]      # signal_value - threshold (negative = FAIL)
    evidence_note:    str                  # Human-readable explanation
    remediation:      Optional[str]        # Present only on FAIL
    evaluated_at:     str                  # ISO 8601
    audit_entry_id:   Optional[str]


# Map signal_name → field name in the audit_log dict
_SIGNAL_FIELD: dict[str, str] = {
    "trust_score":              "trust_score",
    "pii_clean":                "pii_clean_score",
    "rag_entailment":           "rag_entailment_score",
    "drift_score":              "drift_score",
    "pii_detected":             "pii_detected",
    "audit_chain_integrity":    "chain_intact",
    "model_inventory_complete": "model_inventory_complete",
    "intervention":             "intervention_level",
}

# Intervention levels that pass / warn / fail.
#
# InterventionLevel (sentinel/models) is an IntEnum: NONE=0,
# REGENERATE=1, UPGRADE=2, HITL=3. The audit_log field this maps to
# (intervention_level) stores that int directly — it was never a string
# enum name, so the previous `str(raw).upper()` comparison against
# {"NONE","REGENERATE"} etc. could never match and always fell through to
# FAIL. There is no BLOCKED member on InterventionLevel (it was aspirational
# in the old string set); HITL is the highest/most severe level today.
_INTERVENTION_PASS = {InterventionLevel.NONE, InterventionLevel.REGENERATE}
_INTERVENTION_WARN = {InterventionLevel.UPGRADE}
_INTERVENTION_FAIL = {InterventionLevel.HITL}

# Normalization (int, legacy string names, "L0".."L3" tier strings) now
# lives in sentinel.models.normalize_intervention_level — the single
# shared source of truth also used by sentinel/compliance/frameworks/*.py.


class ComplianceEvaluator:
    """
    Evaluates all AUTO controls against a single audit_log entry dict.

    Usage (in background_runner.py):
        evaluator = ComplianceEvaluator()
        results = evaluator.evaluate_entry(audit_entry, tenant_id)
        # Synchronous — no I/O. Persist results separately.
    """

    def __init__(self) -> None:
        self._auto_controls: list[Control] = [
            c for c in ALL_CONTROLS if c.eval_type == EvalType.AUTO
        ]
        self._manual_controls: list[Control] = [
            c for c in ALL_CONTROLS if c.eval_type == EvalType.MANUAL
        ]
        self._na_controls: list[Control] = [
            c for c in ALL_CONTROLS if c.eval_type == EvalType.NA
        ]

    def evaluate_entry(
        self,
        audit_entry: dict[str, Any],
        tenant_id: str,
    ) -> list[ControlEvalResult]:
        """
        Pure evaluation — no database I/O.
        Returns one result per AUTO control.
        NA and MANUAL controls return descriptive results but are not scored.
        """
        now = datetime.now(timezone.utc).isoformat()
        results: list[ControlEvalResult] = []
        audit_id = str(audit_entry.get("id", ""))

        for control in self._auto_controls:
            result = self._eval_auto(control, audit_entry, now, audit_id)
            results.append(result)

        for control in self._na_controls:
            results.append(ControlEvalResult(
                control_id=control.id, framework_id=control.framework_id,
                status=ControlStatus.NA, signal_name=None, signal_value=None,
                threshold=None, delta=None,
                evidence_note=control.na_evidence_required or "Manual evidence required.",
                remediation=None, evaluated_at=now, audit_entry_id=audit_id or None,
            ))

        for control in self._manual_controls:
            results.append(ControlEvalResult(
                control_id=control.id, framework_id=control.framework_id,
                status=ControlStatus.MANUAL, signal_name=None, signal_value=None,
                threshold=None, delta=None,
                evidence_note=(
                    f"Manual attestation required every "
                    f"{control.attestation_interval_days} days. "
                    f"{control.na_evidence_required or ''}"
                ),
                remediation=None, evaluated_at=now, audit_entry_id=audit_id or None,
            ))

        return results

    # ── private helpers ───────────────────────────────────────────────────────

    def _eval_auto(
        self,
        control: Control,
        entry: dict[str, Any],
        now: str,
        audit_id: str,
    ) -> ControlEvalResult:
        signal = control.signal_name
        if signal is None:
            return self._pending(control, "No signal_name defined on control.", now, audit_id)

        field = _SIGNAL_FIELD.get(signal)
        if field is None:
            return self._pending(control, f"Signal '{signal}' not mapped to an audit field.", now, audit_id)

        raw = entry.get(field)
        if raw is None:
            return self._pending(control, f"Field '{field}' absent from audit entry.", now, audit_id)

        # ── intervention (enum) ───────────────────────────────────────────────
        if signal == "intervention":
            level = normalize_intervention_level(raw)
            if level is None:
                return self._pending(
                    control,
                    f"Unrecognised intervention_level value: {raw!r}.",
                    now, audit_id,
                )
            level_label = level.name
            if level in _INTERVENTION_PASS:
                return ControlEvalResult(
                    control_id=control.id, framework_id=control.framework_id,
                    status=ControlStatus.PASS, signal_name=signal, signal_value=float(level),
                    threshold=None, delta=None,
                    evidence_note=f"Intervention level {level_label} — within acceptable bounds.",
                    remediation=None, evaluated_at=now, audit_entry_id=audit_id or None,
                )
            if level in _INTERVENTION_WARN:
                return ControlEvalResult(
                    control_id=control.id, framework_id=control.framework_id,
                    status=ControlStatus.WARN, signal_name=signal, signal_value=float(level),
                    threshold=None, delta=None,
                    evidence_note=f"Intervention level {level_label} — elevated risk, monitor closely.",
                    remediation=control.remediation, evaluated_at=now, audit_entry_id=audit_id or None,
                )
            return ControlEvalResult(
                control_id=control.id, framework_id=control.framework_id,
                status=ControlStatus.FAIL, signal_name=signal, signal_value=float(level),
                threshold=None, delta=None,
                evidence_note=(
                    f"Intervention level {level_label} — human oversight required. "
                    "Review HITL queue item for this session."
                ),
                remediation=control.remediation, evaluated_at=now, audit_entry_id=audit_id or None,
            )

        # ── boolean signals ───────────────────────────────────────────────────
        if signal == "pii_detected":
            detected = bool(raw)
            return ControlEvalResult(
                control_id=control.id, framework_id=control.framework_id,
                status=ControlStatus.WARN if detected else ControlStatus.PASS,
                signal_name=signal, signal_value=1.0 if detected else 0.0,
                threshold=None, delta=None,
                evidence_note=(
                    "PII detected — data minimisation review recommended."
                    if detected else "No PII detected."
                ),
                remediation=control.remediation if detected else None,
                evaluated_at=now, audit_entry_id=audit_id or None,
            )

        if signal == "audit_chain_integrity":
            intact = bool(raw)
            return ControlEvalResult(
                control_id=control.id, framework_id=control.framework_id,
                status=ControlStatus.PASS if intact else ControlStatus.FAIL,
                signal_name=signal, signal_value=1.0 if intact else 0.0,
                threshold=1.0, delta=0.0 if intact else -1.0,
                evidence_note=(
                    f"Audit chain integrity verified for entry {audit_id}."
                    if intact else
                    f"CHAIN INTEGRITY FAILURE on entry {audit_id}. Immediate investigation required."
                ),
                remediation=None if intact else control.remediation,
                evaluated_at=now, audit_entry_id=audit_id or None,
            )

        if signal == "model_inventory_complete":
            complete = bool(raw)
            return ControlEvalResult(
                control_id=control.id, framework_id=control.framework_id,
                status=ControlStatus.PASS if complete else ControlStatus.FAIL,
                signal_name=signal, signal_value=1.0 if complete else 0.0,
                threshold=1.0, delta=0.0 if complete else -1.0,
                evidence_note=(
                    "Model inventory record complete."
                    if complete else
                    "Model inventory record missing required fields."
                ),
                remediation=None if complete else control.remediation,
                evaluated_at=now, audit_entry_id=audit_id or None,
            )

        # ── numeric threshold signals ─────────────────────────────────────────
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return self._pending(control, f"Could not cast '{raw}' to float.", now, audit_id)

        threshold = control.pass_threshold
        if threshold is None:
            # No threshold defined — treat as informational PASS
            return ControlEvalResult(
                control_id=control.id, framework_id=control.framework_id,
                status=ControlStatus.PASS, signal_name=signal, signal_value=value,
                threshold=None, delta=None,
                evidence_note=f"{signal} = {value:.4f} (no threshold — informational).",
                remediation=None, evaluated_at=now, audit_entry_id=audit_id or None,
            )

        threshold = float(threshold)
        delta = round(value - threshold, 6)
        warn_band = threshold * 0.90   # within 10% below threshold = WARN

        if value >= threshold:
            status = ControlStatus.PASS
            note = (
                f"{signal} = {value:.4f} >= threshold {threshold:.4f} "
                f"(delta {delta:+.4f}). Evidenced by audit entry {audit_id}."
            )
            remediation = None
        elif value >= warn_band:
            status = ControlStatus.WARN
            note = (
                f"{signal} = {value:.4f} — within 10% of threshold {threshold:.4f} "
                f"(delta {delta:+.4f}). Monitor closely."
            )
            remediation = control.remediation
        else:
            status = ControlStatus.FAIL
            note = (
                f"{signal} = {value:.4f} < threshold {threshold:.4f} "
                f"(delta {delta:+.4f}). Control not satisfied."
            )
            remediation = control.remediation

        return ControlEvalResult(
            control_id=control.id, framework_id=control.framework_id,
            status=status, signal_name=signal, signal_value=value,
            threshold=threshold, delta=delta,
            evidence_note=note, remediation=remediation,
            evaluated_at=now, audit_entry_id=audit_id or None,
        )

    @staticmethod
    def _pending(control: Control, reason: str, now: str, audit_id: str) -> ControlEvalResult:
        return ControlEvalResult(
            control_id=control.id, framework_id=control.framework_id,
            status=ControlStatus.PENDING, signal_name=control.signal_name,
            signal_value=None, threshold=control.pass_threshold, delta=None,
            evidence_note=reason, remediation=None,
            evaluated_at=now, audit_entry_id=audit_id or None,
        )
