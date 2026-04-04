export interface ComplianceGap {
  id: string;
  title: string;
  framework: string;
  controlRef: string;
  severity: "Critical" | "High" | "Medium";
  dueDate: string;
  owner: string;
  progress: number;
  status: "Open" | "In Progress" | "Remediated" | "Accepted";
}

export const complianceGaps: ComplianceGap[] = [
  { id: "GAP-SOC-001", title: "Risk assessment not updated for LLM deployment pipeline", framework: "SOC 2", controlRef: "CC3.2", severity: "Critical", dueDate: "2026-05-15", owner: "Elena Vasquez", progress: 35, status: "In Progress" },
  { id: "GAP-SOC-002", title: "Change detection for model weights lacks automated alerting per CC8.1", framework: "SOC 2", controlRef: "CC8.1", severity: "High", dueDate: "2026-06-01", owner: "James Park", progress: 60, status: "In Progress" },
  { id: "GAP-SOC-003", title: "Incident response runbook missing LLM-specific scenarios per CC7.3", framework: "SOC 2", controlRef: "CC7.3", severity: "High", dueDate: "2026-05-30", owner: "James Park", progress: 20, status: "Open" },
  { id: "GAP-SOC-004", title: "Vendor AI model sub-processor agreements incomplete per CC9.2", framework: "SOC 2", controlRef: "CC9.2", severity: "Critical", dueDate: "2026-04-30", owner: "David Kim", progress: 45, status: "In Progress" },
  { id: "GAP-SOC-005", title: "Logical access reviews not covering AI model registry per CC6.2", framework: "SOC 2", controlRef: "CC6.2", severity: "Medium", dueDate: "2026-07-01", owner: "Michael Torres", progress: 80, status: "In Progress" },
  { id: "GAP-NIST-001", title: "Quantitative AI risk measurement tooling not deployed per MEASURE 1.1", framework: "NIST AI RMF", controlRef: "MEASURE 1.1", severity: "Critical", dueDate: "2026-05-01", owner: "Dr. Sarah Chen", progress: 15, status: "Open" },
  { id: "GAP-NIST-002", title: "Trustworthy AI evaluation criteria missing explainability metrics per MEASURE 2.8", framework: "NIST AI RMF", controlRef: "MEASURE 2.8", severity: "High", dueDate: "2026-06-15", owner: "Dr. Amara Okafor", progress: 40, status: "In Progress" },
  { id: "GAP-NIST-003", title: "Risk treatment monitoring dashboards not operational per MANAGE 2.4", framework: "NIST AI RMF", controlRef: "MANAGE 2.4", severity: "High", dueDate: "2026-05-30", owner: "Dr. Raj Patel", progress: 55, status: "In Progress" },
  { id: "GAP-NIST-004", title: "AI workforce competency matrix not established per GOVERN 4.2", framework: "NIST AI RMF", controlRef: "GOVERN 4.2", severity: "Medium", dueDate: "2026-07-30", owner: "Lisa Nakamura", progress: 10, status: "Open" },
  { id: "GAP-NIST-005", title: "Third-party AI risk assessment not integrated into MAP function per MAP 5.2", framework: "NIST AI RMF", controlRef: "MAP 5.2", severity: "High", dueDate: "2026-06-01", owner: "David Kim", progress: 30, status: "In Progress" },
  { id: "GAP-OW-001", title: "LLM output sanitization not applied to all response endpoints per LLM02:2025", framework: "OWASP LLM Top 10", controlRef: "LLM02:2025", severity: "Critical", dueDate: "2026-04-30", owner: "James Park", progress: 70, status: "In Progress" },
  { id: "GAP-OW-002", title: "No rate limiting on model inference endpoints creating DoS vector per LLM04:2025", framework: "OWASP LLM Top 10", controlRef: "LLM04:2025", severity: "High", dueDate: "2026-05-15", owner: "Michael Torres", progress: 85, status: "In Progress" },
  { id: "GAP-OW-003", title: "Third-party model supply chain audit incomplete missing 3 vendors per LLM03:2025", framework: "OWASP LLM Top 10", controlRef: "LLM03:2025", severity: "Critical", dueDate: "2026-05-01", owner: "David Kim", progress: 50, status: "In Progress" },
  { id: "GAP-OW-004", title: "Sensitive data exposure via training data extraction not mitigated per LLM06:2025", framework: "OWASP LLM Top 10", controlRef: "LLM06:2025", severity: "Critical", dueDate: "2026-04-20", owner: "Dr. Priya Sharma", progress: 25, status: "Open" },
  { id: "GAP-ISO42-001", title: "AI model asset inventory missing 12 shadow deployments per A.5.4", framework: "ISO 42001", controlRef: "A.5.4", severity: "Critical", dueDate: "2026-04-15", owner: "Lisa Nakamura", progress: 40, status: "In Progress" },
  { id: "GAP-ISO42-002", title: "AI system impact assessment incomplete for 3 production models per A.6.1", framework: "ISO 42001", controlRef: "A.6.1", severity: "High", dueDate: "2026-05-30", owner: "Dr. Amara Okafor", progress: 55, status: "In Progress" },
  { id: "GAP-ISO42-003", title: "Data quality management process not formalized per A.7.2", framework: "ISO 42001", controlRef: "A.7.2", severity: "High", dueDate: "2026-06-15", owner: "Dr. Priya Sharma", progress: 30, status: "Open" },
  { id: "GAP-ISO27-001", title: "ML inference logs not forwarded to centralized SIEM per A.8.15", framework: "ISO 27001", controlRef: "A.8.15", severity: "High", dueDate: "2026-05-01", owner: "Michael Torres", progress: 65, status: "In Progress" },
  { id: "GAP-ISO27-002", title: "ICT supply chain security gaps for AI model providers per A.5.21", framework: "ISO 27001", controlRef: "A.5.21", severity: "Critical", dueDate: "2026-04-30", owner: "David Kim", progress: 35, status: "In Progress" },
  { id: "GAP-EU-001", title: "Article 9 risk management system not formalized for high-risk AI credit scoring", framework: "EU AI Act", controlRef: "Art. 9", severity: "Critical", dueDate: "2026-04-30", owner: "Elena Vasquez", progress: 20, status: "Open" },
  { id: "GAP-EU-002", title: "Human oversight mechanism Article 14 not deployed for high-risk mortgage system", framework: "EU AI Act", controlRef: "Art. 14", severity: "Critical", dueDate: "2026-05-15", owner: "Dr. Sarah Chen", progress: 45, status: "In Progress" },
  { id: "GAP-EU-003", title: "Technical documentation per Annex IV incomplete for CreditScorer v2.1", framework: "EU AI Act", controlRef: "Art. 11", severity: "High", dueDate: "2026-06-01", owner: "Elena Vasquez", progress: 30, status: "Open" },
  { id: "GAP-EU-004", title: "EU AI database registration not initiated for 4 high-risk systems per Art. 49", framework: "EU AI Act", controlRef: "Art. 49", severity: "High", dueDate: "2026-06-30", owner: "Elena Vasquez", progress: 5, status: "Open" }
];

export function getGapsForFramework(framework: string): ComplianceGap[] {
  return complianceGaps.filter((g) => g.framework === framework);
}

export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
