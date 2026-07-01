# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
"""Deterministic compliance policy rules.

These are Python assertions — LLMs decide NOTHING here. Each rule takes a plain
``metrics`` dict (collected from telemetry by the caller) and returns a
:class:`PolicyResult` with a PASS/FAIL status, the raw metric value (for
drift-trend history), the threshold used, and the frameworks impacted.

Intentionally dependency-free (stdlib only) so it is unit-testable in isolation
with no database or backend wiring. The keys in :data:`POLICY_RULES` match the
``policyRuleKey`` values in ``dashboard/src/data/complianceLibrary.ts``.

Status strings align with ``sentinel.compliance.evaluator.ControlStatus``
("PASS" / "FAIL").
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional


@dataclass
class PolicyResult:
    status: str                                   # "PASS" | "FAIL"
    metric_value: Optional[float]                 # raw measured value (stored in history)
    threshold_used: Optional[float]               # threshold at time of check
    reason: str                                   # stored in the NC description
    metric_name: str = ""                         # human label for the drift chart
    frameworks_impacted: list[str] = field(default_factory=list)


PolicyRule = Callable[[dict], PolicyResult]
POLICY_RULES: dict[str, PolicyRule] = {}


def rule(key: str) -> Callable[[PolicyRule], PolicyRule]:
    """Register a policy rule under ``key``."""
    def dec(fn: PolicyRule) -> PolicyRule:
        POLICY_RULES[key] = fn
        return fn
    return dec


def _num(metrics: dict, *keys: str) -> Optional[float]:
    for k in keys:
        v = metrics.get(k)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                return None
    return None


# ── Bias / Fairness ───────────────────────────────────────────────────────────
@rule("check_bias")
def check_bias(metrics: dict) -> PolicyResult:
    """EU-009 / NIST-005 / UNESCO-008 / IN-005 / SG-002 — demographic parity."""
    diff = _num(metrics, "demographic_parity_diff")
    threshold = _num(metrics, "bias_threshold") or 0.10
    if diff is None:
        return PolicyResult("PASS", None, threshold,
                            "No bias audit data available yet — manual review required",
                            "demographic_parity_diff",
                            ["EU_AI_ACT", "NIST_AI_RMF", "UNESCO_AI", "INDIA_AI_GOV"])
    if diff > threshold:
        return PolicyResult("FAIL", diff, threshold,
                            f"Demographic parity difference {diff:.3f} exceeds threshold {threshold:.2f}",
                            "demographic_parity_diff",
                            ["EU_AI_ACT", "NIST_AI_RMF", "ISO_42001", "UNESCO_AI", "INDIA_AI_GOV", "SG_MODEL_AI"])
    return PolicyResult("PASS", diff, threshold,
                        f"Bias within threshold ({diff:.3f} ≤ {threshold:.2f})",
                        "demographic_parity_diff", [])


# ── Data / Model Drift ────────────────────────────────────────────────────────
@rule("check_drift")
def check_drift(metrics: dict) -> PolicyResult:
    """NIST-007 / EU-006 / ISO42-008 / SG-005 / IN-007 — data/model drift %."""
    drift = _num(metrics, "drift_pct")
    threshold = _num(metrics, "drift_threshold") or 5.0
    if drift is None:
        return PolicyResult("PASS", None, threshold, "No drift telemetry yet", "drift_pct", [])
    if drift > threshold:
        return PolicyResult("FAIL", drift, threshold,
                            f"Data drift {drift:.1f}% exceeds {threshold:.0f}% threshold (NIST MANAGE 2.3)",
                            "drift_pct",
                            ["NIST_AI_RMF", "EU_AI_ACT", "ISO_42001", "SG_MODEL_AI", "INDIA_AI_GOV"])
    return PolicyResult("PASS", drift, threshold, f"Drift within threshold ({drift:.1f}%)", "drift_pct", [])


# ── Accuracy / Robustness ─────────────────────────────────────────────────────
@rule("check_accuracy")
def check_accuracy(metrics: dict) -> PolicyResult:
    """EU-008 / ISO42-008 — F1 / accuracy vs threshold."""
    f1 = _num(metrics, "f1_score")
    threshold = _num(metrics, "accuracy_threshold") or 0.85
    if f1 is None:
        return PolicyResult("PASS", None, threshold, "No eval data — schedule validation run", "f1_score", [])
    if f1 < threshold:
        return PolicyResult("FAIL", f1, threshold,
                            f"F1 score {f1:.3f} below threshold {threshold:.2f} (EU AI Act Art. 15)",
                            "f1_score", ["EU_AI_ACT", "ISO_42001"])
    return PolicyResult("PASS", f1, threshold, f"Accuracy within threshold (F1 {f1:.3f})", "f1_score", [])


# ── Trust Score ───────────────────────────────────────────────────────────────
@rule("check_trust_score")
def check_trust_score(metrics: dict) -> PolicyResult:
    """NIST-006 / EU-003 / SG-006 / OECD-004 — 24h avg trust score."""
    score = _num(metrics, "trust_score_avg", "trust_score")
    threshold = _num(metrics, "trust_threshold") or 0.85
    if score is None:
        return PolicyResult("PASS", None, threshold, "No trust trace data", "trust_score_avg", [])
    if score < threshold:
        return PolicyResult("FAIL", score, threshold,
                            f"Trust score avg {score:.3f} below threshold {threshold:.2f}",
                            "trust_score_avg", ["NIST_AI_RMF", "EU_AI_ACT", "SG_MODEL_AI", "OECD_AI"])
    return PolicyResult("PASS", score, threshold, f"Trust score healthy ({score:.3f})", "trust_score_avg", [])


# ── Prompt Injection Rate ─────────────────────────────────────────────────────
@rule("check_injection_rate")
def check_injection_rate(metrics: dict) -> PolicyResult:
    """MITRE-001 / OWASP-LLM01 / SAIF-002 / SG-007 — injection attempt rate."""
    rate = _num(metrics, "injection_attempt_rate")
    threshold = _num(metrics, "injection_threshold") or 0.01
    if rate is None:
        return PolicyResult("PASS", None, threshold, "No injection telemetry yet", "injection_attempt_rate", [])
    if rate > threshold:
        return PolicyResult("FAIL", rate, threshold,
                            f"Prompt injection rate {rate:.3%} exceeds threshold — adversarial activity suspected",
                            "injection_attempt_rate",
                            ["MITRE_ATLAS", "OWASP_LLM", "GOOGLE_SAIF", "SG_MODEL_AI"])
    return PolicyResult("PASS", rate, threshold, f"Injection rate within threshold ({rate:.3%})",
                        "injection_attempt_rate", [])


# ── PII Leakage (zero tolerance) ──────────────────────────────────────────────
@rule("check_pii_leakage")
def check_pii_leakage(metrics: dict) -> PolicyResult:
    """GDPR-001 / OWASP-LLM02 / UNESCO-003 / IN-002 — PII in outputs post-filter."""
    rate = _num(metrics, "pii_leakage_rate")
    threshold = 0.0
    if rate is None:
        return PolicyResult("PASS", None, threshold, "No output-filter telemetry yet", "pii_leakage_rate", [])
    if rate > threshold:
        return PolicyResult("FAIL", rate, threshold,
                            f"PII leakage detected in {rate:.3%} of outputs — GDPR Article 5 violation",
                            "pii_leakage_rate", ["GDPR", "OWASP_LLM", "UNESCO_AI", "INDIA_AI_GOV"])
    return PolicyResult("PASS", 0.0, threshold, "No PII leakage detected", "pii_leakage_rate", [])


# ── Hallucination / Cross-Check ───────────────────────────────────────────────
@rule("check_hallucination_rate")
def check_hallucination_rate(metrics: dict) -> PolicyResult:
    """OWASP-LLM09 / EU-005 / OECD-003 — RAG cross-check agreement (low = risk)."""
    score = _num(metrics, "cross_check_score_avg", "cross_check_score")
    threshold = _num(metrics, "cross_check_threshold") or 0.70
    if score is None:
        return PolicyResult("PASS", None, threshold, "No cross-check data", "cross_check_score_avg", [])
    if score < threshold:
        return PolicyResult("FAIL", score, threshold,
                            f"Cross-check agreement {score:.3f} below threshold — high hallucination risk",
                            "cross_check_score_avg", ["OWASP_LLM", "EU_AI_ACT", "OECD_AI"])
    return PolicyResult("PASS", score, threshold, f"Hallucination risk acceptable ({score:.3f})",
                        "cross_check_score_avg", [])


# ── Human Oversight (HITL coverage) ───────────────────────────────────────────
@rule("check_human_oversight")
def check_human_oversight(metrics: dict) -> PolicyResult:
    """EU-003 / GDPR-005 / OECD-002 / UNESCO-007 — HITL coverage of decisions."""
    actual = _num(metrics, "hitl_coverage_pct")
    required = _num(metrics, "required_hitl_pct") or 100.0
    if actual is None:
        return PolicyResult("PASS", None, required, "No HITL coverage telemetry yet", "hitl_coverage_pct", [])
    if actual < required:
        return PolicyResult("FAIL", actual, required,
                            f"HITL coverage {actual:.0f}% below required {required:.0f}% (EU AI Act Art. 14)",
                            "hitl_coverage_pct", ["EU_AI_ACT", "GDPR", "OECD_AI", "UNESCO_AI"])
    return PolicyResult("PASS", actual, required, f"Human oversight coverage sufficient ({actual:.0f}%)",
                        "hitl_coverage_pct", [])


def evaluate(key: str, metrics: dict) -> PolicyResult:
    """Main entry point. Unknown keys => PASS (manual attestation required)."""
    fn = POLICY_RULES.get(key)
    if fn is None:
        return PolicyResult("PASS", None, None,
                            f"No automated rule for '{key}' — manual attestation required", key, [])
    try:
        return fn(metrics)
    except Exception as exc:  # never let a rule crash the evaluation cycle
        return PolicyResult("FAIL", None, None, f"Policy rule error: {exc}", key, [])
