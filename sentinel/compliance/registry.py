"""Built-in compliance framework definitions.

Seven frameworks ship out of the box:
  - EU AI Act
  - ISO 42001
  - NIST AI RMF
  - SOC 2 + AI
  - HIPAA + AI
  - GDPR + AI
  - OWASP LLM Top 10
"""
from __future__ import annotations

from typing import Dict, Optional

from sentinel.compliance.models import (
    ComplianceFramework,
    ControlCategory,
    ControlDefinition,
    SignalSource,
)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _ctrl(
    control_id: str,
    title: str,
    description: str,
    category: ControlCategory,
    signal_source: SignalSource | None = None,
    pass_threshold: float | None = None,
    fail_threshold: float | None = None,
    evidence_template: str = "{signal_source}: {value}",
    remediation: str = "Review and remediate.",
) -> ControlDefinition:
    """Shorthand factory for ControlDefinition."""
    return ControlDefinition(
        control_id=control_id,
        title=title,
        description=description,
        category=category,
        signal_source=signal_source,
        pass_threshold=pass_threshold,
        fail_threshold=fail_threshold,
        evidence_template=evidence_template,
        remediation=remediation,
    )


# ---------------------------------------------------------------------------
# EU AI Act
# ---------------------------------------------------------------------------

_EU_AI_ACT = ComplianceFramework(
    framework_id="eu_ai_act",
    name="EU AI Act",
    version="2024-final",
    description="European Union Artificial Intelligence Act compliance controls.",
    controls=[
        _ctrl(
            "EU-AI-01", "Prompt Injection Detection",
            "High-risk AI systems must resist adversarial manipulation.",
            ControlCategory.TECHNICAL,
            SignalSource.INJECTION_SCORE, 0.85, 0.40,
            "Injection score: {value}",
            "Strengthen input sanitisation and add adversarial testing.",
        ),
        _ctrl(
            "EU-AI-02", "PII Leakage Prevention",
            "Prevent personal data exposure in AI outputs.",
            ControlCategory.TECHNICAL,
            SignalSource.PII_DETECTED, 0.95, 0.50,
            "PII detection: {value}",
            "Enable PII redaction layer and review data flows.",
        ),
        _ctrl(
            "EU-AI-03", "Output Trustworthiness",
            "AI outputs must be accurate and reliable.",
            ControlCategory.TECHNICAL,
            SignalSource.TRUST_SCORE, 0.80, 0.40,
            "Trust score: {value}",
            "Improve grounding with golden source data.",
        ),
        _ctrl(
            "EU-AI-04", "RAG Faithfulness",
            "Retrieval-augmented generation must faithfully represent sources.",
            ControlCategory.TECHNICAL,
            SignalSource.RAG_ENTAILMENT, 0.80, 0.35,
            "RAG entailment: {value}",
            "Review retrieval pipeline and chunk relevance.",
        ),
        _ctrl(
            "EU-AI-05", "Cross-Check Agreement",
            "Multi-model verification for critical outputs.",
            ControlCategory.TECHNICAL,
            SignalSource.CROSS_CHECK, 0.75, 0.30,
            "Cross-check: {value}",
            "Add secondary model verification.",
        ),
        _ctrl(
            "EU-AI-06", "Toxicity Filtering",
            "AI must not produce harmful or toxic content.",
            ControlCategory.TECHNICAL,
            SignalSource.TOXICITY_SCORE, 0.90, 0.50,
            "Toxicity score: {value}",
            "Strengthen content safety filters.",
        ),
        _ctrl(
            "EU-AI-07", "Human Oversight",
            "High-risk systems require human-in-the-loop review.",
            ControlCategory.ORGANISATIONAL,
            SignalSource.HITL_TRIGGERED,
            evidence_template="HITL triggered: {value}",
            remediation="Establish HITL review queue for flagged outputs.",
        ),
        _ctrl(
            "EU-AI-08", "Audit Trail",
            "Maintain complete audit logs for all AI decisions.",
            ControlCategory.ORGANISATIONAL,
            SignalSource.AUDIT_LOG,
            evidence_template="Audit log: {value}",
            remediation="Enable comprehensive audit logging.",
        ),
        _ctrl(
            "EU-AI-09", "Risk Documentation",
            "Document risk assessments and mitigation strategies.",
            ControlCategory.DOCUMENTATION,
            evidence_template="Documentation: {value}",
            remediation="Complete risk assessment documentation.",
        ),
    ],
)


