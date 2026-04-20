export type PolicyStatus = 'draft' | 'pending_review' | 'pending_approval' | 'approved' | 'published' | 'rejected';
export type Framework = { id: string; name: string; description: string; controlCount: number; };
export interface PolicyTemplate { id: string; name: string; framework: string; body: string; version: number; status: PolicyStatus; is_system: boolean; }
export const FRAMEWORKS: Framework[] = [
  { id: 'nist-ai-rmf', name: 'NIST AI RMF', description: 'NIST AI Risk Management Framework', controlCount: 10 },
  { id: 'owasp-llm', name: 'OWASP LLM Top 10', description: 'OWASP LLM Security', controlCount: 10 },
  { id: 'eu-ai-act', name: 'EU AI Act', description: 'European Union AI Act', controlCount: 8 },
  { id: 'iso-42001', name: 'ISO 42001', description: 'AI Management System', controlCount: 7 },
  { id: 'iso-27001', name: 'ISO 27001', description: 'Information Security', controlCount: 6 },
  { id: 'soc2', name: 'SOC 2 Type II', description: 'SOC 2 Compliance', controlCount: 5 },
  { id: 'gdpr', name: 'GDPR', description: 'General Data Protection', controlCount: 6 },
  { id: 'mitre-atlas', name: 'MITRE ATLAS', description: 'MITRE Adversarial ML', controlCount: 5 },
  { id: 'dod-ai-ethics', name: 'DoD AI Ethics', description: 'DoD AI Ethical Principles', controlCount: 5 },
  { id: 'ieee-7000', name: 'IEEE 7000', description: 'Ethical AI Systems', controlCount: 4 },
  { id: 'owasp-agentic', name: 'OWASP Agentic', description: 'OWASP Agentic Security', controlCount: 4 },
];
export const STATUS_COLORS: Record<PolicyStatus, string> = {
  draft: 'hsl(215 16%% 47%%)',
  pending_review: 'hsl(38 92%% 50%%)',
  pending_approval: 'hsl(25 95%% 53%%)',
  approved: 'hsl(142 76%% 36%%)',
  published: 'hsl(221 83%% 53%%)',
  rejected: 'hsl(0 84%% 60%%)',
};
export const VALID_TRANSITIONS: Record<PolicyStatus, PolicyStatus[]> = {
  draft: ['pending_review'],
  pending_review: ['pending_approval', 'rejected', 'draft'],
  pending_approval: ['approved', 'rejected', 'pending_review'],
  approved: ['published'],
  published: ['draft'],
  rejected: ['draft'],
};

export interface ComplianceScore { framework: string; score: number; total: number; passed: number; }
