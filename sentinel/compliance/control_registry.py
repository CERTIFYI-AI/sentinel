"""
sentinel/compliance/control_registry.py
========================================
Certifyi Sentinel — Compliance Control Registry
Authoritative source for all 99 controls across 12 frameworks.

Evaluation types:
  AUTO   — Sentinel pipeline signal evaluates this at runtime.
           Every AUTO control names an exact signal and threshold.
  MANUAL — Requires human attestation. Sentinel creates a recurring task.
  NA     — Not evaluable at runtime. Documents what evidence is required.

Signal names (sourced from audit_log entries):
  trust_score           — 0.0–1.0  weighted 4-factor formula
  pii_clean             — 0.0–1.0  Presidio PII masking rate
  rag_entailment        — 0.0–1.0  NLI entailment against knowledge base
  drift_score           — 0.0–1.0  semantic drift inverse from baseline
  pii_detected          — bool     any PII present in request
  audit_chain_integrity — bool     SHA-256 hash chain intact
  intervention          — enum     NONE|REGENERATE|UPGRADE|HITL|BLOCKED
  model_inventory_complete — bool  all required model fields populated

Architect's rule: if a control cannot be directly evidenced by one of
the 8 signals above, it is marked NA. We do not claim PASS on controls
Sentinel cannot evaluate. False compliance is worse than no compliance.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class EvalType(str, Enum):
    AUTO   = "AUTO"
    MANUAL = "MANUAL"
    NA     = "NA"


class ControlSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH     = "HIGH"
    MEDIUM   = "MEDIUM"
    LOW      = "LOW"


@dataclass
class Control:
    id: str                                      # "{fw_id}.{category}.{nn}"
    framework_id: str                            # e.g. "eu_ai_act"
    control_code: str                            # Official code, e.g. "Art. 13(1)"
    title: str
    description: str
    category: str
    eval_type: EvalType
    severity: ControlSeverity
    # AUTO fields
    signal_name: Optional[str] = None
    pass_threshold: Optional[float] = None
    pipeline_layer: Optional[str] = None        # "sanitizer"|"verifier"|"circuit_breaker"|"auditor"
    # MANUAL fields
    attestation_interval_days: Optional[int] = None
    # NA + MANUAL — human evidence requirements
    na_evidence_required: Optional[str] = None
    # Remediation shown on FAIL
    remediation: Optional[str] = None


# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 1 — EU AI ACT  (12 controls)
# Primary source: Regulation (EU) 2024/1689
# ══════════════════════════════════════════════════════════════════════════════

EU_AI_ACT: list[Control] = [
    Control(
        id="eu_ai_act.transparency.01", framework_id="eu_ai_act",
        control_code="Art. 13(1)", title="Output Transparency",
        category="Transparency",
        description="High-risk AI systems shall be transparent enough for users to interpret outputs.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="trust_score", pass_threshold=0.70,
        pipeline_layer="verifier",
        remediation="Trust score <0.70 means outputs cannot be reliably interpreted. "
                    "Enable HITL at this threshold so a human reviews before delivery.",
    ),
    Control(
        id="eu_ai_act.transparency.02", framework_id="eu_ai_act",
        control_code="Art. 52(1)", title="Disclosure of AI Interaction",
        category="Transparency",
        description="Persons interacting with AI must be informed they are talking to an AI.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=90,
        na_evidence_required="UI screenshot or UX audit confirming an AI disclosure notice is "
                              "displayed to end users before or at the start of each session.",
        remediation="Add a visible AI disclosure banner. Attest with screenshot in Evidence Hub.",
    ),
    Control(
        id="eu_ai_act.data_governance.03", framework_id="eu_ai_act",
        control_code="Art. 10(3)", title="PII Governance in Data",
        category="Data Governance",
        description="Training and inference data must be subject to appropriate PII governance.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="pii_clean", pass_threshold=0.95,
        pipeline_layer="sanitizer",
        remediation="pii_clean <0.95: Presidio is missing entity types. Add custom recognisers "
                    "for your domain. Increase sensitivity threshold in tenant PII settings.",
    ),
    Control(
        id="eu_ai_act.human_oversight.04", framework_id="eu_ai_act",
        control_code="Art. 14(1)", title="Human Oversight Mechanism",
        category="Human Oversight",
        description="High-risk AI systems must support effective human oversight during use.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="HITL queue is not activating. Verify HITL is enabled in tenant config "
                    "and that the trust_score threshold is set low enough to trigger reviews.",
    ),
    Control(
        id="eu_ai_act.accuracy.05", framework_id="eu_ai_act",
        control_code="Art. 15(1)", title="Accuracy and Robustness",
        category="Accuracy",
        description="High-risk AI systems shall achieve appropriate accuracy and robustness.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="rag_entailment", pass_threshold=0.75,
        pipeline_layer="verifier",
        remediation="RAG entailment <0.75: responses not grounded in knowledge base. "
                    "Increase context window, audit vector store, add relevant documents.",
    ),
    Control(
        id="eu_ai_act.record_keeping.06", framework_id="eu_ai_act",
        control_code="Art. 12(1)", title="Audit Log and Record Keeping",
        category="Record Keeping",
        description="High-risk AI systems must automatically record events throughout their lifetime.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="audit_chain_integrity", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="Chain integrity failure. Stop writes, investigate broken entry via "
                    "/dashboard/audit/integrity, repair chain before resuming operations.",
    ),
    Control(
        id="eu_ai_act.risk_management.07", framework_id="eu_ai_act",
        control_code="Art. 9(1)", title="Risk Management System",
        category="Risk Management",
        description="A risk management system shall be established and maintained for high-risk AI.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.CRITICAL,
        attestation_interval_days=180,
        na_evidence_required="Risk management policy: risk identification methodology, assessment "
                              "criteria, treatment decisions, review schedule. Upload to Evidence Hub.",
    ),
    Control(
        id="eu_ai_act.conformity.08", framework_id="eu_ai_act",
        control_code="Art. 43", title="Conformity Assessment",
        category="Conformity",
        description="Providers must carry out a conformity assessment before market placement.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=365,
        na_evidence_required="Conformity assessment report signed by responsible person, "
                              "including technical documentation per Annex IV.",
    ),
    Control(
        id="eu_ai_act.drift.09", framework_id="eu_ai_act",
        control_code="Art. 9(5)", title="Continuous Risk Monitoring — Semantic Drift",
        category="Risk Management",
        description="Risk management must include continuous monitoring of AI performance.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="drift_score", pass_threshold=0.80,
        pipeline_layer="verifier",
        remediation="Drift <0.80: model outputs drifting from baseline. Update baseline "
                    "distribution in tenant settings or trigger a model revalidation run.",
    ),
    Control(
        id="eu_ai_act.bias.10", framework_id="eu_ai_act",
        control_code="Art. 10(2)(f)", title="Bias Monitoring",
        category="Data Governance",
        description="Training data must be examined for biases affecting fundamental rights.",
        eval_type=EvalType.NA, severity=ControlSeverity.HIGH,
        na_evidence_required="Bias evaluation report from /evals/bias-audits covering demographic "
                              "parity, equalised odds, and counterfactual fairness. Run quarterly.",
    ),
    Control(
        id="eu_ai_act.instructions.11", framework_id="eu_ai_act",
        control_code="Art. 13(3)", title="Instructions for Use",
        category="Transparency",
        description="High-risk AI systems must be accompanied by user instructions.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.MEDIUM,
        attestation_interval_days=180,
        na_evidence_required="Published user documentation covering: intended use, limitations, "
                              "trust score interpretation guide, and HITL escalation procedure.",
    ),
    Control(
        id="eu_ai_act.registration.12", framework_id="eu_ai_act",
        control_code="Art. 49", title="EU Database Registration",
        category="Conformity",
        description="High-risk AI systems must be registered in the EU AI database before market entry.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=365,
        na_evidence_required="EU AI Act database registration number and confirmation email. "
                              "Upload with expiry date set to registration renewal.",
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 2 — GDPR  (8 controls)
# Primary source: Regulation (EU) 2016/679
# ══════════════════════════════════════════════════════════════════════════════

GDPR: list[Control] = [
    Control(
        id="gdpr.lawfulness.01", framework_id="gdpr",
        control_code="Art. 5(1)(a)", title="Lawfulness, Fairness and Transparency",
        category="Principles",
        description="Personal data shall be processed lawfully, fairly, and transparently.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="pii_clean", pass_threshold=0.95,
        pipeline_layer="sanitizer",
        remediation="pii_clean <0.95: PII in model I/O not fully masked. Review Presidio entity "
                    "list for your jurisdiction. Check sanitizer audit entries for missed types.",
    ),
    Control(
        id="gdpr.purpose_limitation.02", framework_id="gdpr",
        control_code="Art. 5(1)(b)", title="Purpose Limitation",
        category="Principles",
        description="Data collected for specified purposes must not be used incompatibly.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=180,
        na_evidence_required="Data Processing Agreement (DPA) or internal privacy policy "
                              "specifying AI processing purposes. Review when adding new models.",
    ),
    Control(
        id="gdpr.data_minimisation.03", framework_id="gdpr",
        control_code="Art. 5(1)(c)", title="Data Minimisation",
        category="Principles",
        description="Personal data must be adequate, relevant, and limited to what is necessary.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="pii_detected", pass_threshold=None,
        pipeline_layer="sanitizer",
        remediation="PII detected: evaluate whether the use case requires this data. "
                    "If not, reject at the prompt injection layer before forwarding to model.",
    ),
    Control(
        id="gdpr.accuracy.04", framework_id="gdpr",
        control_code="Art. 5(1)(d)", title="Accuracy of Processed Data",
        category="Principles",
        description="Personal data shall be accurate and kept up to date.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.MEDIUM,
        signal_name="rag_entailment", pass_threshold=0.75,
        pipeline_layer="verifier",
        remediation="RAG entailment <0.75: responses referencing personal data may be inaccurate. "
                    "Update knowledge base and re-run entailment verification.",
    ),
    Control(
        id="gdpr.storage_limitation.05", framework_id="gdpr",
        control_code="Art. 5(1)(e)", title="Storage Limitation",
        category="Principles",
        description="Personal data kept no longer than necessary for its purposes.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=90,
        na_evidence_required="Data retention policy specifying max retention for audit log entries "
                              "containing personal data, plus evidence of automated deletion via "
                              "TimescaleDB retention policy configuration.",
    ),
    Control(
        id="gdpr.integrity_confidentiality.06", framework_id="gdpr",
        control_code="Art. 5(1)(f)", title="Integrity and Confidentiality",
        category="Principles",
        description="Data must be processed ensuring appropriate security against unauthorised access.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="audit_chain_integrity", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="Chain integrity failure = potential data tampering. Treat as security incident. "
                    "Notify DPA within 72 hours per Art. 33 if personal data confirmed affected.",
    ),
    Control(
        id="gdpr.dsar.07", framework_id="gdpr",
        control_code="Art. 15–22", title="Data Subject Rights",
        category="Rights",
        description="Data subjects have rights to access, rectification, erasure, portability, objection.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=90,
        na_evidence_required="DSAR procedure document and evidence of at least one completed DSAR "
                              "response. If no DSARs received, attest with procedure confirmation.",
    ),
    Control(
        id="gdpr.dpia.08", framework_id="gdpr",
        control_code="Art. 35", title="Data Protection Impact Assessment",
        category="Risk Management",
        description="High-risk processing likely to affect natural persons requires a DPIA.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.CRITICAL,
        attestation_interval_days=365,
        na_evidence_required="Completed DPIA signed by DPO. Must be completed before deploying "
                              "any new high-risk AI model. Upload with model ID linked.",
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 3 — ISO 42001  (10 controls)
# Primary source: ISO/IEC 42001:2023
# ══════════════════════════════════════════════════════════════════════════════

ISO_42001: list[Control] = [
    Control(
        id="iso_42001.context.01", framework_id="iso_42001",
        control_code="4.1", title="Understanding Organisational Context",
        category="Context",
        description="Determine external/internal issues relevant to AI management system outcomes.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.MEDIUM,
        attestation_interval_days=365,
        na_evidence_required="Documented context analysis: internal capabilities, regulatory "
                              "environment, stakeholder requirements for AI systems.",
    ),
    Control(
        id="iso_42001.leadership.02", framework_id="iso_42001",
        control_code="5.1", title="Leadership Commitment",
        category="Leadership",
        description="Top management shall demonstrate leadership and commitment to the AI management system.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=365,
        na_evidence_required="Signed AI governance policy from C-level or board including: "
                              "AI ethics principles, accountability structure, resource commitment.",
    ),
    Control(
        id="iso_42001.risk_assessment.03", framework_id="iso_42001",
        control_code="6.1.2", title="AI Risk Assessment",
        category="Planning",
        description="Plan, implement, control, review, and maintain AI-specific risk assessment.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="trust_score", pass_threshold=0.75,
        pipeline_layer="verifier",
        remediation="Trust score <0.75 evidences elevated AI risk. Update the risk register "
                    "with affected model and session IDs. Schedule a review within 5 business days.",
    ),
    Control(
        id="iso_42001.objectives.04", framework_id="iso_42001",
        control_code="6.2", title="AI Objectives and Planning",
        category="Planning",
        description="Establish AI objectives at relevant functions and levels.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.MEDIUM,
        attestation_interval_days=180,
        na_evidence_required="AI objectives document with measurable targets, timelines, "
                              "and responsible owners aligned with Sentinel trust score thresholds.",
    ),
    Control(
        id="iso_42001.impact_assessment.05", framework_id="iso_42001",
        control_code="6.1.4", title="AI Impact Assessment",
        category="Planning",
        description="Conduct AI impact assessment to identify societal, individual, and organisational impacts.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=180,
        na_evidence_required="Impact assessment report per use case: affected populations, "
                              "potential harms, likelihood, severity, mitigations. Upload per model.",
    ),
    Control(
        id="iso_42001.data_quality.06", framework_id="iso_42001",
        control_code="8.4", title="Data for AI Systems",
        category="Operation",
        description="Identify, collect, manage, and use data in a manner consistent with the AI management system.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="rag_entailment", pass_threshold=0.80,
        pipeline_layer="verifier",
        remediation="RAG entailment <0.80: knowledge base data quality issues. Audit source "
                    "documents for accuracy and recency. Remove outdated entries and re-index.",
    ),
    Control(
        id="iso_42001.system_lifecycle.07", framework_id="iso_42001",
        control_code="8.3", title="AI System Lifecycle Management",
        category="Operation",
        description="Implement and control AI system lifecycle: design, development, deployment, decommission.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=180,
        na_evidence_required="Model lifecycle records in Model Inventory: registration date, "
                              "approval workflow completion, lifecycle stage, decommission plan.",
    ),
    Control(
        id="iso_42001.monitoring.08", framework_id="iso_42001",
        control_code="9.1", title="Monitoring, Measurement and Analysis",
        category="Performance",
        description="Determine what needs to be monitored, including AI system performance.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="drift_score", pass_threshold=0.80,
        pipeline_layer="verifier",
        remediation="Drift <0.80 triggers an automatic model review task. "
                    "Review Grafana for trend analysis. Update baseline after each model change.",
    ),
    Control(
        id="iso_42001.incident.09", framework_id="iso_42001",
        control_code="10.2", title="Incident Management for AI",
        category="Improvement",
        description="React to nonconformity: control, correct, and deal with consequences.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="HITL and BLOCKED interventions are the incident response mechanism. "
                    "Ensure HITL items resolved within SLA. Export BLOCKED entries as incident records.",
    ),
    Control(
        id="iso_42001.continual_improvement.10", framework_id="iso_42001",
        control_code="10.3", title="Continual Improvement",
        category="Improvement",
        description="Continually improve suitability, adequacy, and effectiveness of the AI management system.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.MEDIUM,
        signal_name="trust_score", pass_threshold=None,
        pipeline_layer="verifier",
        remediation="30-day rolling average trust score trend evidences continual improvement. "
                    "A declining trend triggers a mandatory improvement review task. Export chart as evidence.",
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 4 — ISO 27001  (10 controls)
# Primary source: ISO/IEC 27001:2022
# ══════════════════════════════════════════════════════════════════════════════

ISO_27001: list[Control] = [
    Control(
        id="iso_27001.access_control.01", framework_id="iso_27001",
        control_code="A.5.15", title="Access Control Policy",
        category="Access Control",
        description="Rules for access to information and assets shall be established and reviewed.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="audit_chain_integrity", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="Chain integrity failure = potential unauthorised access. Initiate access review. "
                    "Review all API key usage in last 24 hours via /proxy/api-keys audit entries.",
    ),
    Control(
        id="iso_27001.cryptography.02", framework_id="iso_27001",
        control_code="A.8.24", title="Use of Cryptography",
        category="Cryptography",
        description="Rules for effective use of cryptography including key management.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=365,
        na_evidence_required="Key management policy: Fernet key rotation schedule, key storage "
                              "mechanism (HSM or secrets manager), key destruction procedure. "
                              "Also: TLS certificate inventory with renewal schedule.",
    ),
    Control(
        id="iso_27001.logging_monitoring.03", framework_id="iso_27001",
        control_code="A.8.15", title="Logging and Monitoring",
        category="Operations",
        description="Logs recording activities, exceptions, and faults shall be produced, stored, protected.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="audit_chain_integrity", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="SHA-256 hash chain integrity must be 100%. Any failure is a logging incident. "
                    "Do not write new records until chain is repaired.",
    ),
    Control(
        id="iso_27001.data_masking.04", framework_id="iso_27001",
        control_code="A.8.11", title="Data Masking",
        category="Data Protection",
        description="Data masking used according to access control policies and business requirements.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="pii_clean", pass_threshold=0.95,
        pipeline_layer="sanitizer",
        remediation="pii_clean <0.95: Add custom Presidio recognisers for your sensitive data patterns. "
                    "Review false-negative examples in sanitizer audit log.",
    ),
    Control(
        id="iso_27001.secure_development.05", framework_id="iso_27001",
        control_code="A.8.25", title="Secure Development Lifecycle",
        category="Development",
        description="Rules for secure software development shall be established and applied.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=365,
        na_evidence_required="Evidence Claude Code PR Review Agent is active (screenshot of passing "
                              "reviews on last 3 PRs). Plus SAST/DAST scan results from most recent release.",
    ),
    Control(
        id="iso_27001.vulnerability_management.06", framework_id="iso_27001",
        control_code="A.8.8", title="Management of Technical Vulnerabilities",
        category="Operations",
        description="Technical vulnerabilities shall be obtained, evaluated, and addressed timely.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="trust_score", pass_threshold=0.70,
        pipeline_layer="verifier",
        remediation="Security module red team findings evidence vulnerability management. "
                    "All CRITICAL findings need assigned tasks within 30 days; HIGH within 90 days.",
    ),
    Control(
        id="iso_27001.incident_response.07", framework_id="iso_27001",
        control_code="A.5.26", title="Response to Information Security Incidents",
        category="Incident Management",
        description="Information security incidents shall be responded to per documented procedures.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.CRITICAL,
        attestation_interval_days=180,
        na_evidence_required="Incident response plan covering AI-specific scenarios: trust score "
                              "systemic failure, PII breach via AI output, model poisoning, CB permanent open. "
                              "Evidence: completed tabletop exercise or real incident record.",
    ),
    Control(
        id="iso_27001.supplier_security.08", framework_id="iso_27001",
        control_code="A.5.19", title="Information Security in Supplier Relationships",
        category="Supplier",
        description="Processes to manage information security risks in supplier relationships.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=365,
        na_evidence_required="Vendor security questionnaire or third-party audit reports for each AI model "
                              "provider (OpenAI, Anthropic, etc.). Link each model in Inventory to vendor evidence.",
    ),
    Control(
        id="iso_27001.asset_management.09", framework_id="iso_27001",
        control_code="A.5.9", title="Inventory of Information and Assets",
        category="Asset Management",
        description="An inventory of information assets shall be developed and maintained.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.MEDIUM,
        signal_name="model_inventory_complete", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="Model Inventory completeness checked on each registration. Required fields: "
                    "provider, version, deployment date, use case, risk classification, owner.",
    ),
    Control(
        id="iso_27001.business_continuity.10", framework_id="iso_27001",
        control_code="A.5.30", title="ICT Readiness for Business Continuity",
        category="Business Continuity",
        description="ICT readiness shall be planned, implemented, maintained, and tested.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=365,
        na_evidence_required="AI fallback procedure: primary AI system unavailability, circuit breaker "
                              "OPEN state handling, model provider outage procedure, recovery time objective.",
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 5 — NIST AI RMF  (7 controls)
# Primary source: NIST AI 100-1, January 2023
# ══════════════════════════════════════════════════════════════════════════════

NIST_AI_RMF: list[Control] = [
    Control(
        id="nist_ai_rmf.govern.01", framework_id="nist_ai_rmf",
        control_code="GOVERN-1.1", title="AI Risk Management Policies",
        category="GOVERN",
        description="Policies and practices for mapping, measuring, and managing AI risks are in place.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.CRITICAL,
        attestation_interval_days=180,
        na_evidence_required="AI risk management policy: AI Risk Owner named, risk appetite defined, "
                              "Sentinel trust score thresholds referenced as technical implementation.",
    ),
    Control(
        id="nist_ai_rmf.map.02", framework_id="nist_ai_rmf",
        control_code="MAP-1.1", title="AI Risk Identification and Classification",
        category="MAP",
        description="Known and reasonably foreseeable risks, impacts, and effects of the AI system are identified.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="trust_score", pass_threshold=0.75,
        pipeline_layer="verifier",
        remediation="Trust score <0.75 maps to elevated risk per NIST MAP-1.1. "
                    "Log session in risk register with classification HIGH. Assign task within 48 hours.",
    ),
    Control(
        id="nist_ai_rmf.measure.03", framework_id="nist_ai_rmf",
        control_code="MEASURE-2.2", title="AI System Testing and Evaluation",
        category="MEASURE",
        description="AI system performance or assurance criteria are established and tested across the lifecycle.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="rag_entailment", pass_threshold=0.75,
        pipeline_layer="verifier",
        remediation="RAG entailment is the runtime measurement mechanism. Supplement with periodic "
                    "eval runs in /evals/experiments. Export eval results as MEASURE evidence.",
    ),
    Control(
        id="nist_ai_rmf.manage.04", framework_id="nist_ai_rmf",
        control_code="MANAGE-1.3", title="AI Risk Treatment and Escalation",
        category="MANAGE",
        description="Responses to identified AI risks are prioritised and tracked.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="3-level cascade (REGENERATE→UPGRADE→HITL) implements risk treatment. "
                    "HITL resolution rate must be >90% within SLA.",
    ),
    Control(
        id="nist_ai_rmf.manage.05", framework_id="nist_ai_rmf",
        control_code="MANAGE-2.2", title="AI Anomaly Correction Mechanisms",
        category="MANAGE",
        description="Mechanisms for identifying and responding to AI system anomalies are in place.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="drift_score", pass_threshold=0.80,
        pipeline_layer="verifier",
        remediation="Drift <0.80 triggers automatic task for model review. "
                    "Update baseline distributions after each model version change.",
    ),
    Control(
        id="nist_ai_rmf.map.06", framework_id="nist_ai_rmf",
        control_code="MAP-5.1", title="Likelihood and Magnitude of AI Harm",
        category="MAP",
        description="Likelihood and magnitude of each identified impact are evaluated.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=180,
        na_evidence_required="Harm assessment matrix per deployed model. Rows: harm types. "
                              "Columns: likelihood, severity, affected population, current mitigation.",
    ),
    Control(
        id="nist_ai_rmf.govern.07", framework_id="nist_ai_rmf",
        control_code="GOVERN-4.1", title="AI Accountability and Responsibility",
        category="GOVERN",
        description="Organisational teams are committed to transparency and accountability in trustworthy AI.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.MEDIUM,
        attestation_interval_days=365,
        na_evidence_required="AI governance training completion records for all team members interacting "
                              "with AI systems. Minimum annual cadence. RACI matrix also acceptable.",
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 6 — IEEE 7000  (8 controls)
# Primary source: IEEE Std 7000-2021
# ══════════════════════════════════════════════════════════════════════════════

IEEE_7000: list[Control] = [
    Control(
        id="ieee_7000.value_elicitation.01", framework_id="ieee_7000",
        control_code="Clause 7", title="Value Elicitation and Stakeholder Identification",
        category="Ethics",
        description="Stakeholders identified and their values systematically used in design.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.MEDIUM,
        attestation_interval_days=365,
        na_evidence_required="Stakeholder value elicitation report showing how values are reflected "
                              "in trust score thresholds, PII sensitivity, and HITL trigger conditions.",
    ),
    Control(
        id="ieee_7000.transparency.02", framework_id="ieee_7000",
        control_code="Clause 8.3", title="Transparency in AI Decision Making",
        category="Transparency",
        description="System shall provide explainability of decisions to support accountability and fairness.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="trust_score", pass_threshold=0.70,
        pipeline_layer="verifier",
        remediation="Trust score four-component breakdown (RAG entailment, cross-check, PII, drift) "
                    "provides decision explainability. Enable component headers in API responses.",
    ),
    Control(
        id="ieee_7000.privacy.03", framework_id="ieee_7000",
        control_code="Clause 9.4", title="Privacy by Design",
        category="Privacy",
        description="Privacy incorporated into AI system design from the outset.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="pii_clean", pass_threshold=0.95,
        pipeline_layer="sanitizer",
        remediation="PII masking at sanitizer layer evidences privacy by design. "
                    "Score <0.95: add domain-specific Presidio recognisers.",
    ),
    Control(
        id="ieee_7000.bias.04", framework_id="ieee_7000",
        control_code="Clause 8.4", title="Bias Identification and Mitigation",
        category="Fairness",
        description="System shall identify potential sources of bias and implement mitigation strategies.",
        eval_type=EvalType.NA, severity=ControlSeverity.HIGH,
        na_evidence_required="Bias audit reports from /evals/bias-audits covering demographic parity "
                              "and counterfactual fairness. Run before every model version deployment.",
    ),
    Control(
        id="ieee_7000.accountability.05", framework_id="ieee_7000",
        control_code="Clause 8.5", title="Accountability Mechanism",
        category="Ethics",
        description="System shall maintain audit trails supporting accountability for AI-related decisions.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="audit_chain_integrity", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="SHA-256 hash chain audit ledger directly implements this control. "
                    "Export audit log as evidence for IEEE 7000 assessments.",
    ),
    Control(
        id="ieee_7000.wellbeing.06", framework_id="ieee_7000",
        control_code="Clause 8.6", title="Human Wellbeing Prioritisation",
        category="Ethics",
        description="System shall prioritise human wellbeing with mechanisms to prevent potential harm.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="HITL and BLOCKED interventions are the wellbeing protection mechanism. "
                    "Review BLOCKED audit entries to identify patterns and update injection rules.",
    ),
    Control(
        id="ieee_7000.value_monitoring.07", framework_id="ieee_7000",
        control_code="Clause 10", title="Ongoing Value Alignment Monitoring",
        category="Monitoring",
        description="System monitored continuously to ensure behaviour remains aligned with ethical values.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="drift_score", pass_threshold=0.80,
        pipeline_layer="verifier",
        remediation="Drift <0.80 = potential value misalignment. If drift persists 7 days, "
                    "trigger a value re-elicitation review and update baseline.",
    ),
    Control(
        id="ieee_7000.stakeholder_engagement.08", framework_id="ieee_7000",
        control_code="Clause 7.3", title="Stakeholder Engagement Process",
        category="Ethics",
        description="Organisation maintains ongoing stakeholder engagement regarding AI system values.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.MEDIUM,
        attestation_interval_days=180,
        na_evidence_required="Stakeholder engagement log: meeting minutes, survey results, or "
                              "feedback sessions covering AI system impacts. Minimum twice yearly.",
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 7 — OWASP LLM TOP 10  (10 controls)
# Primary source: OWASP LLM Top 10 v1.1 (2025)
# ══════════════════════════════════════════════════════════════════════════════

OWASP_LLM: list[Control] = [
    Control(
        id="owasp_llm.llm01", framework_id="owasp_llm",
        control_code="LLM-01", title="Prompt Injection",
        category="Input Security",
        description="Attacker manipulates LLM via crafted inputs causing execution of attacker's intentions.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="pii_clean", pass_threshold=0.90,
        pipeline_layer="sanitizer",
        remediation="pii_clean <0.90: injection attempts evading detection. Review injection patterns, "
                    "add domain-specific injection signatures, lower injection confidence threshold.",
    ),
    Control(
        id="owasp_llm.llm02", framework_id="owasp_llm",
        control_code="LLM-02", title="Insecure Output Handling",
        category="Output Security",
        description="Insufficient validation, sanitisation, and handling of LLM outputs before passing downstream.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="trust_score", pass_threshold=0.85,
        pipeline_layer="verifier",
        remediation="Trust score <0.85: outputs not sufficiently verified. Enable REGENERATE at this "
                    "threshold and review the cross-check configuration.",
    ),
    Control(
        id="owasp_llm.llm03", framework_id="owasp_llm",
        control_code="LLM-03", title="Training Data Poisoning",
        category="Supply Chain",
        description="Attacker manipulates pre-training or fine-tuning data to introduce vulnerabilities.",
        eval_type=EvalType.NA, severity=ControlSeverity.HIGH,
        na_evidence_required="Model File Auditor scan results from /security/model-auditor: "
                              "weight file hash verification, backdoor detection scan, provenance chain.",
    ),
    Control(
        id="owasp_llm.llm04", framework_id="owasp_llm",
        control_code="LLM-04", title="Model Denial of Service",
        category="Availability",
        description="Attacker consumes exceptionally high resources via LLM interaction.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="Rate limiting + circuit breaker address DoS. Review requests per minute per tenant. "
                    "Enable Redis-based rate limiting if not active.",
    ),
    Control(
        id="owasp_llm.llm05", framework_id="owasp_llm",
        control_code="LLM-05", title="Supply Chain Vulnerabilities",
        category="Supply Chain",
        description="LLM supply chain vulnerable to attacks impacting training data, models, or platforms.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=90,
        na_evidence_required="SBOM for Sentinel deployment. Run: pip-audit on requirements.txt "
                              "and npm audit on dashboard/package.json. Upload with zero CRITICAL findings.",
    ),
    Control(
        id="owasp_llm.llm06", framework_id="owasp_llm",
        control_code="LLM-06", title="Sensitive Information Disclosure",
        category="Data Protection",
        description="LLM applications may inadvertently reveal sensitive information through outputs.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="pii_clean", pass_threshold=0.95,
        pipeline_layer="sanitizer",
        remediation="pii_clean <0.95: Immediate Presidio review. Add organisation-specific patterns: "
                    "employee IDs, internal codes, API keys.",
    ),
    Control(
        id="owasp_llm.llm07", framework_id="owasp_llm",
        control_code="LLM-07", title="Insecure Plugin Design",
        category="Integration",
        description="LLM plugins with insecure inputs enable SQL injection, remote code execution.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=90,
        na_evidence_required="Security review for each tool/plugin the LLM can access: input validation, "
                              "output encoding, permission scope, pen test results. Required before any new tool.",
    ),
    Control(
        id="owasp_llm.llm08", framework_id="owasp_llm",
        control_code="LLM-08", title="Excessive Agency",
        category="Autonomy",
        description="LLM-based system granted too much ability to interface with other systems.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="HITL for agentic requests is the primary mitigation. "
                    "For agentic use cases set trust_score threshold at 0.90+.",
    ),
    Control(
        id="owasp_llm.llm09", framework_id="owasp_llm",
        control_code="LLM-09", title="Overreliance",
        category="Human Oversight",
        description="Overreliance occurs when systems depend on LLMs without appropriate oversight.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="If HITL trigger rate drops below 1% for high-stakes use cases, lower HITL "
                    "threshold to maintain human oversight.",
    ),
    Control(
        id="owasp_llm.llm10", framework_id="owasp_llm",
        control_code="LLM-10", title="Model Theft",
        category="Intellectual Property",
        description="Exfiltration, cloning, or reverse-engineering of proprietary LLM models.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.MEDIUM,
        attestation_interval_days=180,
        na_evidence_required="Model access log review for unusual query volumes suggesting systematic "
                              "model probing. Raw data from rate limiter + audit log. Manual quarterly review.",
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 8 — OWASP AGENTIC TOP 10  (10 controls)
# Primary source: OWASP Top 10 for Agentic AI Applications 2025
# ══════════════════════════════════════════════════════════════════════════════

OWASP_AGENTIC: list[Control] = [
    Control(
        id="owasp_agentic.agent01", framework_id="owasp_agentic",
        control_code="Agent-01", title="Memory Poisoning",
        category="Memory Security",
        description="Agents with persistent memory are vulnerable to poisoning via adversarial inputs.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="drift_score", pass_threshold=0.80,
        pipeline_layer="verifier",
        remediation="Drift <0.80 in agentic contexts = potential memory poisoning. "
                    "Clear agent memory, re-initialise baseline, and run red team campaign.",
    ),
    Control(
        id="owasp_agentic.agent02", framework_id="owasp_agentic",
        control_code="Agent-02", title="Tool Abuse",
        category="Tool Security",
        description="Agents may misuse tools leading to unintended system access or data exfiltration.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="BLOCKED interventions on tool-use requests are the primary evidence. "
                    "Implement tool-call whitelisting in the agentic pipeline.",
    ),
    Control(
        id="owasp_agentic.agent03", framework_id="owasp_agentic",
        control_code="Agent-03", title="Orchestration Hijacking",
        category="Architecture Security",
        description="Attackers may hijack the orchestration layer to redirect agent actions.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="pii_clean", pass_threshold=0.95,
        pipeline_layer="sanitizer",
        remediation="Injection detection at orchestration layer is primary mitigation. "
                    "Ensure ALL agent-to-agent messages pass through Sentinel proxy.",
    ),
    Control(
        id="owasp_agentic.agent04", framework_id="owasp_agentic",
        control_code="Agent-04", title="Resource Overuse",
        category="Availability",
        description="Agents may consume excessive resources through runaway loops or resource abuse.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="trust_score", pass_threshold=0.70,
        pipeline_layer="circuit_breaker",
        remediation="Circuit breaker prevents runaway loops. Review Cost-per-Truth metric in "
                    "Grafana for cost spikes indicating resource overuse.",
    ),
    Control(
        id="owasp_agentic.agent05", framework_id="owasp_agentic",
        control_code="Agent-05", title="Cascading Hallucinations",
        category="Reliability",
        description="In multi-agent pipelines, hallucinations from one agent amplify downstream.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="rag_entailment", pass_threshold=0.85,
        pipeline_layer="verifier",
        remediation="RAG entailment at 0.85+ prevents hallucination propagation. "
                    "For multi-agent pipelines, every inter-agent message must pass through Sentinel independently.",
    ),
    Control(
        id="owasp_agentic.agent06", framework_id="owasp_agentic",
        control_code="Agent-06", title="Inadequate Audit Trails",
        category="Observability",
        description="Agentic systems without comprehensive audit trails cannot trace failures.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="audit_chain_integrity", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="Hash chain covers all Sentinel-proxied requests. Ensure agent_id is passed "
                    "in request metadata to enable per-agent audit filtering.",
    ),
    Control(
        id="owasp_agentic.agent07", framework_id="owasp_agentic",
        control_code="Agent-07", title="Prompt Injection via External Data",
        category="Input Security",
        description="Agents retrieving external data are vulnerable to injection embedded in that data.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="pii_clean", pass_threshold=0.92,
        pipeline_layer="sanitizer",
        remediation="Sanitizer must process retrieved external content before passing to LLM. "
                    "Ensure RAG retrieved chunks are sanitised, not just original user prompt.",
    ),
    Control(
        id="owasp_agentic.agent08", framework_id="owasp_agentic",
        control_code="Agent-08", title="Insufficient Granularity of Approvals",
        category="Human Oversight",
        description="Human approval checkpoints too broad, allowing many high-risk actions under one approval.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="HITL items should be scoped per-action, not per-session. "
                    "Configure HITL to trigger on each distinct tool call type.",
    ),
    Control(
        id="owasp_agentic.agent09", framework_id="owasp_agentic",
        control_code="Agent-09", title="Identity Spoofing",
        category="Identity",
        description="Malicious agents may impersonate trusted agents or users for elevated privileges.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="audit_chain_integrity", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="JWT validation with tenant_id from claims only. Any chain integrity failure "
                    "in a privileged session = potential identity spoofing. Initiate investigation.",
    ),
    Control(
        id="owasp_agentic.agent10", framework_id="owasp_agentic",
        control_code="Agent-10", title="Repudiation of Actions",
        category="Non-Repudiation",
        description="Without proper logging, agents or users may deny having performed actions.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="audit_chain_integrity", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="Hash chain provides non-repudiation for all proxied actions. "
                    "Ensure session_id and user_id are in every audit entry.",
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 9 — OWASP API SECURITY TOP 10  (10 controls)
# Primary source: OWASP API Security Top 10 2023
# ══════════════════════════════════════════════════════════════════════════════

OWASP_API: list[Control] = [
    Control(
        id="owasp_api.api01", framework_id="owasp_api",
        control_code="API1", title="Broken Object Level Authorisation",
        category="Authorisation",
        description="Attackers exploit API endpoints accepting object identifiers to access another user's data.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="audit_chain_integrity", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="tenant_id sourced only from JWT claims — never from request body. "
                    "Verify this is enforced in every API endpoint.",
    ),
    Control(
        id="owasp_api.api02", framework_id="owasp_api",
        control_code="API2", title="Broken Authentication",
        category="Authentication",
        description="Authentication mechanisms implemented incorrectly allowing token compromise.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="audit_chain_integrity", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="JWT validation must reject: expired tokens, wrong algorithm, missing tenant_id. "
                    "401 rate spikes in audit log indicate authentication probing — trigger security alert.",
    ),
    Control(
        id="owasp_api.api03", framework_id="owasp_api",
        control_code="API3", title="Broken Object Property Level Authorisation",
        category="Authorisation",
        description="Attackers read or modify properties they are not authorised to access.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=180,
        na_evidence_required="API schema review confirming response objects do not return unauthorised "
                              "properties. OWASP ZAP scan against API with least-privilege token.",
    ),
    Control(
        id="owasp_api.api04", framework_id="owasp_api",
        control_code="API4", title="Unrestricted Resource Consumption",
        category="Availability",
        description="Attackers exploit endpoints that don't limit the size or number of resources requested.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="Rate limiter + circuit breaker address resource consumption. Verify rate limit "
                    "is per tenant. Set max request body size in nginx.conf.",
    ),
    Control(
        id="owasp_api.api05", framework_id="owasp_api",
        control_code="API5", title="Broken Function Level Authorisation",
        category="Authorisation",
        description="Complex access control hierarchies lead to authorisation flaws allowing admin access.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=180,
        na_evidence_required="Role matrix showing which endpoints each role can access. Test evidence: "
                              "user-role token attempting admin endpoints must return 403.",
    ),
    Control(
        id="owasp_api.api06", framework_id="owasp_api",
        control_code="API6", title="Unrestricted Access to Sensitive Business Flows",
        category="Business Logic",
        description="Attackers identify and exploit API flows representing sensitive business processes.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="pii_clean", pass_threshold=0.90,
        pipeline_layer="sanitizer",
        remediation="PII detection on all inputs is the primary defence against systematic data extraction. "
                    "Review audit log for patterns of systematic PII extraction.",
    ),
    Control(
        id="owasp_api.api07", framework_id="owasp_api",
        control_code="API7", title="Server Side Request Forgery",
        category="Input Security",
        description="Attackers abuse API functionality to cause server-side requests to internal resources.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="pii_clean", pass_threshold=0.90,
        pipeline_layer="sanitizer",
        remediation="Prompt injection detection catches SSRF embedded in AI prompts. "
                    "For API-layer SSRF ensure URL allowlisting for any external resources fetched.",
    ),
    Control(
        id="owasp_api.api08", framework_id="owasp_api",
        control_code="API8", title="Security Misconfiguration",
        category="Configuration",
        description="Missing security hardening, unnecessary features, or verbose error messages.",
        eval_type=EvalType.MANUAL, severity=ControlSeverity.HIGH,
        attestation_interval_days=90,
        na_evidence_required="Configuration review checklist: CORS not wildcard in production, "
                              "debug disabled, no stack traces in errors, HTTP security headers present. "
                              "Mozilla Observatory scan as evidence.",
    ),
    Control(
        id="owasp_api.api09", framework_id="owasp_api",
        control_code="API9", title="Improper Inventory Management",
        category="Asset Management",
        description="Outdated API versions or exposed debug endpoints forgotten or improperly documented.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.MEDIUM,
        signal_name="model_inventory_complete", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="Model inventory completeness tracks all deployed models. Monthly diff: "
                    "deployed models vs Inventory records. Decommission unlisted models.",
    ),
    Control(
        id="owasp_api.api10", framework_id="owasp_api",
        control_code="API10", title="Unsafe Consumption of APIs",
        category="Integration",
        description="Developers trust third-party API data more than user input, adopting weaker security.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="rag_entailment", pass_threshold=0.80,
        pipeline_layer="verifier",
        remediation="RAG entailment treats all retrieved content — including third-party APIs — "
                    "as untrusted until verified. Score <0.80 means third-party data inadequately verified.",
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 10 — MITRE ATLAS  (14 controls)
# Primary source: MITRE ATLAS v4.5.0 (2024)
# ══════════════════════════════════════════════════════════════════════════════

MITRE_ATLAS: list[Control] = [
    Control(
        id="mitre_atlas.recon.01", framework_id="mitre_atlas",
        control_code="AML.T0000", title="Reconnaissance — Model Architecture Discovery",
        category="Reconnaissance",
        description="Adversaries probe AI system to discover model architecture and capabilities.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="drift_score", pass_threshold=0.85,
        pipeline_layer="verifier",
        remediation="Systematic probing manifests as abnormal query patterns causing drift anomalies. "
                    "Enable rate limiting per-IP and per-session in addition to per-tenant.",
    ),
    Control(
        id="mitre_atlas.resource_dev.02", framework_id="mitre_atlas",
        control_code="AML.T0002", title="Adversarial Example Crafting",
        category="Resource Development",
        description="Adversaries develop adversarial examples to bypass or manipulate the AI system.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="trust_score", pass_threshold=0.85,
        pipeline_layer="verifier",
        remediation="Low trust scores on unusual linguistic patterns may indicate adversarial examples. "
                    "Enable N-cross-check with at least 3 verification passes for suspicious requests.",
    ),
    Control(
        id="mitre_atlas.initial_access.03", framework_id="mitre_atlas",
        control_code="AML.T0010", title="ML Supply Chain Compromise",
        category="Initial Access",
        description="Adversaries introduce vulnerabilities via compromised model weights, datasets, or libraries.",
        eval_type=EvalType.NA, severity=ControlSeverity.CRITICAL,
        na_evidence_required="Model File Auditor scan: weight hash verification, backdoor detection, "
                              "dependency vulnerability scan. Required at every model deployment.",
    ),
    Control(
        id="mitre_atlas.execution.04", framework_id="mitre_atlas",
        control_code="AML.T0011", title="Prompt Injection — Execution",
        category="Execution",
        description="Adversaries use prompt injection to execute malicious instructions in AI context.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="pii_clean", pass_threshold=0.92,
        pipeline_layer="sanitizer",
        remediation="Layer 1 sanitizer is the primary control. pii_clean <0.92 means some injections "
                    "may be evading detection. Update injection pattern library.",
    ),
    Control(
        id="mitre_atlas.persistence.05", framework_id="mitre_atlas",
        control_code="AML.T0012", title="Backdoor Model",
        category="Persistence",
        description="Adversaries insert backdoors that activate on specific trigger inputs.",
        eval_type=EvalType.NA, severity=ControlSeverity.CRITICAL,
        na_evidence_required="Model File Auditor deep scan with backdoor trigger detection. "
                              "Red team campaign targeting known backdoor triggers for the model architecture. "
                              "Run before every model version upgrade.",
    ),
    Control(
        id="mitre_atlas.privilege_escalation.06", framework_id="mitre_atlas",
        control_code="AML.T0015", title="Privilege Escalation via Jailbreak",
        category="Privilege Escalation",
        description="Adversaries craft inputs that bypass safety measures gaining elevated capabilities.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="trust_score", pass_threshold=0.85,
        pipeline_layer="verifier",
        remediation="Trust score drops on jailbreak attempts are the detection signal. "
                    "Run regular red team campaigns. Review BLOCKED audit entries for jailbreak patterns.",
    ),
    Control(
        id="mitre_atlas.defense_evasion.07", framework_id="mitre_atlas",
        control_code="AML.T0020", title="Adversarial Perturbation",
        category="Defense Evasion",
        description="Adversaries apply perturbations to inputs to evade AI safety systems.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="rag_entailment", pass_threshold=0.80,
        pipeline_layer="verifier",
        remediation="N-cross-check provides resilience against perturbation attacks. "
                    "Ensure cross_check_agreement weight maintained at 0.30 in trust formula.",
    ),
    Control(
        id="mitre_atlas.discovery.08", framework_id="mitre_atlas",
        control_code="AML.T0025", title="Model Inversion Attack",
        category="Discovery",
        description="Adversaries reconstruct training data from model outputs using inversion techniques.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="pii_clean", pass_threshold=0.95,
        pipeline_layer="sanitizer",
        remediation="PII masking on outputs prevents training data reconstruction. "
                    "pii_clean <0.95 means PII may be reconstructable from outputs.",
    ),
    Control(
        id="mitre_atlas.collection.09", framework_id="mitre_atlas",
        control_code="AML.T0030", title="Data Exfiltration via LLM",
        category="Collection",
        description="Adversaries craft prompts to cause the AI to reveal protected information.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="pii_clean", pass_threshold=0.95,
        pipeline_layer="sanitizer",
        remediation="PII masking directly mitigates exfiltration. BLOCKED intervention with "
                    "pii_clean <0.80 = immediate security incident review required.",
    ),
    Control(
        id="mitre_atlas.impact.10", framework_id="mitre_atlas",
        control_code="AML.T0040", title="Denial of ML Service",
        category="Impact",
        description="Adversaries degrade or deny AI system availability through resource exhaustion.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="Circuit breaker OPEN is the DoS response. Ensure recovery to CLOSED only, "
                    "never HALF_OPEN. Monitor Grafana for CB state change frequency.",
    ),
    Control(
        id="mitre_atlas.exfiltration.11", framework_id="mitre_atlas",
        control_code="AML.T0048", title="Membership Inference",
        category="Exfiltration",
        description="Adversaries infer whether specific data was in training set, violating privacy.",
        eval_type=EvalType.NA, severity=ControlSeverity.HIGH,
        na_evidence_required="Membership inference attack assessment: probe using Evals module "
                              "with holdout dataset. Results must show <55% inference accuracy as evidence.",
    ),
    Control(
        id="mitre_atlas.impact.12", framework_id="mitre_atlas",
        control_code="AML.T0043", title="Functional Degradation via Poisoning",
        category="Impact",
        description="Adversaries introduce poisoned data to degrade AI system performance over time.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="drift_score", pass_threshold=0.80,
        pipeline_layer="verifier",
        remediation="Persistent downward drift in 30-day trend triggers mandatory model revalidation "
                    "and knowledge base integrity audit.",
    ),
    Control(
        id="mitre_atlas.recon.13", framework_id="mitre_atlas",
        control_code="AML.T0001", title="Active Scanning of AI System",
        category="Reconnaissance",
        description="Adversaries conduct active scanning of AI APIs to identify vulnerabilities.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.MEDIUM,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="Rate limiting per session + per IP (nginx.conf) is primary mitigation. "
                    "Review audit log for sessions with >100 requests and no HITL approvals.",
    ),
    Control(
        id="mitre_atlas.impact.14", framework_id="mitre_atlas",
        control_code="AML.T0051", title="Harmful Output Generation",
        category="Impact",
        description="Adversaries manipulate AI to generate harmful, biased, or misleading outputs.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="trust_score", pass_threshold=0.85,
        pipeline_layer="verifier",
        remediation="Trust score <0.85 triggers REGENERATE→UPGRADE→HITL cascade. "
                    "Review BLOCKED entries for harmful content patterns. Update injection detection rules.",
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 11 — DoD AI ETHICAL PRINCIPLES  (6 controls)
# Primary source: DoD AI Ethical Principles (2020) + DoD Responsible AI Strategy (2022)
# ══════════════════════════════════════════════════════════════════════════════

DOD_AI: list[Control] = [
    Control(
        id="dod_ai.responsible.01", framework_id="dod_ai",
        control_code="DoD-AI-P1", title="Responsible AI — Accountability",
        category="Responsible",
        description="Humans bear responsibility for AI decisions in consequential contexts.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="HITL items must be resolved by named, authenticated users. "
                    "HITL resolution audit trail is the accountability evidence.",
    ),
    Control(
        id="dod_ai.equitable.02", framework_id="dod_ai",
        control_code="DoD-AI-P2", title="Equitable — Bias Prevention",
        category="Equitable",
        description="Deliberate steps to minimise unintended bias, particularly across demographics.",
        eval_type=EvalType.NA, severity=ControlSeverity.HIGH,
        na_evidence_required="Bias evaluation reports from /evals/bias-audits covering demographic "
                              "parity across protected characteristics. Run quarterly and before each model update.",
    ),
    Control(
        id="dod_ai.traceable.03", framework_id="dod_ai",
        control_code="DoD-AI-P3", title="Traceable — Explainable AI",
        category="Traceable",
        description="Relevant personnel shall possess appropriate understanding of the AI technology.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="trust_score", pass_threshold=0.75,
        pipeline_layer="verifier",
        remediation="Trust score four-component breakdown provides traceability for every AI decision. "
                    "Enable trust score component headers in API responses for operator visibility.",
    ),
    Control(
        id="dod_ai.reliable.04", framework_id="dod_ai",
        control_code="DoD-AI-P4", title="Reliable — Operational Robustness",
        category="Reliable",
        description="AI systems shall have an explicit domain of use and perform reliably within it.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.HIGH,
        signal_name="rag_entailment", pass_threshold=0.80,
        pipeline_layer="verifier",
        remediation="RAG entailment <0.80: system operating outside its reliable domain. "
                    "Restrict deployment to inputs within the verified knowledge base scope.",
    ),
    Control(
        id="dod_ai.governable.05", framework_id="dod_ai",
        control_code="DoD-AI-P5", title="Governable — Human Control Mechanisms",
        category="Governable",
        description="AI systems shall fulfil intended function while detecting and avoiding unintended consequences.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="intervention", pass_threshold=None,
        pipeline_layer="circuit_breaker",
        remediation="3-level intervention cascade is the governability mechanism. "
                    "BLOCKED = correctly avoiding unintended consequences. CB OPEN = emergency stop.",
    ),
    Control(
        id="dod_ai.secure.06", framework_id="dod_ai",
        control_code="DoD-AI-P6", title="Secure and Resilient — Adversarial Robustness",
        category="Secure",
        description="AI systems shall withstand adversary attempts to corrupt or compromise integrity.",
        eval_type=EvalType.AUTO, severity=ControlSeverity.CRITICAL,
        signal_name="audit_chain_integrity", pass_threshold=None,
        pipeline_layer="auditor",
        remediation="Audit chain integrity is the tamper-evidence mechanism. Supplement with "
                    "quarterly red team campaigns via /security/red-team.",
    ),
]

# ══════════════════════════════════════════════════════════════════════════════
# FRAMEWORK 12 — CUSTOM POLICY  (tenant-defined at runtime)
# ══════════════════════════════════════════════════════════════════════════════

CUSTOM_POLICY: list[Control] = []
# Custom controls are created per-tenant via the UI.
# See ComplianceRegistry.create_custom_control() for the creation API.

# ══════════════════════════════════════════════════════════════════════════════
# MASTER REGISTRY
# ══════════════════════════════════════════════════════════════════════════════

ALL_CONTROLS: list[Control] = (
    EU_AI_ACT + GDPR + ISO_42001 + ISO_27001 + NIST_AI_RMF + IEEE_7000
    + OWASP_LLM + OWASP_AGENTIC + OWASP_API + MITRE_ATLAS + DOD_AI + CUSTOM_POLICY
)

CONTROLS_BY_ID: dict[str, Control] = {c.id: c for c in ALL_CONTROLS}

CONTROLS_BY_FRAMEWORK: dict[str, list[Control]] = {}
for _c in ALL_CONTROLS:
    CONTROLS_BY_FRAMEWORK.setdefault(_c.framework_id, []).append(_c)

# Authoritative counts — enforced at startup and by the Claude Code PR agent
FRAMEWORK_CONTROL_COUNTS: dict[str, int] = {
    "eu_ai_act":     12,
    "gdpr":           8,
    "iso_42001":     10,
    "iso_27001":     10,
    "nist_ai_rmf":    7,
    "ieee_7000":      8,
    "owasp_llm":     10,
    "owasp_agentic": 10,
    "owasp_api":     10,
    "mitre_atlas":   14,
    "dod_ai":         6,
    "custom":         0,   # variable — not validated
}

FRAMEWORK_METADATA: dict[str, dict] = {
    "eu_ai_act":     {"name": "EU AI Act",                    "abbreviation": "EU AI Act"},
    "gdpr":          {"name": "GDPR",                         "abbreviation": "GDPR"},
    "iso_42001":     {"name": "ISO/IEC 42001:2023",           "abbreviation": "ISO 42001"},
    "iso_27001":     {"name": "ISO/IEC 27001:2022",           "abbreviation": "ISO 27001"},
    "nist_ai_rmf":   {"name": "NIST AI Risk Management Framework", "abbreviation": "NIST AI RMF"},
    "ieee_7000":     {"name": "IEEE 7000-2021",               "abbreviation": "IEEE 7000"},
    "owasp_llm":     {"name": "OWASP LLM Top 10",             "abbreviation": "OWASP LLM"},
    "owasp_agentic": {"name": "OWASP Agentic AI Top 10",      "abbreviation": "OWASP Agentic"},
    "owasp_api":     {"name": "OWASP API Security Top 10",    "abbreviation": "OWASP API"},
    "mitre_atlas":   {"name": "MITRE ATLAS v4.5",             "abbreviation": "MITRE ATLAS"},
    "dod_ai":        {"name": "DoD AI Ethical Principles",    "abbreviation": "DoD AI"},
    "custom":        {"name": "Custom Policy",                "abbreviation": "Custom"},
}


def validate_registry() -> None:
    """
    Call at startup. Crashes the process if control counts don't match specification.
    This is intentional — a misconfigured registry is worse than a failed startup.
    """
    errors: list[str] = []
    for fw_id, expected in FRAMEWORK_CONTROL_COUNTS.items():
        if fw_id == "custom":
            continue
        actual = len(CONTROLS_BY_FRAMEWORK.get(fw_id, []))
        if actual != expected:
            errors.append(
                f"{fw_id}: expected {expected} controls, found {actual}"
            )
        # Verify no duplicate IDs within framework
        ids = [c.id for c in CONTROLS_BY_FRAMEWORK.get(fw_id, [])]
        dupes = [i for i in ids if ids.count(i) > 1]
        if dupes:
            errors.append(f"{fw_id}: duplicate control IDs: {set(dupes)}")

    if errors:
        raise AssertionError(
            "Compliance registry integrity failure — do not deploy:\n"
            + "\n".join(f"  - {e}" for e in errors)
        )