# ---------------------------------------------------------------------------
# ISO 42001
# ---------------------------------------------------------------------------

_ISO_42001 = ComplianceFramework(
    framework_id="iso_42001",
    name="ISO 42001",
    version="2023",
    description="AI Management System standard controls.",
    controls=[
        _ctrl(
            "ISO-01", "AI Risk Assessment",
            "Systematic identification and assessment of AI risks.",
            ControlCategory.ORGANISATIONAL,
            SignalSource.TRUST_SCORE, 0.80, 0.40,
            "Risk score: {value}",
            "Conduct comprehensive AI risk assessment.",
        ),
        _ctrl(
            "ISO-02", "Input Validation",
            "Validate and sanitise all inputs to AI systems.",
            ControlCategory.TECHNICAL,
            SignalSource.INJECTION_SCORE, 0.85, 0.40,
            "Injection score: {value}",
            "Implement input validation pipeline.",
        ),
        _ctrl(
            "ISO-03", "Data Quality",
            "Ensure training and retrieval data quality.",
            ControlCategory.TECHNICAL,
            SignalSource.GOLDEN_SOURCE_EMPTY, 0.90, 0.50,
            "Golden source: {value}",
            "Seed and validate golden source data.",
        ),
        _ctrl(
            "ISO-04", "Performance Monitoring",
            "Continuous monitoring of AI system performance.",
            ControlCategory.TECHNICAL,
            SignalSource.SEMANTIC_DRIFT, 0.85, 0.40,
            "Semantic drift: {value}",
            "Set up drift detection and alerting.",
        ),
        _ctrl(
            "ISO-05", "Incident Management",
            "Process for handling AI incidents and failures.",
            ControlCategory.ORGANISATIONAL,
            SignalSource.CIRCUIT_BREAKER,
            evidence_template="Circuit breaker: {value}",
            remediation="Establish incident response procedures.",
        ),
        _ctrl(
            "ISO-06", "Documentation",
            "Maintain AI system documentation.",
            ControlCategory.DOCUMENTATION,
            evidence_template="Documentation: {value}",
            remediation="Complete AIMS documentation suite.",
        ),
    ],
)


# ---------------------------------------------------------------------------
# NIST AI RMF
# ---------------------------------------------------------------------------

_NIST_AI_RMF = ComplianceFramework(
    framework_id="nist_ai_rmf",
    name="NIST AI RMF",
    version="1.0",
    description="NIST AI Risk Management Framework controls.",
    controls=[
        _ctrl(
            "NIST-GOV-01", "AI Governance",
            "Establish governance structures for AI risk management.",
            ControlCategory.ORGANISATIONAL,
            evidence_template="Governance: {value}",
            remediation="Define AI governance policies and roles.",
        ),
        _ctrl(
            "NIST-MAP-01", "Risk Mapping",
            "Map and categorise AI system risks.",
            ControlCategory.ORGANISATIONAL,
            SignalSource.TRUST_SCORE, 0.80, 0.40,
            "Trust score: {value}",
            "Complete AI risk mapping exercise.",
        ),
        _ctrl(
            "NIST-MEA-01", "Injection Resistance",
            "Measure resilience against prompt injection attacks.",
            ControlCategory.TECHNICAL,
            SignalSource.INJECTION_SCORE, 0.85, 0.40,
            "Injection score: {value}",
            "Improve injection detection and filtering.",
        ),
        _ctrl(
            "NIST-MEA-02", "Output Validity",
            "Measure output accuracy and faithfulness.",
            ControlCategory.TECHNICAL,
            SignalSource.RAG_ENTAILMENT, 0.80, 0.35,
            "RAG entailment: {value}",
            "Improve retrieval and generation quality.",
        ),
        _ctrl(
            "NIST-MAN-01", "Continuous Monitoring",
            "Ongoing monitoring of AI system behaviour.",
            ControlCategory.TECHNICAL,
            SignalSource.SEMANTIC_DRIFT, 0.85, 0.40,
            "Drift score: {value}",
            "Implement continuous monitoring pipeline.",
        ),
        _ctrl(
            "NIST-MAN-02", "Circuit Breaker",
            "Automated safeguards to halt degraded AI systems.",
            ControlCategory.TECHNICAL,
            SignalSource.CIRCUIT_BREAKER,
            evidence_template="Circuit breaker: {value}",
            remediation="Configure circuit breaker thresholds.",
        ),
    ],
)


