# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
"""Default atomic control library — 11 AI-governance frameworks, 92 controls.

Generated from dashboard/src/data/complianceLibrary.ts (single source of truth).
Consumed by tenant onboarding to seed the `controls` table. Regenerate via the
same parser if the TS library changes."""

from __future__ import annotations

DEFAULT_CONTROLS: list[dict] = [
    {"framework": "EU_AI_ACT", "code": "EU-001", "name": "High-Risk Classification", "clause": "Article 6, Annex III", "severity": "HIGH", "eval_type": "AUTO", "description": "AI system classified per Annex III high-risk categories before deployment"},
    {"framework": "EU_AI_ACT", "code": "EU-002", "name": "Conformity Assessment", "clause": "Article 43", "severity": "CRITICAL", "eval_type": "MANUAL", "description": "Conformity assessment completed before market placement for high-risk systems"},
    {"framework": "EU_AI_ACT", "code": "EU-003", "name": "Human Oversight Mechanism", "clause": "Article 14", "severity": "HIGH", "eval_type": "AUTO", "description": "Human oversight mechanism implemented for high-risk AI systems"},
    {"framework": "EU_AI_ACT", "code": "EU-004", "name": "Technical Documentation", "clause": "Article 11, Annex IV", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "Technical documentation maintained per Annex IV requirements"},
    {"framework": "EU_AI_ACT", "code": "EU-005", "name": "Transparency Disclosure", "clause": "Article 13, Article 50", "severity": "MEDIUM", "eval_type": "AUTO", "description": "AI interaction disclosed to natural persons"},
    {"framework": "EU_AI_ACT", "code": "EU-006", "name": "Post-Market Monitoring", "clause": "Article 72", "severity": "HIGH", "eval_type": "AUTO", "description": "Post-market monitoring system tracks performance after deployment"},
    {"framework": "EU_AI_ACT", "code": "EU-007", "name": "Fundamental Rights Impact Assessment", "clause": "Article 27", "severity": "HIGH", "eval_type": "MANUAL", "description": "FRIA conducted for high-risk systems used by public bodies"},
    {"framework": "EU_AI_ACT", "code": "EU-008", "name": "Accuracy and Robustness", "clause": "Article 15", "severity": "HIGH", "eval_type": "AUTO", "description": "System meets accuracy, robustness, and cybersecurity thresholds"},
    {"framework": "EU_AI_ACT", "code": "EU-009", "name": "Data Governance", "clause": "Article 10", "severity": "CRITICAL", "eval_type": "AUTO", "description": "Training/validation/testing data meets quality, bias, relevance criteria"},
    {"framework": "EU_AI_ACT", "code": "EU-010", "name": "Risk Management System", "clause": "Article 9", "severity": "CRITICAL", "eval_type": "MANUAL", "description": "Continuous risk management system implemented across AI lifecycle"},
    {"framework": "EU_AI_ACT", "code": "EU-011", "name": "Record-Keeping / Logging", "clause": "Article 12", "severity": "MEDIUM", "eval_type": "AUTO", "description": "Automatic logging of events throughout system lifetime"},
    {"framework": "EU_AI_ACT", "code": "EU-012", "name": "GPAI Systemic Risk Assessment", "clause": "Article 55", "severity": "CRITICAL", "eval_type": "MANUAL", "description": "Systemic risk assessment for general-purpose AI models above compute threshold"},
    {"framework": "GDPR", "code": "GDPR-001", "name": "Lawful Basis for AI Processing", "clause": "Article 6", "severity": "CRITICAL", "eval_type": "MANUAL", "description": "Documented lawful basis exists for all personal data processing by AI"},
    {"framework": "GDPR", "code": "GDPR-002", "name": "Data Subject Rights", "clause": "Articles 15-22", "severity": "HIGH", "eval_type": "MANUAL", "description": "Mechanisms exist for access, rectification, erasure, and portability requests"},
    {"framework": "GDPR", "code": "GDPR-003", "name": "DPIA for High-Risk AI", "clause": "Article 35", "severity": "HIGH", "eval_type": "MANUAL", "description": "Data Protection Impact Assessment completed for high-risk processing"},
    {"framework": "GDPR", "code": "GDPR-004", "name": "Data Minimisation", "clause": "Article 5(1)(c)", "severity": "MEDIUM", "eval_type": "AUTO", "description": "Training data limited to what is necessary for the stated purpose"},
    {"framework": "GDPR", "code": "GDPR-005", "name": "Automated Decision-Making Opt-Out", "clause": "Article 22", "severity": "HIGH", "eval_type": "MANUAL", "description": "Right to human intervention for solely automated significant decisions"},
    {"framework": "GDPR", "code": "GDPR-006", "name": "Retention Limits", "clause": "Article 5(1)(e)", "severity": "MEDIUM", "eval_type": "AUTO", "description": "Personal data retained only as long as necessary, enforced by policy"},
    {"framework": "GDPR", "code": "GDPR-007", "name": "Cross-Border Transfer Safeguards", "clause": "Chapter V", "severity": "HIGH", "eval_type": "MANUAL", "description": "Adequate safeguards (SCCs, adequacy decisions) for international transfers"},
    {"framework": "GDPR", "code": "GDPR-008", "name": "Privacy by Design and Default", "clause": "Article 25", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "Privacy-protective settings and architecture built in from the start"},
    {"framework": "GOOGLE_SAIF", "code": "SAIF-001", "name": "Secure-by-Default Infrastructure", "clause": "SAIF Element 1", "severity": "HIGH", "eval_type": "AUTO", "description": "AI infrastructure built on hardened, secure-by-default foundations"},
    {"framework": "GOOGLE_SAIF", "code": "SAIF-002", "name": "Extend Detection & Response to AI", "clause": "SAIF Element 2", "severity": "HIGH", "eval_type": "AUTO", "description": "Threat detection and incident response extended to cover AI-specific threats"},
    {"framework": "GOOGLE_SAIF", "code": "SAIF-003", "name": "Automated Defenses", "clause": "SAIF Element 3", "severity": "MEDIUM", "eval_type": "AUTO", "description": "Automated defensive controls keep pace with AI-driven attack speed"},
    {"framework": "GOOGLE_SAIF", "code": "SAIF-004", "name": "Harmonised Platform Controls", "clause": "SAIF Element 4", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "Consistent security controls applied across all AI platforms used"},
    {"framework": "GOOGLE_SAIF", "code": "SAIF-005", "name": "Adaptive Controls / Red-Teaming", "clause": "SAIF Element 5", "severity": "HIGH", "eval_type": "MANUAL", "description": "Continuous adaptation via adversarial testing and red-team feedback"},
    {"framework": "GOOGLE_SAIF", "code": "SAIF-006", "name": "Contextualised AI Risk in Business Process", "clause": "SAIF Element 6", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "AI risk evaluation embedded in broader enterprise risk management"},
    {"framework": "ISO_42001", "code": "ISO42-001", "name": "AIMS Scope Definition", "clause": "Clause 4.3", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "AI Management System scope formally defined and documented"},
    {"framework": "ISO_42001", "code": "ISO42-002", "name": "AI Risk Assessment Process", "clause": "Clause 6.1, Annex C", "severity": "HIGH", "eval_type": "AUTO", "description": "Systematic AI risk assessment conducted at defined intervals"},
    {"framework": "ISO_42001", "code": "ISO42-003", "name": "AI Policy", "clause": "Clause 5.2", "severity": "HIGH", "eval_type": "MANUAL", "description": "Top management has established and communicated an AI policy"},
    {"framework": "ISO_42001", "code": "ISO42-004", "name": "Resource and Competence Management", "clause": "Clause 7.2", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "Personnel have demonstrated competence for AI system roles"},
    {"framework": "ISO_42001", "code": "ISO42-005", "name": "Data Management (A.8.2)", "clause": "Annex A.8.2", "severity": "CRITICAL", "eval_type": "AUTO", "description": "Data quality, provenance, and lifecycle managed per AIMS controls"},
    {"framework": "ISO_42001", "code": "ISO42-006", "name": "Supplier / Third-Party AI Governance", "clause": "Annex A.10", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "AI suppliers and vendors assessed and monitored for AIMS compliance"},
    {"framework": "ISO_42001", "code": "ISO42-007", "name": "Incident Management", "clause": "Clause 10.1, Annex A.9", "severity": "HIGH", "eval_type": "AUTO", "description": "AI incidents managed through documented procedure with root-cause analysis"},
    {"framework": "ISO_42001", "code": "ISO42-008", "name": "Operational Performance Monitoring", "clause": "Clause 8.2, Annex A.6", "severity": "HIGH", "eval_type": "AUTO", "description": "AI system performance continuously monitored against defined criteria"},
    {"framework": "ISO_42001", "code": "ISO42-009", "name": "Internal Audit Programme", "clause": "Clause 9.2", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "Internal audits of the AIMS conducted at planned intervals"},
    {"framework": "ISO_42001", "code": "ISO42-010", "name": "Continual Improvement", "clause": "Clause 10.2", "severity": "LOW", "eval_type": "MANUAL", "description": "Nonconformities trigger corrective action and system improvement"},
    {"framework": "MITRE_ATLAS", "code": "MITRE-001", "name": "Prompt Injection Detection", "clause": "AML.T0051", "severity": "CRITICAL", "eval_type": "AUTO", "description": "Detect and block direct/indirect prompt injection attempts"},
    {"framework": "MITRE_ATLAS", "code": "MITRE-002", "name": "Model Extraction Prevention", "clause": "AML.T0024", "severity": "HIGH", "eval_type": "AUTO", "description": "Rate limiting and query monitoring prevent model extraction via API"},
    {"framework": "MITRE_ATLAS", "code": "MITRE-003", "name": "Adversarial Input Detection", "clause": "AML.T0043", "severity": "HIGH", "eval_type": "AUTO", "description": "Adversarially perturbed inputs detected before inference"},
    {"framework": "MITRE_ATLAS", "code": "MITRE-004", "name": "Training Data Poisoning Detection", "clause": "AML.T0020", "severity": "CRITICAL", "eval_type": "MANUAL", "description": "Training pipeline monitored for data poisoning indicators"},
    {"framework": "MITRE_ATLAS", "code": "MITRE-005", "name": "Red Team Exercises", "clause": "AML Mitigation M0017", "severity": "HIGH", "eval_type": "MANUAL", "description": "Scheduled adversarial red-team testing against deployed models"},
    {"framework": "MITRE_ATLAS", "code": "MITRE-006", "name": "Model Supply Chain Integrity", "clause": "AML.T0010", "severity": "HIGH", "eval_type": "AUTO", "description": "Model artifacts signed and hash-verified through supply chain"},
    {"framework": "MITRE_ATLAS", "code": "MITRE-007", "name": "LLM Jailbreak Resistance", "clause": "AML.T0054", "severity": "CRITICAL", "eval_type": "AUTO", "description": "System resists known jailbreak techniques bypassing safety training"},
    {"framework": "MITRE_ATLAS", "code": "MITRE-008", "name": "Inference API Exfiltration Monitoring", "clause": "AML.T0025", "severity": "MEDIUM", "eval_type": "AUTO", "description": "Unusual query patterns indicative of data exfiltration are flagged"},
    {"framework": "MITRE_ATLAS", "code": "MITRE-009", "name": "Backdoor / Trojaned Model Detection", "clause": "AML.T0018", "severity": "CRITICAL", "eval_type": "MANUAL", "description": "Models scanned for embedded backdoor triggers before deployment"},
    {"framework": "MITRE_ATLAS", "code": "MITRE-010", "name": "ML Supply Chain Compromise", "clause": "AML.T0010", "severity": "HIGH", "eval_type": "MANUAL", "description": "Third-party model and dataset sources vetted for compromise"},
    {"framework": "NIST_AI_RMF", "code": "NIST-001", "name": "AI Governance Structure", "clause": "GOVERN 1.1", "severity": "CRITICAL", "eval_type": "MANUAL", "description": "AI governance policies and accountability structures established"},
    {"framework": "NIST_AI_RMF", "code": "NIST-002", "name": "Risk Tolerance Definition", "clause": "GOVERN 1.3", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "Organisational AI risk tolerance documented and approved"},
    {"framework": "NIST_AI_RMF", "code": "NIST-003", "name": "Context and Risk Mapping", "clause": "MAP 1.1", "severity": "HIGH", "eval_type": "AUTO", "description": "AI system context, use case, and impacted parties mapped"},
    {"framework": "NIST_AI_RMF", "code": "NIST-004", "name": "Categorisation of AI System", "clause": "MAP 1.5", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "System categorised by risk per organisational risk taxonomy"},
    {"framework": "NIST_AI_RMF", "code": "NIST-005", "name": "Fairness Measurement", "clause": "MEASURE 2.5", "severity": "HIGH", "eval_type": "AUTO", "description": "Fairness and bias metrics measured against established thresholds"},
    {"framework": "NIST_AI_RMF", "code": "NIST-006", "name": "Trustworthiness Measurement", "clause": "MEASURE 2.1-2.13", "severity": "HIGH", "eval_type": "AUTO", "description": "Trust score / trustworthiness characteristics measured continuously"},
    {"framework": "NIST_AI_RMF", "code": "NIST-007", "name": "Failure Monitoring", "clause": "MANAGE 2.3", "severity": "HIGH", "eval_type": "AUTO", "description": "System monitored for failures, drift, and performance degradation"},
    {"framework": "NIST_AI_RMF", "code": "NIST-008", "name": "Third-Party Risk Management", "clause": "MANAGE 3.1-3.2", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "Third-party AI components assessed and managed as supply chain risk"},
    {"framework": "OECD_AI", "code": "OECD-001", "name": "Inclusive Growth and Well-being", "clause": "Principle 1.1", "severity": "LOW", "eval_type": "MANUAL", "description": "AI deployment assessed for positive societal and environmental impact"},
    {"framework": "OECD_AI", "code": "OECD-002", "name": "Human Rights and Democratic Values", "clause": "Principle 1.2", "severity": "HIGH", "eval_type": "MANUAL", "description": "AI systems respect human rights, fairness, and human oversight"},
    {"framework": "OECD_AI", "code": "OECD-003", "name": "Transparency and Explainability", "clause": "Principle 1.3", "severity": "MEDIUM", "eval_type": "AUTO", "description": "Sufficient transparency for stakeholders to understand AI outcomes"},
    {"framework": "OECD_AI", "code": "OECD-004", "name": "Robustness, Security, and Safety", "clause": "Principle 1.4", "severity": "HIGH", "eval_type": "AUTO", "description": "AI systems function robustly and securely throughout lifecycle"},
    {"framework": "OECD_AI", "code": "OECD-005", "name": "Accountability", "clause": "Principle 1.5", "severity": "HIGH", "eval_type": "MANUAL", "description": "Clear accountability mechanisms for AI system outcomes"},
    {"framework": "OECD_AI", "code": "OECD-006", "name": "National Policy and Cooperation", "clause": "Principle 2", "severity": "LOW", "eval_type": "MANUAL", "description": "Organisation tracks and aligns with evolving national AI policy"},
    {"framework": "OWASP_LLM", "code": "OWASP-LLM01", "name": "Prompt Injection", "clause": "LLM01:2025", "severity": "CRITICAL", "eval_type": "AUTO", "description": "Direct and indirect prompt injection mitigations in place"},
    {"framework": "OWASP_LLM", "code": "OWASP-LLM02", "name": "Sensitive Information Disclosure", "clause": "LLM02:2025", "severity": "HIGH", "eval_type": "AUTO", "description": "PII and sensitive data filtered from model outputs"},
    {"framework": "OWASP_LLM", "code": "OWASP-LLM03", "name": "Supply Chain Vulnerabilities", "clause": "LLM03:2025", "severity": "HIGH", "eval_type": "MANUAL", "description": "Model, plugin, and dataset supply chain vetted for vulnerabilities"},
    {"framework": "OWASP_LLM", "code": "OWASP-LLM04", "name": "Data and Model Poisoning", "clause": "LLM04:2025", "severity": "CRITICAL", "eval_type": "MANUAL", "description": "Training/fine-tuning data validated against poisoning"},
    {"framework": "OWASP_LLM", "code": "OWASP-LLM05", "name": "Improper Output Handling", "clause": "LLM05:2025", "severity": "HIGH", "eval_type": "AUTO", "description": "LLM outputs validated/sanitised before downstream use (e.g. code exec)"},
    {"framework": "OWASP_LLM", "code": "OWASP-LLM06", "name": "Excessive Agency", "clause": "LLM06:2025", "severity": "HIGH", "eval_type": "MANUAL", "description": "Agent tool permissions and autonomy scoped to least privilege"},
    {"framework": "OWASP_LLM", "code": "OWASP-LLM07", "name": "System Prompt Leakage", "clause": "LLM07:2025", "severity": "MEDIUM", "eval_type": "AUTO", "description": "System prompts do not contain secrets and resist extraction"},
    {"framework": "OWASP_LLM", "code": "OWASP-LLM08", "name": "Vector and Embedding Weaknesses", "clause": "LLM08:2025", "severity": "MEDIUM", "eval_type": "AUTO", "description": "RAG vector store access controls and embedding inversion mitigations"},
    {"framework": "OWASP_LLM", "code": "OWASP-LLM09", "name": "Misinformation", "clause": "LLM09:2025", "severity": "MEDIUM", "eval_type": "AUTO", "description": "Hallucination rate monitored; grounding/citation required for factual claims"},
    {"framework": "OWASP_LLM", "code": "OWASP-LLM10", "name": "Unbounded Consumption", "clause": "LLM10:2025", "severity": "MEDIUM", "eval_type": "AUTO", "description": "Rate limits and resource quotas prevent denial-of-wallet/service"},
    {"framework": "SG_MODEL_AI", "code": "SG-001", "name": "Internal Governance Structures", "clause": "Pillar 1", "severity": "HIGH", "eval_type": "MANUAL", "description": "Internal governance, accountability, and risk management structures in place"},
    {"framework": "SG_MODEL_AI", "code": "SG-002", "name": "Risk Management Approach", "clause": "Pillar 2", "severity": "HIGH", "eval_type": "AUTO", "description": "Risk-proportionate measures applied across AI development lifecycle"},
    {"framework": "SG_MODEL_AI", "code": "SG-003", "name": "Development and Deployment Lifecycle Controls", "clause": "Pillar 3", "severity": "MEDIUM", "eval_type": "AUTO", "description": "Controls applied at each stage: data, model dev, deployment, monitoring"},
    {"framework": "SG_MODEL_AI", "code": "SG-004", "name": "Stakeholder Communication and Interaction", "clause": "Pillar 4", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "Clear disclosure to users when interacting with AI / AI-generated content"},
    {"framework": "SG_MODEL_AI", "code": "SG-005", "name": "Monitoring and Reporting", "clause": "Pillar 5", "severity": "HIGH", "eval_type": "AUTO", "description": "Ongoing monitoring with defined incident reporting channels"},
    {"framework": "SG_MODEL_AI", "code": "SG-006", "name": "Testing and Assurance", "clause": "Pillar 6", "severity": "HIGH", "eval_type": "AUTO", "description": "Pre-deployment testing and third-party assurance where appropriate"},
    {"framework": "SG_MODEL_AI", "code": "SG-007", "name": "Security in AI Systems", "clause": "Pillar 7", "severity": "HIGH", "eval_type": "AUTO", "description": "AI-specific security controls (model, data, infra) implemented"},
    {"framework": "UNESCO_AI", "code": "UNESCO-001", "name": "Proportionality and Do No Harm", "clause": "Section 4 §28-29", "severity": "HIGH", "eval_type": "MANUAL", "description": "AI use proportionate to legitimate aim; harm assessment conducted"},
    {"framework": "UNESCO_AI", "code": "UNESCO-002", "name": "Safety and Security", "clause": "Section 4 §30-31", "severity": "HIGH", "eval_type": "AUTO", "description": "Unwanted harms and security vulnerabilities avoided/addressed"},
    {"framework": "UNESCO_AI", "code": "UNESCO-003", "name": "Right to Privacy and Data Protection", "clause": "Section 4 §32-37", "severity": "CRITICAL", "eval_type": "AUTO", "description": "Privacy protected throughout AI system lifecycle"},
    {"framework": "UNESCO_AI", "code": "UNESCO-004", "name": "Multi-Stakeholder Governance", "clause": "Section 4 §38-40", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "Diverse stakeholder participation in AI governance decisions"},
    {"framework": "UNESCO_AI", "code": "UNESCO-005", "name": "Responsibility and Accountability", "clause": "Section 4 §41-44", "severity": "HIGH", "eval_type": "MANUAL", "description": "Clear ethical and legal responsibility assigned across AI lifecycle"},
    {"framework": "UNESCO_AI", "code": "UNESCO-006", "name": "Transparency and Explainability", "clause": "Section 4 §45-50", "severity": "MEDIUM", "eval_type": "AUTO", "description": "Degree of transparency and explainability appropriate to context"},
    {"framework": "UNESCO_AI", "code": "UNESCO-007", "name": "Human Oversight and Determination", "clause": "Section 4 §51-52", "severity": "HIGH", "eval_type": "AUTO", "description": "Final human determination preserved for significant decisions"},
    {"framework": "UNESCO_AI", "code": "UNESCO-008", "name": "Fairness and Non-Discrimination", "clause": "Section 4 §53-57", "severity": "CRITICAL", "eval_type": "AUTO", "description": "AI actors promote social justice and non-discrimination"},
    {"framework": "INDIA_AI_GOV", "code": "IN-001", "name": "Risk-Based Tiering", "clause": "IndiaAI Governance Guidelines §3", "severity": "HIGH", "eval_type": "MANUAL", "description": "AI systems tiered by risk consistent with sectoral regulator guidance"},
    {"framework": "INDIA_AI_GOV", "code": "IN-002", "name": "DPDP Act Alignment", "clause": "Digital Personal Data Protection Act 2023", "severity": "CRITICAL", "eval_type": "MANUAL", "description": "Personal data processing aligned with DPDP Act consent and purpose limitation"},
    {"framework": "INDIA_AI_GOV", "code": "IN-003", "name": "Algorithmic Accountability", "clause": "IndiaAI Governance Guidelines §4", "severity": "HIGH", "eval_type": "MANUAL", "description": "Named accountable owner for each deployed AI system"},
    {"framework": "INDIA_AI_GOV", "code": "IN-004", "name": "Grievance Redressal Mechanism", "clause": "IndiaAI Governance Guidelines §5", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "Accessible grievance redressal channel for AI-affected individuals"},
    {"framework": "INDIA_AI_GOV", "code": "IN-005", "name": "Bias and Fairness Testing", "clause": "IndiaAI Governance Guidelines §6", "severity": "HIGH", "eval_type": "AUTO", "description": "Bias testing conducted with attention to Indian socio-demographic context"},
    {"framework": "INDIA_AI_GOV", "code": "IN-006", "name": "Data Localisation Considerations", "clause": "DPDP Act §17", "severity": "MEDIUM", "eval_type": "MANUAL", "description": "Cross-border data transfer assessed against sectoral localisation rules"},
    {"framework": "INDIA_AI_GOV", "code": "IN-007", "name": "Critical AI System Incident Reporting", "clause": "IndiaAI Governance Guidelines §7", "severity": "HIGH", "eval_type": "AUTO", "description": "Serious AI incidents reported per sectoral/CERT-In requirements"},
]

