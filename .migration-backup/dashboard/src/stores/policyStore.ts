import { create } from 'zustand';
import { PolicyStatus, TRANSITIONS } from '@/lib/policyWorkflow';

export interface AuditEntry {
  id: string; policyId: string; timestamp: string; user: string; action: string;
  fromStatus?: string; toStatus?: string; comment?: string;
}

export interface ReviewComment {
  id: string; author: string; role: string; text: string; timestamp: string; resolved: boolean;
}

interface PolicyState {
  statusOverrides: Record<string, PolicyStatus>;
  auditTrail: Record<string, AuditEntry[]>;
  reviewComments: Record<string, ReviewComment[]>;
  transitionPolicy: (policyId: string, action: string, user: string, comment?: string) => { success: boolean; error?: string };
  addAuditEntry: (policyId: string, entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
  addReviewComment: (policyId: string, comment: Omit<ReviewComment, 'id' | 'timestamp'>) => void;
  resolveComment: (policyId: string, commentId: string) => void;
  getEffectiveStatus: (policyId: string, seedStatus: string) => PolicyStatus;
}

export const usePolicyStore = create<PolicyState>((set, get) => ({
  statusOverrides: {},
  auditTrail: {},
  reviewComments: {},
  getEffectiveStatus: (policyId, seedStatus) => get().statusOverrides[policyId] || (seedStatus as PolicyStatus),
  transitionPolicy: (policyId, action, user, comment) => {
    const currentStatus = get().statusOverrides[policyId] || 'Draft';
    const transition = TRANSITIONS.find(t => t.from === currentStatus && t.action === action);
    if (!transition) return { success: false, error: `Cannot ${action} from ${currentStatus}` };
    if (transition.requiresComment && (!comment || !comment.trim())) return { success: false, error: 'A comment is required.' };
    set(state => ({ statusOverrides: { ...state.statusOverrides, [policyId]: transition.to } }));
    get().addAuditEntry(policyId, { policyId, user, action: `${transition.buttonLabel}: ${currentStatus} → ${transition.to}`, fromStatus: currentStatus, toStatus: transition.to, comment });
    return { success: true };
  },
  addAuditEntry: (policyId, entry) => set(state => ({
    auditTrail: { ...state.auditTrail, [policyId]: [{ ...entry, id: `AUD-${Date.now()}`, timestamp: new Date().toISOString() }, ...(state.auditTrail[policyId] || [])] }
  })),
  addReviewComment: (policyId, comment) => set(state => ({
    reviewComments: { ...state.reviewComments, [policyId]: [...(state.reviewComments[policyId] || []), { ...comment, id: `CMT-${Date.now()}`, timestamp: new Date().toISOString() }] }
  })),
  resolveComment: (policyId, commentId) => set(state => ({
    reviewComments: { ...state.reviewComments, [policyId]: (state.reviewComments[policyId] || []).map(c => c.id === commentId ? { ...c, resolved: true } : c) }
  })),
}));
