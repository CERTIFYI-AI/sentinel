export const LIKELIHOOD_LABELS = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"] as const;
export const IMPACT_LABELS = ["Negligible", "Minor", "Moderate", "Major", "Severe"] as const;
export const RISK_CATEGORIES = ["Model Risk", "Security", "Regulatory", "Operational", "Ethical", "Data Privacy"] as const;

export function getRiskLevel(score: number): { label: string; color: string } {
  if (score >= 15) return { label: "Critical", color: "text-red-400" };
  if (score >= 10) return { label: "High", color: "text-orange-400" };
  if (score >= 5) return { label: "Medium", color: "text-yellow-400" };
  return { label: "Low", color: "text-green-400" };
}

export function getHeatMapColor(score: number): string {
  if (score >= 15) return "bg-red-500/80";
  if (score >= 10) return "bg-orange-500/70";
  if (score >= 5) return "bg-yellow-500/60";
  return "bg-green-500/50";
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: typeof RISK_CATEGORIES[number];
  likelihood: number;
  impact: number;
  inherentScore: number;
  residualScore: number;
  status: "open" | "mitigated" | "accepted" | "closed" | "monitoring";
  owner: string;
  mitigation: string;
  controls: string[];
  reviewDate: string;
  created: string;
  trend: "increasing" | "stable" | "decreasing";
  riskType: "AI-Specific" | "Traditional IT" | "Hybrid";
}

