# SPDX-License-Identifier: Apache-2.0
"""Unit tests for the deterministic compliance policy rules + drift classifier.

No DB / backend wiring — pure logic, exactly as the rules are meant to be run.
"""

from sentinel.compliance.policy_rules import evaluate, POLICY_RULES
from sentinel.compliance.drift_detector import classify_drift, DriftSeverity


class TestPolicyRules:
    def test_bias_fail_over_threshold(self):
        r = evaluate("check_bias", {"demographic_parity_diff": 0.15})
        assert r.status == "FAIL"
        assert r.metric_value == 0.15
        assert "EU_AI_ACT" in r.frameworks_impacted

    def test_bias_pass_within_threshold(self):
        r = evaluate("check_bias", {"demographic_parity_diff": 0.04})
        assert r.status == "PASS"
        assert r.frameworks_impacted == []

    def test_bias_missing_data_is_pass_manual(self):
        r = evaluate("check_bias", {})
        assert r.status == "PASS"
        assert r.metric_value is None

    def test_drift_fail(self):
        r = evaluate("check_drift", {"drift_pct": 7.2})
        assert r.status == "FAIL" and r.metric_value == 7.2

    def test_accuracy_fail(self):
        r = evaluate("check_accuracy", {"f1_score": 0.70})
        assert r.status == "FAIL"

    def test_pii_zero_tolerance(self):
        assert evaluate("check_pii_leakage", {"pii_leakage_rate": 0.001}).status == "FAIL"
        assert evaluate("check_pii_leakage", {"pii_leakage_rate": 0.0}).status == "PASS"

    def test_hitl_coverage(self):
        assert evaluate("check_human_oversight", {"hitl_coverage_pct": 80}).status == "FAIL"
        assert evaluate("check_human_oversight", {"hitl_coverage_pct": 100}).status == "PASS"

    def test_unknown_key_is_manual_pass(self):
        r = evaluate("nope", {})
        assert r.status == "PASS" and "manual attestation" in r.reason

    def test_all_registered_rules_never_raise(self):
        for key in POLICY_RULES:
            r = evaluate(key, {})          # empty metrics must not throw
            assert r.status in ("PASS", "FAIL")


class TestDriftClassifier:
    def test_status_flip_is_critical(self):
        assert classify_drift("PASS", "FAIL", [0.9, 0.88, 0.83, 0.79, 0.71]).drift_severity == DriftSeverity.CRITICAL

    def test_three_consecutive_degradations_is_warning(self):
        assert classify_drift("PASS", "PASS", [0.91, 0.89, 0.87, 0.85]).drift_severity == DriftSeverity.WARNING

    def test_single_adverse_move_is_watch(self):
        assert classify_drift("PASS", "PASS", [0.90, 0.91, 0.89]).drift_severity == DriftSeverity.WATCH

    def test_stable_is_none(self):
        assert classify_drift("PASS", "PASS", [0.90, 0.90, 0.91]).drift_severity == DriftSeverity.NONE

    def test_empty_history_is_none(self):
        assert classify_drift(None, "PASS", []).drift_severity == DriftSeverity.NONE

    def test_delta_pct_computed(self):
        res = classify_drift("PASS", "PASS", [1.0, 0.9])
        assert round(res.delta_pct, 1) == -10.0
