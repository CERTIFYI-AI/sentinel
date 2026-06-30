// Shared task data + types — imported by Tasks.tsx, TaskBoard.tsx, TaskDrawer.tsx, OverdueAlertBanner.tsx

import type { Severity } from '../../data/seed';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'overdue';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Severity;
  status: TaskStatus;
  assignee: string;
  dueDate: string;
  source: string;
  sourceType: 'gap' | 'risk';
  sourceLink: string;
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string; border: string }> = {
  todo:        { label: 'Todo',        bg: 'hsl(var(--bg-muted))',  text: 'hsl(var(--text-2))', border: 'hsl(var(--border))' },
  in_progress: { label: 'In Progress', bg: 'hsl(var(--s-in-bg))',  text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
  done:        { label: 'Done',        bg: 'hsl(var(--s-ok-bg))',  text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
  overdue:     { label: 'Overdue',     bg: 'hsl(var(--s-er-bg))',  text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
};

const TASK_STATUS_FALLBACK = { label: 'Unknown', bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };
/** Safe accessor — never throws on an unrecognized status key. */
export const taskStatusConfig = (s: string) => TASK_STATUS_CONFIG[s as TaskStatus] ?? TASK_STATUS_FALLBACK;

export const TASKS: Task[] = [
  {
    id: 'TSK-001',
    title: 'Update risk assessment for LLM deployment scenarios',
    description: 'Current risk assessment methodology does not adequately cover LLM-specific risks. Update FMEA templates and approval workflows.',
    priority: 'critical',
    status: 'overdue',
    assignee: 'Raj Gupta',
    dueDate: '2026-04-30',
    source: 'GAP-001',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-002',
    title: 'Complete EU AI Act Article 11 documentation',
    description: 'Technical documentation for high-risk AI systems must meet Article 13 transparency requirements. Affected: MDL-001, MDL-004.',
    priority: 'critical',
    status: 'in_progress',
    assignee: 'Raj Gupta',
    dueDate: '2026-05-15',
    source: 'GAP-002',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-003',
    title: 'Implement SHAP explainability for automated credit decisions',
    description: 'No meaningful explanation provided for automated credit decisions — violates GDPR Art. 22. Deploy SHAP pipeline on MDL-001.',
    priority: 'high',
    status: 'overdue',
    assignee: 'James Patel',
    dueDate: '2026-04-20',
    source: 'GAP-003',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-004',
    title: 'Remediate geographic proxy bias in MDL-001',
    description: 'ZIP code features acting as proxy for protected class in Credit Risk Scorer. Remove features, apply adversarial debiasing, retrain.',
    priority: 'critical',
    status: 'in_progress',
    assignee: 'Maria Santos',
    dueDate: '2026-04-25',
    source: 'RSK-001',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-005',
    title: 'Add hallucination guardrail to Loan Approval Assistant',
    description: 'GPT-4o generating fabricated loan terms. Implement RAG pipeline and confidence threshold guardrail on MDL-004.',
    priority: 'high',
    status: 'in_progress',
    assignee: 'Raj Gupta',
    dueDate: '2026-04-28',
    source: 'RSK-002',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-006',
    title: 'Renew OpenAI DPA — EU data processing',
    description: 'Update vendor DPA agreements to include AI-specific clauses. Priority: OpenAI (expired), Pinecone (pending).',
    priority: 'critical',
    status: 'overdue',
    assignee: 'James Patel',
    dueDate: '2026-04-15',
    source: 'GAP-005',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-007',
    title: 'Develop AI-specific incident response playbooks',
    description: 'Incident response does not cover AI-specific scenarios (bias incidents, LLM hallucination). Create 4 new playbook templates.',
    priority: 'high',
    status: 'in_progress',
    assignee: 'Sarah Chen',
    dueDate: '2026-05-10',
    source: 'GAP-006',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-008',
    title: 'Formalize prompt injection testing process',
    description: 'No formal process for regular prompt injection testing. Create quarterly test schedule for LLM01 OWASP coverage on MDL-004.',
    priority: 'high',
    status: 'todo',
    assignee: 'Maria Santos',
    dueDate: '2026-04-25',
    source: 'GAP-007',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-009',
    title: 'Quarantine shadow AI agents in Marketing',
    description: 'Unregistered LangChain agent accessing customer PII. Quarantine AGT-010, revoke data access, conduct department audit.',
    priority: 'critical',
    status: 'in_progress',
    assignee: 'Sarah Chen',
    dueDate: '2026-04-10',
    source: 'RSK-006',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-010',
    title: 'Expand human oversight to all high-risk AI uses',
    description: 'Human oversight currently covers only credit decisions. Extend HITL gates to fraud detection, AML, and HR screening use cases.',
    priority: 'medium',
    status: 'in_progress',
    assignee: 'James Patel',
    dueDate: '2026-05-20',
    source: 'GAP-008',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-011',
    title: 'Implement automated shadow AI detection',
    description: 'Current shadow AI detection is manual. Deploy network scanning with automated alerting. Target: weekly scan cadence.',
    priority: 'high',
    status: 'todo',
    assignee: 'Sarah Chen',
    dueDate: '2026-04-30',
    source: 'GAP-010',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
  {
    id: 'TSK-012',
    title: 'Tune AML false positive detection thresholds',
    description: 'AML Transaction Monitor false positive rate trending upward causing analyst fatigue. Calibrate thresholds and add secondary scoring.',
    priority: 'high',
    status: 'in_progress',
    assignee: 'David Kim',
    dueDate: '2026-05-05',
    source: 'RSK-011',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-013',
    title: 'Implement GDPR Art. 22 model explainability API',
    description: 'Automated decision-making systems lack sufficient explainability. Create explanation API endpoint with SHAP support.',
    priority: 'high',
    status: 'todo',
    assignee: 'Raj Gupta',
    dueDate: '2026-05-15',
    source: 'RSK-012',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-014',
    title: 'Obtain GDPR consent for AI dataset processing',
    description: 'Consumer credit and HR datasets lack explicit AI processing consent. Obtain retroactive consent or implement anonymization.',
    priority: 'critical',
    status: 'done',
    assignee: 'James Patel',
    dueDate: '2026-03-31',
    source: 'RSK-003',
    sourceType: 'risk',
    sourceLink: '/risks',
  },
  {
    id: 'TSK-015',
    title: 'Implement model lifecycle tracking in inventory',
    description: 'Model lifecycle phases not systematically tracked. Add lifecycle state machine to model registry for all 6 models.',
    priority: 'medium',
    status: 'done',
    assignee: 'Raj Gupta',
    dueDate: '2026-04-01',
    source: 'GAP-009',
    sourceType: 'gap',
    sourceLink: '/gap-analysis',
  },
];
