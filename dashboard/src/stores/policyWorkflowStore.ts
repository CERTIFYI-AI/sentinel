import { create } from 'zustand';
import { getAvailableTransitions, type PolicyStatus, type WorkflowTransition } from '../lib/policyWorkflow';

export interface AuditEntry {
  id: string; policyId: string; timestamp: string; user: string; userRole: string;
  action: string; fromStatus?: PolicyStatus; toStatus?: PolicyStatus;
  comment?: string; details?: string;
}

export interface ReviewComment {
  id: string; policyId: string; author: string; role: string; text: string;
  timestamp: string; resolved: boolean; section?: string;
}

interface PolicyWorkflowState {
  statusOverrides: Record<string, PolicyStatus>;
  auditTrail: Record<string, AuditEntry[]>;
  comments: Record<string, ReviewComment[]>;
  getEffectiveStatus: (policyId: string, seedStatus: string) => PolicyStatus;
  executeTransition: (policyId: string, action: string, currentStatus: PolicyStatus, user: string, userRole: string, comment?: string) => { success: boolean; newStatus?: PolicyStatus; error?: string };
  addAuditEntry: (entry: Omit<AuditEntry, 'id'>) => void;
  addComment: (comment: Omit<ReviewComment, 'id' | 'timestamp'>) => void;
  toggleCommentResolved: (policyId: string, commentId: string) => void;
  getAuditTrail: (policyId: string) => AuditEntry[];
  getComments: (policyId: string) => ReviewComment[];
}

const SEED_AUDIT: Record<string, AuditEntry[]> = {
  'POL-001': [
    { id:'a1',policyId:'POL-001',timestamp:'2025-12-15T10:00:00Z',user:'Dr. Sarah Mitchell',userRole:'AI Ethics Officer',action:'Created policy',details:'Initial draft of AI Model Governance Policy' },
    { id:'a2',policyId:'POL-001',timestamp:'2026-01-05T14:30:00Z',user:'Dr. Sarah Mitchell',userRole:'AI Ethics Officer',action:'submitforreview',fromStatus:'Draft',toStatus:'Pending Review',comment:'Ready for initial review' },
    { id:'a3',policyId:'POL-001',timestamp:'2026-01-10T09:00:00Z',user:'Dr. Raj Patel',userRole:'Chief Risk Officer',action:'startreview',fromStatus:'Pending Review',toStatus:'In Review' },
    { id:'a4',policyId:'POL-001',timestamp:'2026-01-20T11:00:00Z',user:'Dr. Raj Patel',userRole:'Chief Risk Officer',action:'approve',fromStatus:'In Review',toStatus:'Approved',comment:'Comprehensive coverage of AI governance requirements' },
    { id:'a5',policyId:'POL-001',timestamp:'2026-02-01T08:00:00Z',user:'James Wilson',userRole:'Policy Administrator',action:'publish',fromStatus:'Approved',toStatus:'Published' },
  ],
  'POL-002': [
    { id:'a6',policyId:'POL-002',timestamp:'2025-11-01T10:00:00Z',user:'Michael Chen',userRole:'Data Protection Officer',action:'Created policy',details:'Initial draft of Data Privacy Framework' },
    { id:'a7',policyId:'POL-002',timestamp:'2025-12-01T09:00:00Z',user:'Michael Chen',userRole:'Data Protection Officer',action:'submitforreview',fromStatus:'Draft',toStatus:'Pending Review' },
  ],
  'POL-003': [
    { id:'a8',policyId:'POL-003',timestamp:'2025-10-15T10:00:00Z',user:'Lisa Park',userRole:'ML Engineering Lead',action:'Created policy',details:'Initial draft of Model Risk Assessment' },
  ],
};

const SEED_COMMENTS: Record<string, ReviewComment[]> = {
  'POL-001': [
    { id:'c1',policyId:'POL-001',author:'Dr. Raj Patel',role:'Chief Risk Officer',text:'Consider adding specific metrics for model performance thresholds in Section 3.',timestamp:'2026-01-12T10:00:00Z',resolved:true,section:'Policy Statements' },
    { id:'c2',policyId:'POL-001',author:'Emily Rodriguez',role:'Compliance Analyst',text:'The EU AI Act references need updating to reflect the latest amendments.',timestamp:'2026-01-15T14:00:00Z',resolved:false,section:'Compliance Requirements' },
  ],
};

export const usePolicyWorkflowStore = create<PolicyWorkflowState>((set, get) => ({
  statusOverrides: {},
  auditTrail: { ...SEED_AUDIT },
  comments: { ...SEED_COMMENTS },
  getEffectiveStatus: (policyId, seedStatus) => {
    const o = get().statusOverrides;
    return (o[policyId] || seedStatus) as PolicyStatus;
  },
  executeTransition: (policyId, action, currentStatus, user, userRole, comment) => {
    const ts = getAvailableTransitions(currentStatus);
    const t = ts.find((x: WorkflowTransition) => x.action === action);
    if (!t) return { success: false, error: `Invalid transition: ${action} from ${currentStatus}` };
    if (t.requiresComment && (!comment || !comment.trim())) return { success: false, error: 'A comment is required for this action.' };
    const newStatus = t.to;
    set((s) => ({ statusOverrides: { ...s.statusOverrides, [policyId]: newStatus } }));
    get().addAuditEntry({ policyId, timestamp: new Date().toISOString(), user, userRole, action, fromStatus: currentStatus, toStatus: newStatus, comment: comment || undefined });
    return { success: true, newStatus };
  },
  addAuditEntry: (entry) => {
    const id = `ae-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    set((s) => ({ auditTrail: { ...s.auditTrail, [entry.policyId]: [...(s.auditTrail[entry.policyId]||[]),{...entry,id}] } }));
  },
  addComment: (comment) => {
    const id = `rc-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const timestamp = new Date().toISOString();
    set((s) => ({ comments: { ...s.comments, [comment.policyId]: [...(s.comments[comment.policyId]||[]),{...comment,id,timestamp}] } }));
  },
  toggleCommentResolved: (policyId, commentId) => {
    set((s) => ({ comments: { ...s.comments, [policyId]: (s.comments[policyId]||[]).map((c) => c.id===commentId?{...c,resolved:!c.resolved}:c) } }));
  },
  getAuditTrail: (policyId) => (get().auditTrail[policyId]||[]).sort((a,b) => new Date(b.timestamp).getTime()-new Date(a.timestamp).getTime()),
  getComments: (policyId) => get().comments[policyId]||[],
}));
