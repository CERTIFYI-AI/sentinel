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
  { id: "GAP-SOC-001", title: "Risk assessment not updated for LLM deployment pipeline", framework: "SOC 2", controlRef: "CC3.1", severity: "High", dueDate: "2026-04-20", owner: "Sarah Chen", progress: 45, status: "In Progress" },
  { id: "GAP-SOC-002", title: "Change detection for model weights lacks automated alerting", framework: "SOC 2", controlRef: "CC7.1", severity: "Critical", dueDate: "2026-04-10", owner: "David Kim", progress: 20, status: "In Progress" },
  { id: "GAP-SOC-003", title: "Incident response runbook missing LLM-specific scenarios", framework: "SOC 2", controlRef: "CC7.4", severity: "High", dueDate: "2026-04-25", owner: "Michael Torres", progress: 60, status: "In Progress" },
  { id: "GAP-SOC-004", title: "Vendor AI model sub-processor agreements incomplete", framework: "SOC 2", controlRef: "CC9.2", severity: "Medium", dueDate: "2026-05-15", owner: "Lisa Wong", progress: 10, status: "Open" },
  { id: "GAP-NIST-001", title: "Quantitative risk measurement tooling not deployed for production models", framework: "NIST AI RMF", controlRef: "MEASURE-1.1", severity: "High", dueDate: "2026-04-30", owner: "Maria Santos", progress: 35, status: "In Progress" },
  { id: "GAP-NIST-002", title: "Trustworthy AI evaluation criteria missing explainability metrics", framework: "NIST AI RMF", controlRef: "MEASURE-2.6", severity: "Medium", dueDate: "2026-05-15", owner: "Dr. Anika Patel", progress: 55, status: "In Progress" },
  { id: "GAP-NIST-003", title: "Risk treatment monitoring dashboards not operational", framework: "NIST AI RMF", controlRef: "MANAGE-4.2", severity: "High", dueDate: "2026-04-18", owner: "David Kim", progress: 70, status: "In Progress" },
  { id: "GAP-NIST-004", title: "AI workforce competency matrix not established", framework: "NIST AI RMF", controlRef: "GOVERN-6.1", severity: "Medium", dueDate: "2026-06-30", owner: "Sarah Chen", progress: 0, status: "Open" },
  { id: "GAP-OW-001", title: "LLM output sanitization not applied to all response endpoints", framework: "OWASP LLM", controlRef: "LLM02", severity: "High", dueDate: "2026-04-08", owner: "Priya Sharma", progress: 80, status: "In Progress" },
  { id: "GAP-OW-002", title: "No rate limiting on model inference endpoints DoS vector open", framework: "OWASP LLM", controlRef: "LLM04", severity: "Critical", dueDate: "2026-04-05", owner: "James Liu", progress: 90, status: "In Progress" },
  { id: "GAP-OW-003", title: "Third-party model supply chain audit incomplete 3 vendors", framework: "OWASP LLM", controlRef: "LLM05", severity: "High", dueDate: "2026-05-01", owner: "Michael Torres", progress: 25, status: "In Progress" },
  { id: "GAP-ISO-001", title: "AI model asset inventory missing 12 shadow deployments", framework: "ISO 27001", controlRef: "A.8.1", severity: "High", dueDate: "2026-04-30", owner: "James Liu", progress: 40, status: "In Progress" },
  { id: "GAP-ISO-002", title: "ML inference logs not forwarded to centralized SIEM", framework: "ISO 27001", controlRef: "A.12.4", severity: "Critical", dueDate: "2026-04-15", owner: "Priya Sharma", progress: 65, status: "In Progress" },
  { id: "GAP-EU-001", title: "Article 9 risk management system not formalized for HiringFilter Pro", framework: "EU AI Act", controlRef: "ART-9", severity: "Critical", dueDate: "2026-04-05", owner: "Dr. Anika Patel", progress: 30, status: "In Progress" },
  { id: "GAP-EU-002", title: "Human oversight mechanism Article 14 not deployed for high-risk system", framework: "EU AI Act", controlRef: "ART-14", severity: "Critical", dueDate: "2026-04-12", owner: "Lisa Wong", progress: 15, status: "In Progress" },
];

export function getGapsForFramework(framework: string): ComplianceGap[] {
  return complianceGaps.filter((g) => g.framework === framework);
}

export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