# ---------------------------------------------------------------------------
# SOC 2 + AI
# ---------------------------------------------------------------------------

_SOC2_AI = ComplianceFramework(
    framework_id="soc2_ai",
    name="SOC 2 + AI",
    version="2024",
    description="SOC 2 Trust Service Criteria extended for AI systems.",
    controls=[
        _ctrl(
            "SOC2-SEC-01", "AI Input Security",
            "Protect AI systems from malicious inputs.",
            ControlCategory.TECHNICAL,
            SignalSource.INJECTION_SCORE, 0.85, 0.40,
            "Injection score: {value}",
            "Harden input validation and sanitisation.",
        ),
        _ctrl(
            "SOC2-SEC-02", "Data Privacy",
            "Protect PII in AI processing pipelines.",
            ControlCategory.TECHNICAL,
            SignalSource.PII_DETECTED, 0.95, 0.50,
            "PII detection: {value}",
            "Enable PII scrubbing in all AI layers.",
        ),
        _ctrl(
            "SOC2-AVL-01", "AI Availability",
            "Ensure AI system availability and resilience.",
            ControlCategory.TECHNICAL,
            SignalSource.CIRCUIT_BREAKER,
            evidence_template="Circuit breaker: {value}",
            remediation="Configure failover and circuit breaker policies.",
        ),
        _ctrl(
            "SOC2-INT-01", "Output Integrity",
            "Ensure AI outputs are accurate and unmodified.",
            ControlCategory.TECHNICAL,
            SignalSource.CROSS_CHECK, 0.75, 0.30,
            "Cross-check: {value}",
            "Enable multi-model verification.",
        ),
        _ctrl(
            "SOC2-AUD-01", "Audit Logging",
            "Comprehensive audit trail for AI operations.",
            ControlCategory.ORGANISATIONAL,
            SignalSource.AUDIT_LOG,
            evidence_template="Audit log: {value}",
            remediation="Enable immutable audit logging.",
        ),
    ],
)


# ---------------------------------------------------------------------------
# HIPAA + AI
# ---------------------------------------------------------------------------

_HIPAA_AI = ComplianceFramework(
    framework_id="hipaa_ai",
    name="HIPAA + AI",
    version="2024",
    description="HIPAA Privacy and Security Rules extended for AI in healthcare.",
    controls=[
        _ctrl(
            "HIPAA-PRI-01", "PHI Protection",
            "Protect patient health information in AI outputs.",
            ControlCategory.TECHNICAL,
            SignalSource.PII_DETECTED, 0.98, 0.50,
            "PII/PHI detection: {value}",
            "Enable strict PHI redaction in all AI layers.",
        ),
        _ctrl(
            "HIPAA-SEC-01", "Access Controls",
            "Role-based access to AI systems handling PHI.",
            ControlCategory.ORGANISATIONAL,
            evidence_template="Access control: {value}",
            remediation="Implement RBAC for AI endpoints.",
        ),
        _ctrl(
            "HIPAA-SEC-02", "Audit Controls",
            "Audit trails for AI access to PHI.",
            ControlCategory.ORGANISATIONAL,
            SignalSource.AUDIT_LOG,
            evidence_template="Audit log: {value}",
            remediation="Enable HIPAA-compliant audit logging.",
        ),
        _ctrl(
            "HIPAA-SEC-03", "Integrity Controls",
            "Ensure AI does not alter or fabricate health data.",
            ControlCategory.TECHNICAL,
            SignalSource.RAG_ENTAILMENT, 0.90, 0.40,
            "RAG entailment: {value}",
            "Strengthen retrieval faithfulness for health data.",
        ),
        _ctrl(
            "HIPAA-BRE-01", "Breach Prevention",
            "Prevent AI-mediated data breaches.",
            ControlCategory.TECHNICAL,
            SignalSource.INJECTION_SCORE, 0.90, 0.40,
            "Injection score: {value}",
            "Harden AI against data exfiltration attacks.",
        ),
    ],
)


