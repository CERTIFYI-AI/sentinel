export interface Risk {
  id: string;
  title: string;
  description: string;
  category: "Model Risk" | "Security" | "Regulatory" | "Operational" | "Ethical" | "Data Privacy";
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  inherentScore: number;
  residualScore: number;
  status: "open" | "mitigating" | "accepted" | "closed";
  owner: string;
  mitigation: string;
  controls: string[];
  reviewDate: string;
  created: string;
  trend: "increasing" | "stable" | "decreasing";
  riskType: "AI-Specific" | "Traditional IT" | "Hybrid";
}

export const riskSeedData: Risk[] = [
  { id: "RSK-001", title: "LLM Hallucination in Customer-Facing Outputs", description: "Foundation models generating factually incorrect information presented to end users without adequate guardrails.", category: "Model Risk", likelihood: 4, impact: 5, inherentScore: 20, residualScore: 12, status: "open", owner: "Dr. Sarah Chen", mitigation: "RAG with source citation, confidence thresholds, HITL review for high-stakes outputs.", controls: ["CTL-042", "CTL-043", "CTL-044"], reviewDate: "2025-02-15", created: "2024-11-01", trend: "increasing", riskType: "AI-Specific" },
  { id: "RSK-002", title: "Training Data Poisoning via Supply Chain", description: "Adversarial manipulation of training datasets through compromised third-party data providers.", category: "Security", likelihood: 3, impact: 5, inherentScore: 15, residualScore: 9, status: "mitigating", owner: "Alex Kumar", mitigation: "Data provenance tracking, integrity checksums, anomaly detection on training pipelines.", controls: ["CTL-015", "CTL-016"], reviewDate: "2025-01-30", created: "2024-10-15", trend: "stable", riskType: "AI-Specific" },
  { id: "RSK-003", title: "EU AI Act Non-Compliance for High-Risk Systems", description: "Failure to meet mandatory requirements under EU AI Act Article 9-15 for high-risk classified systems.", category: "Regulatory", likelihood: 3, impact: 4, inherentScore: 12, residualScore: 8, status: "mitigating", owner: "Lisa Park", mitigation: "Compliance roadmap execution, FRIA documentation, conformity assessment preparation.", controls: ["CTL-061", "CTL-062", "CTL-063"], reviewDate: "2025-03-01", created: "2024-09-01", trend: "decreasing", riskType: "AI-Specific" },
  { id: "RSK-004", title: "Algorithmic Bias in Credit Scoring Model", description: "Protected class disparate impact in ML-based credit decisioning exceeding ECOA/fair lending thresholds.", category: "Ethical", likelihood: 3, impact: 5, inherentScore: 15, residualScore: 10, status: "open", owner: "Dr. James Wright", mitigation: "Bias audits via AIF360, demographic parity monitoring, model cards with fairness metrics.", controls: ["CTL-071", "CTL-072"], reviewDate: "2025-02-28", created: "2024-08-15", trend: "stable", riskType: "AI-Specific" },
  { id: "RSK-005", title: "PII Leakage Through Model Memorization", description: "Foundation models memorizing and regurgitating PII from training data during inference.", category: "Data Privacy", likelihood: 4, impact: 4, inherentScore: 16, residualScore: 8, status: "mitigating", owner: "Maria Santos", mitigation: "Differential privacy, PII scrubbing pipelines, output filtering, membership inference testing.", controls: ["CTL-031", "CTL-032", "CTL-033"], reviewDate: "2025-01-15", created: "2024-10-01", trend: "decreasing", riskType: "AI-Specific" },
  { id: "RSK-006", title: "Adversarial Attack on Fraud Detection", description: "Adversarial examples crafted to evade ML-based fraud detection, causing false negatives.", category: "Security", likelihood: 3, impact: 4, inherentScore: 12, residualScore: 9, status: "accepted", owner: "Alex Kumar", mitigation: "Adversarial training, input perturbation detection, ensemble model voting.", controls: ["CTL-017", "CTL-018"], reviewDate: "2025-03-15", created: "2024-11-15", trend: "increasing", riskType: "AI-Specific" },
  { id: "RSK-007", title: "Model Drift in Production Recommendation Engine", description: "Statistical drift in feature distributions causing degraded model performance undetected by monitoring.", category: "Model Risk", likelihood: 4, impact: 3, inherentScore: 12, residualScore: 6, status: "mitigating", owner: "Dr. Sarah Chen", mitigation: "Continuous monitoring, automated retraining triggers, PSI/CSI thresholds.", controls: ["CTL-045", "CTL-046"], reviewDate: "2025-02-01", created: "2024-09-15", trend: "stable", riskType: "AI-Specific" },
  { id: "RSK-008", title: "Shadow AI Usage by Business Units", description: "Unauthorized deployment of AI tools by employees without security review or data classification.", category: "Operational", likelihood: 5, impact: 3, inherentScore: 15, residualScore: 10, status: "open", owner: "Lisa Park", mitigation: "AI usage policy enforcement, CASB integration, approved AI tool catalog.", controls: ["CTL-081", "CTL-082"], reviewDate: "2025-01-20", created: "2024-07-01", trend: "increasing", riskType: "Hybrid" },
  { id: "RSK-009", title: "Third-Party AI Vendor Lock-in", description: "Critical dependency on single AI vendor without viable migration path or contractual protections.", category: "Operational", likelihood: 3, impact: 3, inherentScore: 9, residualScore: 6, status: "accepted", owner: "Maria Santos", mitigation: "Multi-vendor strategy, model abstraction layer, contractual exit clauses.", controls: ["CTL-083"], reviewDate: "2025-04-01", created: "2024-08-01", trend: "stable", riskType: "Traditional IT" },
  { id: "RSK-010", title: "Deepfake-Enabled Social Engineering", description: "AI-generated voice/video deepfakes used to impersonate executives for wire fraud.", category: "Security", likelihood: 2, impact: 5, inherentScore: 10, residualScore: 8, status: "open", owner: "Alex Kumar", mitigation: "Multi-factor verification for wire transfers, deepfake detection tools.", controls: ["CTL-019", "CTL-020"], reviewDate: "2025-02-15", created: "2024-12-01", trend: "increasing", riskType: "AI-Specific" },
  { id: "RSK-011", title: "Consent Management Gaps for AI Processing", description: "Insufficient granular consent mechanisms for AI-specific data processing under GDPR Article 22.", category: "Data Privacy", likelihood: 3, impact: 3, inherentScore: 9, residualScore: 6, status: "mitigating", owner: "Lisa Park", mitigation: "Consent management platform, AI-specific privacy notices, DPIA completion.", controls: ["CTL-034", "CTL-035"], reviewDate: "2025-03-01", created: "2024-10-15", trend: "decreasing", riskType: "AI-Specific" },
  { id: "RSK-012", title: "Explainability Deficit in Automated Decisions", description: "Inability to provide meaningful explanations for AI-driven decisions affecting individuals.", category: "Ethical", likelihood: 4, impact: 4, inherentScore: 16, residualScore: 12, status: "open", owner: "Dr. James Wright", mitigation: "SHAP/LIME integration, decision audit trails, plain-language explanation templates.", controls: ["CTL-073", "CTL-074"], reviewDate: "2025-02-28", created: "2024-09-01", trend: "stable", riskType: "AI-Specific" },
];

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