FRAMEWORK_CODES = sorted({c["framework"] for c in DEFAULT_CONTROLS})

assert len(DEFAULT_CONTROLS) == 92, "expected 92 controls"
assert len(FRAMEWORK_CODES) == 11, "expected 11 frameworks"

async def seed_default_controls(tenant_id: str, org_id: str, db) -> int:
    """Seed the 92 default atomic controls for a tenant. Idempotent (skips
    existing control_code). Uses this project's asyncpg ``db`` — NOT supabase-py.

    Columns match the real `controls` table extended by
    supabase/migrations/20260701_compliance_frameworks_and_drift.sql
    (severity / clause_reference / evaluation_type / is_default).
    """
    inserted = 0
    for c in DEFAULT_CONTROLS:
        exists = await db.fetchrow(
            "SELECT id FROM controls WHERE control_id = $1 AND org_id = $2",
            c["code"], org_id,
        )
        if exists:
            continue
        await db.execute(
            """
            INSERT INTO controls
                (id, org_id, framework, control_id, title, description,
                 clause_reference, severity, evaluation_type, status, is_default, evidence_count)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'NOT_EVALUATED', true, 0)
            """,
            org_id, c["framework"], c["code"], c["name"], c["description"],
            c["clause"], c["severity"], c["eval_type"],
        )
        inserted += 1
    return inserted
