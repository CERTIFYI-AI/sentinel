import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f'Written: {path} ({len(content)} bytes)')

# File 1: Policy State Machine
write_file('src/lib/policyStateMachine.ts', r'''
export type PolicyLifecycleState = 'Draft' | 'Pending Review' | 'Under Review' | 'Changes Requested' | 'Approved' | 'Published' | 'Archived' | 'Expired';
export type PolicyAction = 'submit-for-review' | 'start-review' | 'request-changes' | 'approve' | 'reject' | 'publish' | 'archive' | 'expire' | 'revert-to-draft' | 'republish';
export interface PolicyTransition { from: PolicyLifecycleState; action: PolicyAction; to: PolicyLifecycleState; requiredRole: string[]; label: string; confirmMessage?: string; requiresComment: boolean; }
export const POLICY_TRANSITIONS: PolicyTransition[] = [
  { from: 'Draft', action: 'submit-for-review', to: 'Pending Review', requiredRole: ['author','admin'], label: 'Submit for Review', requiresComment: false },
  { from: 'Pending Review', action: 'start-review', to: 'Under Review', requiredRole: ['reviewer','admin'], label: 'Start Review', requiresComment: false },
  { from: 'Under Review', action: 'request-changes', to: 'Changes Requested', requiredRole: ['reviewer','approver','admin'], label: 'Request Changes', requiresComment: true },
  { from: 'Under Review', action: 'approve', to: 'Approved', requiredRole: ['approver','admin'], label: 'Approve', confirmMessage: 'Are you sure you want to approve this policy?', requiresComment: false },
  { from: 'Under Review', action: 'reject', to: 'Draft', requiredRole: ['approver','admin'], label: 'Reject', requiresComment: true },
  { from: 'Changes Requested', action: 'submit-for-review', to: 'Pending Review', requiredRole: ['author','admin'], label: 'Resubmit for Review', requiresComment: false },
  { from: 'Changes Requested', action: 'revert-to-draft', to: 'Draft', requiredRole: ['author','admin'], label: 'Revert to Draft', requiresComment: false },
  { from: 'Approved', action: 'publish', to: 'Published', requiredRole: ['author','approver','admin'], label: 'Publish', confirmMessage: 'Publishing will make this policy effective immediately.', requiresComment: false },
  { from: 'Approved', action: 'revert-to-draft', to: 'Draft', requiredRole: ['admin'], label: 'Revert to Draft', requiresComment: true },
  { from: 'Published', action: 'archive', to: 'Archived', requiredRole: ['approver','admin'], label: 'Archive', confirmMessage: 'Archiving will remove this policy from active use.', requiresComment: true },
  { from: 'Published', action: 'expire', to: 'Expired', requiredRole: ['admin'], label: 'Mark Expired', requiresComment: false },
  { from: 'Archived', action: 'revert-to-draft', to: 'Draft', requiredRole: ['admin'], label: 'Reactivate as Draft', requiresComment: true },
  { from: 'Expired', action: 'revert-to-draft', to: 'Draft', requiredRole: ['admin'], label: 'Revise New Draft', requiresComment: false },
];
export const getAvailableActions = (currentState: PolicyLifecycleState, userRole: string = 'admin'): PolicyTransition[] => {
  return POLICY_TRANSITIONS.filter(t => t.from === currentState && t.requiredRole.includes(userRole));
};
'''.strip())

print('policyStateMachine.ts written')

# File 2: Rewrite Policies.tsx with ALL fixes
policies_content = open('src/pages/Policies.tsx', 'r').read()
print(f'Current Policies.tsx: {len(policies_content)} bytes, {policies_content.count(chr(10))} lines')