# ---------------------------------------------------------------------------
# GDPR + AI
# ---------------------------------------------------------------------------

_GDPR_AI = ComplianceFramework(
    framework_id="gdpr_ai",
    name="GDPR + AI",
    version="2024",
    description="GDPR data protection requirements for AI systems.",
    controls=[
        _ctrl(
            "GDPR-ART5-01", "Data Minimisation",
            "AI must process only necessary personal data.",
            ControlCategory.TECHNICAL,
            SignalSource.PII_DETECTED, 0.95, 0.50,
            "PII detection: {value}",
            "Review and minimise personal data in AI pipelines.",
        ),
        _ctrl(
            "GDPR-ART22-01", "Automated Decision Transparency",
            "Explain automated decisions affecting individuals.",
            ControlCategory.ORGANISATIONAL,
            SignalSource.TRUST_SCORE, 0.80, 0.40,
            "Trust score: {value}",
            "Implement explainability for automated decisions.",
        ),
        _ctrl(
            "GDPR-ART25-01", "Privacy by Design",
            "Embed data protection into AI system design.",
            ControlCategory.TECHNICAL,
            SignalSource.INJECTION_SCORE, 0.85, 0.40,
            "Injection score: {value}",
            "Apply privacy-by-design principles to AI.",
        ),
        _ctrl(
            "GDPR-ART30-01", "Processing Records",
            "Maintain records of AI data processing activities.",
            ControlCategory.DOCUMENTATION,
            SignalSource.AUDIT_LOG,
            evidence_template="Audit log: {value}",
            remediation="Maintain Article 30 processing records.",
        ),
        _ctrl(
            "GDPR-ART35-01", "Impact Assessment",
            "DPIA for high-risk AI processing.",
            ControlCategory.DOCUMENTATION,
            evidence_template="DPIA: {value}",
            remediation="Complete Data Protection Impact Assessment.",
        ),
    ],
)


# ---------------------------------------------------------------------------
# OWASP LLM Top 10
# ---------------------------------------------------------------------------