export const riskSeedData: Risk[] = [
  {
    id: "RSK-001",
    title: "LLM Hallucination in Customer-Facing Advisory",
    description: "GPT-4 and Claude models deployed in wealth management advisory generating fabricated financial data, regulatory citations, and performance metrics. Maps to NIST AI RMF MEASURE 2.7 (AI system trustworthiness) and ISO 42001 Annex A.8.4 (output monitoring).",
    category: "Model Risk",
    likelihood: 4,
    impact: 5,
    inherentScore: 20,
    residualScore: 12,
    status: "open",
    owner: "Dr. Sarah Chen",
    mitigation: "RAG with source citation enforced via guardrail middleware, confidence thresholds at 0.85 per NIST AI RMF MEASURE 2.6, mandatory HITL review for outputs exceeding $50K transaction advice per ISO 42001 A.10.3.",
    controls: ["CTL-AI-001", "CTL-AI-002", "CTL-AI-003"],
    reviewDate: "2026-05-15",
    created: "2025-11-01",
    trend: "increasing",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-002",
    title: "Training Data Poisoning via Third-Party Market Data",
    description: "Adversarial manipulation of Bloomberg/Reuters feed data used for credit model retraining. Ref: OWASP LLM Top 10 LLM03:2025 (Supply Chain Vulnerabilities), ISO 27001 A.5.21 (ICT supply chain security), NIST AI RMF MAP 3.4.",
    category: "Security",
    likelihood: 3,
    impact: 5,
    inherentScore: 15,
    residualScore: 9,
    status: "monitoring",
    owner: "Michael Torres",
    mitigation: "Data provenance validation per ISO 42001 A.7.4, cryptographic hash verification of all training datasets, statistical drift detection on input distributions with automated circuit breakers.",
    controls: ["CTL-IS-003", "CTL-AI-004"],
    reviewDate: "2026-06-01",
    created: "2025-09-15",
    trend: "stable",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-003",
    title: "EU AI Act Non-Compliance for Credit Scoring System",
    description: "CreditScorer v2.1 classified as high-risk AI under EU AI Act Art. 6(2) Annex III(5)(b) without required conformity assessment per Art. 43. Maximum penalty: EUR 35M or 7% global annual turnover.",
    category: "Regulatory",
    likelihood: 4,
    impact: 5,
    inherentScore: 20,
    residualScore: 10,
    status: "open",
    owner: "Elena Vasquez",
    mitigation: "Conformity assessment per EU AI Act Art. 43, technical documentation per Art. 11 Annex IV, quality management system per Art. 17, registration in EU database per Art. 49.",
    controls: ["CTL-EU-001", "CTL-EU-002", "CTL-EU-003"],
    reviewDate: "2026-04-30",
    created: "2025-08-01",
    trend: "increasing",
    riskType: "Hybrid"
  },
  {
    id: "RSK-004",
    title: "Algorithmic Bias in Mortgage Underwriting Model",
    description: "Disparate impact on protected classes (race, gender, age) in automated mortgage approval pipeline. Violates ECOA/Reg B, Fair Housing Act. Ref: NIST AI RMF MEASURE 2.11, ISO 42001 A.9.3 (bias and fairness), SOC 2 CC1.1.",
    category: "Ethical",
    likelihood: 3,
    impact: 5,
    inherentScore: 15,
    residualScore: 8,
    status: "monitoring",
    owner: "Dr. Amara Okafor",
    mitigation: "Monthly disparate impact testing across all protected classes, SHAP-based explainability dashboard, independent bias audit per SR 11-7, fairness constraints integrated into model training loop.",
    controls: ["CTL-AI-005", "CTL-AI-006", "CTL-AI-007"],
    reviewDate: "2026-05-01",
    created: "2025-06-15",
    trend: "stable",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-005",
    title: "Prompt Injection in Customer Service Chatbot",
    description: "Malicious users exploiting prompt injection vulnerabilities to extract PII, override safety guardrails, or manipulate chatbot into unauthorized actions. Ref: OWASP LLM Top 10 LLM01:2025 (Prompt Injection), ISO 27001 A.8.25.",
    category: "Security",
    likelihood: 4,
    impact: 4,
    inherentScore: 16,
    residualScore: 8,
    status: "mitigated",
    owner: "James Park",
    mitigation: "Input sanitization layer, prompt hardening with system prompt isolation, output filtering for PII patterns, real-time anomaly detection on conversation flow per NIST AI RMF MANAGE 2.2.",
    controls: ["CTL-AI-008", "CTL-IS-005"],
    reviewDate: "2026-04-15",
    created: "2025-10-01",
    trend: "decreasing",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-006",
    title: "Model Drift in Fraud Detection Pipeline",
    description: "Statistical degradation of FraudNet v3.2 performance due to evolving transaction patterns post-deployment. P2 transactions showing 23% increase in false negatives. Ref: ISO 42001 A.8.5 (AI system performance monitoring), NIST AI RMF MEASURE 3.2.",
    category: "Model Risk",
    likelihood: 4,
    impact: 4,
    inherentScore: 16,
    residualScore: 10,
    status: "open",
    owner: "Dr. Raj Patel",
    mitigation: "Automated drift detection via PSI/KL-divergence monitoring, champion-challenger framework, weekly model performance review board, automated retraining triggers when PSI > 0.25.",
    controls: ["CTL-AI-009", "CTL-AI-010"],
    reviewDate: "2026-04-20",
    created: "2025-12-01",
    trend: "increasing",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-007",
    title: "Unauthorized Shadow AI Deployment in Trading Desk",
    description: "Unregistered ChatGPT Plus accounts and custom GPTs used by quantitative analysts for trading signal generation without model governance approval. Violates ISO 42001 A.5.4 (AI system inventory) and SOC 2 CC6.1.",
    category: "Operational",
    likelihood: 5,
    impact: 4,
    inherentScore: 20,
    residualScore: 14,
    status: "open",
    owner: "Lisa Nakamura",
    mitigation: "Network-level API blocking for unauthorized LLM endpoints, CASB integration for SaaS AI detection, mandatory AI use registration per NIST AI RMF GOVERN 1.2, quarterly shadow AI sweep.",
    controls: ["CTL-IS-006", "CTL-AI-011"],
    reviewDate: "2026-04-10",
    created: "2026-01-15",
    trend: "increasing",
    riskType: "Hybrid"
  },
  {
    id: "RSK-008",
    title: "PII Leakage Through LLM Context Windows",
    description: "Customer PII (SSN, account numbers, transaction history) persisting in LLM context windows and potentially surfacing in unrelated sessions. Violates GDPR Art. 5(1)(e), CCPA Sec. 1798.100, ISO 27001 A.8.11.",
    category: "Data Privacy",
    likelihood: 3,
    impact: 5,
    inherentScore: 15,
    residualScore: 6,
    status: "mitigated",
    owner: "Dr. Priya Sharma",
    mitigation: "Session-scoped context isolation, PII redaction middleware before LLM ingestion, differential privacy noise injection, data retention policy enforcement per ISO 42001 A.7.5.",
    controls: ["CTL-DP-001", "CTL-DP-002", "CTL-AI-012"],
    reviewDate: "2026-05-30",
    created: "2025-07-01",
    trend: "decreasing",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-009",
    title: "Third-Party AI Vendor Lock-In and Service Continuity",
    description: "Over-reliance on OpenAI API for 73% of production AI workloads without viable fallback. Single vendor dependency creates business continuity risk. Ref: ISO 27001 A.5.19 (supplier relationships), NIST AI RMF GOVERN 6.1.",
    category: "Operational",
    likelihood: 3,
    impact: 4,
    inherentScore: 12,
    residualScore: 8,
    status: "monitoring",
    owner: "David Kim",
    mitigation: "Multi-vendor LLM abstraction layer, Anthropic Claude as failover provider, on-premise Llama 3.1 deployment for critical path operations, quarterly vendor risk assessment per ISO 42001 A.10.5.",
    controls: ["CTL-OP-001", "CTL-OP-002"],
    reviewDate: "2026-06-15",
    created: "2025-05-01",
    trend: "stable",
    riskType: "Hybrid"
  },
  {
    id: "RSK-010",
    title: "Deepfake-Enabled Social Engineering Against KYC",
    description: "AI-generated deepfake audio/video used to bypass voice biometric authentication and video KYC verification processes. Ref: OWASP LLM Top 10 LLM09:2025, ISO 27001 A.8.5 (secure authentication), NIST AI RMF MEASURE 2.9.",
    category: "Security",
    likelihood: 3,
    impact: 5,
    inherentScore: 15,
    residualScore: 9,
    status: "open",
    owner: "Alex Kumar",
    mitigation: "Liveness detection layer for video KYC, multi-modal authentication combining biometric with knowledge-based factors, deepfake detection model deployed at authentication gateway.",
    controls: ["CTL-IS-007", "CTL-IS-008"],
    reviewDate: "2026-05-01",
    created: "2025-11-15",
    trend: "increasing",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-011",
    title: "Inadequate AI Explainability for Regulatory Examination",
    description: "Black-box ensemble models in consumer lending unable to provide individual-level adverse action explanations required by ECOA Reg B Sec. 1002.9. Ref: NIST AI RMF MEASURE 2.8, ISO 42001 A.6.2 (transparency).",
    category: "Regulatory",
    likelihood: 4,
    impact: 4,
    inherentScore: 16,
    residualScore: 10,
    status: "open",
    owner: "Dr. Sarah Chen",
    mitigation: "SHAP/LIME explanation layer integrated into decisioning API, reason code mapping compliant with adverse action notice requirements, model documentation per SR 11-7.",
    controls: ["CTL-AI-013", "CTL-AI-014"],
    reviewDate: "2026-05-15",
    created: "2025-09-01",
    trend: "stable",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-012",
    title: "Sensitive Data in AI Training Pipelines Without Consent",
    description: "Customer transaction data used for model fine-tuning without explicit consent per GDPR Art. 6/Art. 9 and CCPA opt-out provisions. Training data lineage documentation gaps per ISO 42001 A.7.2.",
    category: "Data Privacy",
    likelihood: 3,
    impact: 4,
    inherentScore: 12,
    residualScore: 6,
    status: "mitigated",
    owner: "Dr. Priya Sharma",
    mitigation: "Consent management integration with training pipeline, automated PII scanning before ingestion, data lineage tracking per ISO 42001 A.7.4, synthetic data generation for non-consented use cases.",
    controls: ["CTL-DP-003", "CTL-DP-004"],
    reviewDate: "2026-06-01",
    created: "2025-08-15",
    trend: "decreasing",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-013",
    title: "Insecure Model Serialization and Deserialization",
    description: "Pickle-based model artifacts in MLflow registry vulnerable to arbitrary code execution during deserialization. Ref: OWASP LLM Top 10 LLM05:2025 (Insecure Output Handling), ISO 27001 A.8.28.",
    category: "Security",
    likelihood: 2,
    impact: 5,
    inherentScore: 10,
    residualScore: 4,
    status: "mitigated",
    owner: "Michael Torres",
    mitigation: "Migration to ONNX/SafeTensors format, cryptographic signing of all model artifacts, sandbox execution for model loading, supply chain verification per NIST AI RMF MAP 5.2.",
    controls: ["CTL-IS-009", "CTL-IS-010"],
    reviewDate: "2026-07-01",
    created: "2025-04-01",
    trend: "decreasing",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-014",
    title: "Excessive AI Agent Autonomy in Trade Execution",
    description: "Autonomous AI trading agents executing orders above delegated authority thresholds without human approval checkpoints. Ref: NIST AI RMF GOVERN 1.4 (human oversight), ISO 42001 A.10.3, SOC 2 CC6.3.",
    category: "Operational",
    likelihood: 2,
    impact: 5,
    inherentScore: 10,
    residualScore: 5,
    status: "mitigated",
    owner: "Lisa Nakamura",
    mitigation: "Hard limits on autonomous transaction values ($100K ceiling), mandatory HITL approval for high-value trades, real-time position monitoring with automated circuit breakers, kill switch per ISO 42001 A.10.4.",
    controls: ["CTL-OP-003", "CTL-AI-015"],
    reviewDate: "2026-04-30",
    created: "2025-10-15",
    trend: "stable",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-015",
    title: "Insufficient AI Incident Response Capability",
    description: "No documented runbook for AI-specific incidents (hallucination events, model failures, adversarial attacks). Mean time to detect AI incidents is 72+ hours. Ref: ISO 27001 A.5.24-A.5.28, NIST AI RMF MANAGE 4.1.",
    category: "Operational",
    likelihood: 3,
    impact: 3,
    inherentScore: 9,
    residualScore: 6,
    status: "open",
    owner: "James Park",
    mitigation: "Develop AI-specific incident response playbook, integrate AI monitoring into SOC, establish AI incident severity classification, conduct quarterly AI incident tabletop exercises.",
    controls: ["CTL-OP-004", "CTL-OP-005"],
    reviewDate: "2026-05-15",
    created: "2026-01-01",
    trend: "stable",
    riskType: "Hybrid"
  },
  {
    id: "RSK-016",
    title: "SOC 2 Type II Control Gap in AI Processing",
    description: "AI model training infrastructure lacks change management controls required by SOC 2 CC8.1. Model promotion to production bypasses standard SDLC gates. Audit finding from Q4 2025 external assessment.",
    category: "Regulatory",
    likelihood: 4,
    impact: 3,
    inherentScore: 12,
    residualScore: 8,
    status: "monitoring",
    owner: "Elena Vasquez",
    mitigation: "Integrate MLOps pipeline into existing SDLC governance, implement model promotion approval workflow with segregation of duties, automated evidence collection for SOC 2 CC8.1.",
    controls: ["CTL-SC-001", "CTL-SC-002"],
    reviewDate: "2026-04-20",
    created: "2025-12-15",
    trend: "decreasing",
    riskType: "Hybrid"
  },
  {
    id: "RSK-017",
    title: "Intellectual Property Contamination via LLM Training",
    description: "Proprietary trading strategies and risk models potentially memorized by third-party LLMs during API interactions. Ref: ISO 42001 A.8.3 (intellectual property), ISO 27001 A.5.32.",
    category: "Data Privacy",
    likelihood: 3,
    impact: 4,
    inherentScore: 12,
    residualScore: 8,
    status: "monitoring",
    owner: "David Kim",
    mitigation: "Enterprise API agreements with data exclusion clauses, prompt engineering to avoid proprietary data leakage, on-premise deployment for IP-sensitive workloads, DLP monitoring on API payloads.",
    controls: ["CTL-DP-005", "CTL-DP-006"],
    reviewDate: "2026-06-30",
    created: "2025-07-15",
    trend: "stable",
    riskType: "AI-Specific"
  },
  {
    id: "RSK-018",
    title: "NIST AI RMF Governance Framework Implementation Gap",
    description: "Organization lacks formal AI governance structure mapped to NIST AI RMF GOVERN functions. No designated AI risk management roles, no documented AI risk appetite statement per GOVERN 1.1 and GOVERN 1.3.",
    category: "Ethical",
    likelihood: 4,
    impact: 3,
    inherentScore: 12,
    residualScore: 9,
    status: "open",
    owner: "Elena Vasquez",
    mitigation: "Establish AI Governance Committee reporting to Board Risk Committee, define AI risk appetite framework per NIST GOVERN 1.1, appoint Chief AI Ethics Officer, create AI policy library.",
    controls: ["CTL-GV-001", "CTL-GV-002"],
    reviewDate: "2026-05-30",
    created: "2026-02-01",
    trend: "stable",
    riskType: "Hybrid"
  },
  {
    id: "RSK-019",
    title: "ISO 27001 A.5.23 Cloud AI Service Security Gap",
    description: "AI inference endpoints deployed on GCP Vertex AI and AWS SageMaker without cloud-specific security controls per ISO 27001 A.5.23. Missing encryption at rest for model weights, inadequate network segmentation.",
    category: "Security",
    likelihood: 3,
    impact: 3,
    inherentScore: 9,
    residualScore: 4,
    status: "mitigated",
    owner: "Michael Torres",
    mitigation: "CMEK encryption for all model artifacts, VPC-SC perimeter around AI endpoints, IAM least-privilege for model invocation, cloud security posture management for AI workloads.",
    controls: ["CTL-IS-011", "CTL-IS-012"],
    reviewDate: "2026-06-15",
    created: "2025-06-01",
    trend: "decreasing",
    riskType: "Traditional IT"
  },
  {
    id: "RSK-020",
    title: "Inadequate AI System Documentation for Audit Trail",
    description: "Model cards, data sheets, and impact assessments missing for 40% of production AI systems. Violates EU AI Act Art. 11 (Technical Documentation), ISO 42001 A.5.3, and SOC 2 CC2.1 information requirements.",
    category: "Regulatory",
    likelihood: 4,
    impact: 3,
    inherentScore: 12,
    residualScore: 8,
    status: "open",
    owner: "Dr. Amara Okafor",
    mitigation: "Automated model card generation pipeline, mandatory documentation gate in CI/CD, quarterly documentation completeness audit, centralized AI system registry per ISO 42001 A.5.4.",
    controls: ["CTL-GV-003", "CTL-AI-016"],
    reviewDate: "2026-05-01",
    created: "2026-03-01",
    trend: "increasing",
    riskType: "Hybrid"
  }
];
