export type PolicyStatus = 'Draft' | 'In Review' | 'Approved' | 'Published' | 'Archived' | 'Expired';

export interface PolicyTransition {
  from: PolicyStatus;
  to: PolicyStatus;
  action: string;
  buttonLabel: string;
  requiresComment: boolean;
  requiredRole?: string;
}

export const TRANSITIONS: PolicyTransition[] = [
  { from: 'Draft', to: 'In Review', action: 'submit', buttonLabel: 'Submit for Review', requiresComment: false },
  { from: 'Draft', to: 'Archived', action: 'archive', buttonLabel: 'Archive', requiresComment: true },
  { from: 'In Review', to: 'Approved', action: 'approve', buttonLabel: 'Approve', requiresComment: false, requiredRole: 'approver' },
  { from: 'In Review', to: 'Draft', action: 'reject', buttonLabel: 'Request Changes', requiresComment: true, requiredRole: 'approver' },
  { from: 'In Review', to: 'Draft', action: 'withdraw', buttonLabel: 'Withdraw', requiresComment: false },
  { from: 'Approved', to: 'Published', action: 'publish', buttonLabel: 'Publish', requiresComment: false },
  { from: 'Approved', to: 'Draft', action: 'revise', buttonLabel: 'Revise', requiresComment: true },
  { from: 'Published', to: 'Draft', action: 'revise', buttonLabel: 'Create New Version', requiresComment: false },
  { from: 'Published', to: 'Archived', action: 'archive', buttonLabel: 'Archive', requiresComment: true },
  { from: 'Published', to: 'Expired', action: 'expire', buttonLabel: 'Mark Expired', requiresComment: false },
  { from: 'Archived', to: 'Draft', action: 'reactivate', buttonLabel: 'Reactivate', requiresComment: false },
  { from: 'Expired', to: 'Draft', action: 'renew', buttonLabel: 'Renew Policy', requiresComment: false },
];

export function getAvailableTransitions(currentStatus: PolicyStatus): PolicyTransition[] {
  return TRANSITIONS.filter(t => t.from === currentStatus);
}

export function getStatusColor(status: PolicyStatus): string {
  const colors: Record<PolicyStatus, string> = {
    'Draft': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    'In Review': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Approved': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Published': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Archived': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'Expired': 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return colors[status] || colors['Draft'];
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'Critical': 'bg-red-500/20 text-red-400 border-red-500/30',
    'High': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'Medium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Low': 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return colors[priority] || colors['Medium'];
}