_OWASP_LLM = ComplianceFramework(
    framework_id="owasp_llm_top10",
    name="OWASP LLM Top 10",
    version="2025-v2",
    description="OWASP Top 10 for Large Language Model Applications.",
    controls=[
        _ctrl(
            "OWASP-LLM01", "Prompt Injection",
            "Detect and prevent direct and indirect prompt injection.",
            ControlCategory.TECHNICAL,
            SignalSource.INJECTION_SCORE, 0.85, 0.40,
            "Injection score: {value}",
            "Implement multi-layer injection defences.",
        ),
        _ctrl(
            "OWASP-LLM02", "Sensitive Information Disclosure",
            "Prevent leakage of sensitive data through LLM outputs.",
            ControlCategory.TECHNICAL,
            SignalSource.PII_DETECTED, 0.95, 0.50,
            "PII detection: {value}",
            "Enable output scrubbing and data loss prevention.",
        ),
        _ctrl(
            "OWASP-LLM03", "Supply Chain Vulnerabilities",
            "Manage risks from third-party models and data.",
            ControlCategory.ORGANISATIONAL,
            evidence_template="Supply chain: {value}",
            remediation="Audit third-party model and data sources.",
        ),
        _ctrl(
            "OWASP-LLM04", "Data and Model Poisoning",
            "Protect training and retrieval data integrity.",
            ControlCategory.TECHNICAL,
            SignalSource.GOLDEN_SOURCE_EMPTY, 0.90, 0.50,
            "Golden source: {value}",
            "Validate data provenance and integrity.",
        ),
        _ctrl(
            "OWASP-LLM05", "Improper Output Handling",
            "Sanitise and validate LLM outputs before use.",
            ControlCategory.TECHNICAL,
            SignalSource.TOXICITY_SCORE, 0.90, 0.50,
            "Toxicity score: {value}",
            "Add output validation and sanitisation.",
        ),
        _ctrl(
            "OWASP-LLM06", "Excessive Agency",
            "Limit LLM autonomy and enforce human oversight.",
            ControlCategory.ORGANISATIONAL,
            SignalSource.HITL_TRIGGERED,
            evidence_template="HITL triggered: {value}",
            remediation="Restrict LLM action scope and add HITL gates.",
        ),
        _ctrl(
            "OWASP-LLM07", "System Prompt Leakage",
            "Prevent extraction of system prompts.",
            ControlCategory.TECHNICAL,
            SignalSource.INJECTION_SCORE, 0.85, 0.40,
            "Injection score: {value}",
            "Protect system prompts from extraction attacks.",
        ),
        _ctrl(
            "OWASP-LLM08", "Vector and Embedding Weaknesses",
            "Secure vector stores and embedding pipelines.",
            ControlCategory.TECHNICAL,
            SignalSource.RAG_ENTAILMENT, 0.80, 0.35,
            "RAG entailment: {value}",
            "Harden vector store access and validation.",
        ),
        _ctrl(
            "OWASP-LLM09", "Misinformation",
            "Detect and prevent hallucinated or false outputs.",
            ControlCategory.TECHNICAL,
            SignalSource.CROSS_CHECK, 0.75, 0.30,
            "Cross-check: {value}",
            "Enable multi-source verification.",
        ),
        _ctrl(
            "OWASP-LLM10", "Unbounded Consumption",
            "Prevent resource exhaustion and denial of service.",
            ControlCategory.TECHNICAL,
            SignalSource.CIRCUIT_BREAKER,
            evidence_template="Circuit breaker: {value}",
            remediation="Implement rate limiting and resource caps.",
        ),
    ],
)


# ---------------------------------------------------------------------------
# Public registry
# ---------------------------------------------------------------------------

FRAMEWORKS: Dict[str, ComplianceFramework] = {
    f.framework_id: f
    for f in [
        _EU_AI_ACT,
        _ISO_42001,
        _NIST_AI_RMF,
        _SOC2_AI,
        _HIPAA_AI,
        _GDPR_AI,
        _OWASP_LLM,
    ]
}


def get_framework(framework_id: str) -> ComplianceFramework:
    """Return a framework by ID or raise KeyError."""
    try:
        return FRAMEWORKS[framework_id]
    except KeyError:
        available = ", ".join(sorted(FRAMEWORKS))
        raise KeyError(
            f"Unknown framework {framework_id!r}. "
            f"Available: {available}"
        ) from None


# === Framework evaluator bridge (added) ===
def get_framework_evaluator(framework_id: str):
    from sentinel.compliance.frameworks import FRAMEWORK_REGISTRY
    if framework_id not in FRAMEWORK_REGISTRY:
        raise KeyError(f"No evaluator for framework: {framework_id!r}")
    return FRAMEWORK_REGISTRY[framework_id]


def list_framework_ids() -> list:
    from sentinel.compliance.frameworks import FRAMEWORK_REGISTRY
    return list(FRAMEWORK_REGISTRY.keys())


def register_all(registry=None):
    from sentinel.compliance.frameworks import ALL_FRAMEWORKS
    if registry is None:
        registry = ComplianceRegistry()
    for fw_class in ALL_FRAMEWORKS:
        try:
            instance = fw_class()
            registry.register(instance)
        except Exception:
            pass
    return registry

def get_registry():
    global _default_registry
    return register_all()

_default_registry=None