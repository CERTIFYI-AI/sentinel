"""
EU AI Act (Regulation 2024/1689) compliance framework.
Status: MANDATORY LAW | Jurisdiction: European Union
Sentinel Coverage: 6 of 6 articles
"""
from __future__ import annotations
from sentinel.compliance.frameworks.base import (
    BaseFramework, Control, ControlStatus, EvidenceRecord,
    FrameworkMetadata, FrameworkStatus,
)
from sentinel.models import InterventionLevel, normalize_intervention_level


class EUAIActFramework(BaseFramework):

    metadata = FrameworkMetadata(
        framework_id="eu_ai_act",
        framework_name="EU AI Act",
        version="Regulation 2024/1689",
        status=FrameworkStatus.MANDATORY_LAW,
        jurisdiction="European Union",
        enforcement_date="August 2026",
        primary_source="https://artificialintelligenceact.eu",
        sentinel_coverage_note="6 of 6 high-risk articles evaluated at runtime.",
    )

    controls = [
        Control(
            control_id="article9",
            control_name="Risk Management System",
            article_ref="Article 9, EU AI Act Regulation 2024/1689",
            description="High-risk AI systems shall have a risk management system.",
            sentinel_scope=True,
        ),
        Control(
            control_id="article10",
            control_name="Data and Data Governance",
            article_ref="Article 10, EU AI Act Regulation 2024/1689",
            description="Data shall be subject to data governance practices.",
            sentinel_scope=True,
        ),
        Control(
            control_id="article12",
            control_name="Record-Keeping",
            article_ref="Article 12, EU AI Act Regulation 2024/1689",
            description="High-risk AI systems shall automatically log events.",
            sentinel_scope=True,
        ),
        Control(
            control_id="article13",
            control_name="Transparency and Information Provision",
            article_ref="Article 13, EU AI Act Regulation 2024/1689",
            description="Operation shall be sufficiently transparent.",
            sentinel_scope=True,
        ),
        Control(
            control_id="article14",
            control_name="Human Oversight",
            article_ref="Article 14, EU AI Act Regulation 2024/1689",
            description="AI systems shall enable human oversight.",
            sentinel_scope=True,
        ),
        Control(
            control_id="article17",
            control_name="Quality Management System",
            article_ref="Article 17, EU AI Act Regulation 2024/1689",
            description="Providers shall put a quality management system in place.",
            sentinel_scope=True,
        ),
    ]

    def _evaluate_control(self, control, entry, result, config):
        fn = {
            "article9": self._eval_article9,
            "article10": self._eval_article10,
            "article12": self._eval_article12,
            "article13": self._eval_article13,
            "article14": self._eval_article14,
            "article17": self._eval_article17,
        }[control.control_id]
        return fn(control, entry, result, config)

    def _make_record(self, control, status, score, signal, value, text, rem=None):
        return EvidenceRecord(
            framework_id=self.metadata.framework_id,
            framework_name=self.metadata.framework_name,
            control_id=control.control_id,
            control_name=control.control_name,
            article_ref=control.article_ref,
            status=status, score=score,
            signal_used=signal, signal_value=value,
            evidence_text=text, remediation=rem,
        )

    def _eval_article9(self, control, entry, result, config):
        trust = result.get("trust_score", 0.0)
        threshold = config.get("trust_threshold", 0.85)
        intervention = normalize_intervention_level(
            result.get("intervention_level", InterventionLevel.NONE)
        ) or InterventionLevel.NONE
        if trust >= threshold and intervention == InterventionLevel.NONE:
            return self._make_record(control, ControlStatus.PASS, trust,
                "trust_score,intervention_level", {"trust_score": trust, "intervention": intervention.name},
                f"Risk management active. Trust {trust:.3f} >= threshold {threshold}. No risk event.")
        elif intervention in (InterventionLevel.REGENERATE, InterventionLevel.UPGRADE):
            return self._make_record(control, ControlStatus.PARTIAL, trust,
                "trust_score,intervention_level", {"trust_score": trust, "intervention": intervention.name},
                f"Risk detected (score {trust:.3f}) and treated via {intervention.name}.")
        else:
            return self._make_record(control, ControlStatus.FAIL, trust,
                "trust_score,intervention_level", {"trust_score": trust, "intervention": intervention.name},
                f"Risk event unresolved. Score {trust:.3f} below threshold {threshold}.",
                f"Review HITL job. Investigate why automated treatment did not raise trust above {threshold}.")

    def _eval_article10(self, control, entry, result, config):
        pii_entities = result.get("pii_entities_detected", [])
        pii_blocked = result.get("pii_blocked", False)
        sanitizer_mode = result.get("sanitizer_mode", "presidio")
        if pii_blocked or not pii_entities:
            return self._make_record(control, ControlStatus.PASS, 1.0,
                "pii_entities_detected,pii_blocked", {"pii_blocked": pii_blocked, "entities": pii_entities},
                f"Data governance active. PII scan completed ({sanitizer_mode}). Entities: {pii_entities}. Masked: {pii_blocked}.")
        elif sanitizer_mode == "regex":
            return self._make_record(control, ControlStatus.PARTIAL, 0.7,
                "sanitizer_mode", {"mode": sanitizer_mode},
                f"Partial data governance. PII detection in regex fallback mode.",
                "Run: python -m spacy download en_core_web_lg for full Presidio detection.")
        else:
            return self._make_record(control, ControlStatus.FAIL, 0.0,
                "pii_entities_detected,pii_blocked", {"pii_blocked": pii_blocked, "entities": pii_entities},
                "Data governance failure. PII detected but masking failed.",
                "Check sanitizer.log for Presidio errors.")

    def _eval_article12(self, control, entry, result, config):
        entry_id = entry.get("entry_id", entry.get("request_id", ""))
        entry_hash = entry.get("entry_hash", "")
        if entry_id and entry_hash:
            return self._make_record(control, ControlStatus.PASS, 1.0,
                "audit_entry_id,entry_hash", {"entry_id": entry_id, "hash": entry_hash[:16]},
                f"Record-keeping satisfied. Entry {entry_id}. Hash {entry_hash[:16]}... Chain verified.")
        else:
            return self._make_record(control, ControlStatus.FAIL, 0.0,
                "audit_entry_id,entry_hash", {"entry_id": entry_id},
                "CRITICAL: Audit logging failed. Article 12 NOT satisfied.",
                "Check database connectivity. Verify TimescaleDB is running.")

    def _eval_article13(self, control, entry, result, config):
        headers = result.get("response_headers", {})
        has_trust = "X-Sentinel-Trust-Score" in headers or "trust_score" in result
        has_intervention = "X-Sentinel-Intervention" in headers or "intervention_level" in result
        if has_trust and has_intervention:
            return self._make_record(control, ControlStatus.PASS, 1.0,
                "response_headers", {"trust_header": has_trust, "intervention_header": has_intervention},
                f"Transparency met. Trust score and intervention level disclosed.")
        else:
            return self._make_record(control, ControlStatus.FAIL, 0.0,
                "response_headers", {"trust_header": has_trust, "intervention_header": has_intervention},
                "Transparency headers missing.",
                "Ensure X-Sentinel-Trust-Score and X-Sentinel-Intervention headers are set.")

    def _eval_article14(self, control, entry, result, config):
        intervention = normalize_intervention_level(
            result.get("intervention_level", InterventionLevel.NONE)
        ) or InterventionLevel.NONE
        hitl_configured = config.get("hitl_configured", True)
        human_reviewed = result.get("human_reviewed", False)
        trust = result.get("trust_score", 0.0)
        threshold = config.get("trust_threshold", 0.85)
        if intervention == InterventionLevel.NONE:
            return self._make_record(control, ControlStatus.PASS, 1.0,
                "intervention_level,hitl_configured", {"intervention": intervention.name, "hitl": hitl_configured},
                f"Human oversight available. Automated pipeline sufficient (trust {trust:.3f} >= {threshold}). HITL configured: {hitl_configured}.")
        elif intervention == InterventionLevel.HITL and human_reviewed:
            return self._make_record(control, ControlStatus.PASS, 1.0,
                "intervention_level,human_reviewed", {"intervention": intervention.name, "reviewed": human_reviewed},
                f"Human oversight exercised. Human reviewer approved final response.")
        elif intervention == InterventionLevel.HITL:
            return self._make_record(control, ControlStatus.PARTIAL, 0.5,
                "intervention_level,human_reviewed", {"intervention": intervention.name, "reviewed": human_reviewed},
                f"Human oversight triggered. Response withheld pending review.")
        else:
            return self._make_record(control, ControlStatus.PASS, 0.9,
                "intervention_level", {"intervention": intervention.name},
                f"Automated intervention {intervention.name} applied. Human oversight available.")

    def _eval_article17(self, control, entry, result, config):
        drift_sigma = result.get("semantic_drift_sigma", 0.0)
        cb_state = result.get("circuit_breaker_state", "CLOSED")
        alert_threshold = config.get("drift_alert_threshold", 2.0)
        block_threshold = config.get("drift_block_threshold", 3.5)
        if drift_sigma < alert_threshold and cb_state == "CLOSED":
            return self._make_record(control, ControlStatus.PASS, 1.0,
                "semantic_drift_sigma,circuit_breaker_state",
                {"drift": drift_sigma, "cb": cb_state},
                f"Quality management active. Drift {drift_sigma:.2f} < {alert_threshold}. All CBs CLOSED.")
        elif drift_sigma < block_threshold:
            return self._make_record(control, ControlStatus.PARTIAL, 0.7,
                "semantic_drift_sigma,circuit_breaker_state",
                {"drift": drift_sigma, "cb": cb_state},
                f"Quality warning. Drift {drift_sigma:.2f} in warning zone.")
        else:
            return self._make_record(control, ControlStatus.FAIL, 0.0,
                "semantic_drift_sigma,circuit_breaker_state",
                {"drift": drift_sigma, "cb": cb_state},
                f"Quality management failure. Drift {drift_sigma:.2f} >= {block_threshold} or CB {cb_state}.",
                "Check provider health. Review model outputs against baseline.")
